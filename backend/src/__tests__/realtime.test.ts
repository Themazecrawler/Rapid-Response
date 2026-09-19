import { EventEmitter } from 'events';

const mockClients: MockClient[] = [];

class MockClient extends EventEmitter {
  connect = jest.fn().mockResolvedValue(undefined);
  query = jest.fn().mockResolvedValue({ rows: [] });
  end = jest.fn().mockResolvedValue(undefined);
  constructor() {
    super();
    mockClients.push(this);
  }
}

jest.mock('pg', () => ({ Client: MockClient }));

const poolQuery = jest.fn();
jest.mock('../db', () => ({
  connectionConfig: {},
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));

import { appCache } from '../services/cache';
import { RealtimeMessage, startAlertListener, subscribeToRealtime } from '../services/realtime';

const row = {
  id: 9,
  user_id: 1,
  type: 'fire',
  description: 'Smoke',
  latitude: null,
  longitude: null,
  building: null,
  floor: null,
  status: 'active',
  priority: 'high',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  resolved_at: null,
  reporter_name: 'Jane',
  client_alert_id: 'c',
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('alert listener', () => {
  let messages: RealtimeMessage[];
  let unsubscribe: () => void;
  let stop: (() => void) | undefined;

  beforeEach(() => {
    mockClients.length = 0;
    poolQuery.mockReset();
    messages = [];
    unsubscribe = subscribeToRealtime((message) => messages.push(message));
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    unsubscribe();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('listens on the alert channel and publishes the alert a notification refers to', async () => {
    poolQuery.mockResolvedValue({ rows: [row] });
    const invalidate = jest.spyOn(appCache, 'invalidate');
    stop = startAlertListener();
    await flush();

    expect(mockClients[0].query).toHaveBeenCalledWith('LISTEN alert_created');
    mockClients[0].emit('notification', { channel: 'alert_created', payload: '9' });
    await flush();

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ type: 'alert', alert: { id: 9, reporterName: 'Jane' } });
    expect(invalidate).toHaveBeenCalledWith('alerts:');
  });

  it('ignores other channels and malformed payloads', async () => {
    stop = startAlertListener();
    await flush();

    mockClients[0].emit('notification', { channel: 'other', payload: '9' });
    mockClients[0].emit('notification', { channel: 'alert_created', payload: 'not-a-number' });
    await flush();

    expect(poolQuery).not.toHaveBeenCalled();
    expect(messages).toHaveLength(0);
  });

  it('reconnects with backoff after an error and tells subscribers to resync', async () => {
    jest.useFakeTimers();
    stop = startAlertListener();
    await jest.advanceTimersByTimeAsync(0);
    expect(mockClients).toHaveLength(1);

    mockClients[0].emit('error', new Error('connection reset'));
    await jest.advanceTimersByTimeAsync(499);
    expect(mockClients).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(2);

    expect(mockClients).toHaveLength(2);
    expect(mockClients[1].query).toHaveBeenCalledWith('LISTEN alert_created');
    expect(messages).toContainEqual({ type: 'resync' });
  });

  it('does not resync on the very first connection', async () => {
    stop = startAlertListener();
    await flush();
    expect(messages).toHaveLength(0);
  });

  it('closes its connection and stops reconnecting once stopped', async () => {
    jest.useFakeTimers();
    stop = startAlertListener();
    await jest.advanceTimersByTimeAsync(0);
    const client = mockClients[0];

    stop();
    stop = undefined;
    await jest.advanceTimersByTimeAsync(60_000);

    expect(client.end).toHaveBeenCalled();
    expect(mockClients).toHaveLength(1);
  });
});
