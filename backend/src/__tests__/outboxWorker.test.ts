const poolQuery = jest.fn();
jest.mock('../db', () => ({ pool: { query: (...args: unknown[]) => poolQuery(...args) } }));

const mockSendSms = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/sms', () => ({
  sendAlertConfirmationSms: (...args: unknown[]) => mockSendSms(...args),
}));
const mockNotifyStaff = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/push', () => ({
  notifyStaffOfNewAlert: (...args: unknown[]) => mockNotifyStaff(...args),
}));

import { startOutboxWorker } from '../services/outbox';

const smsEvent = (id: number) => ({
  id: String(id),
  event_type: 'alert.sms',
  payload: { toPhone: '+15555550100', alertType: 'Fire' },
  attempts: 1,
});

let queue: ReturnType<typeof smsEvent>[] = [];
let claims = 0;

const installDatabase = () => {
  poolQuery.mockImplementation((sql: string) => {
    if (sql.includes('attempts = attempts + 1')) {
      claims += 1;
      return Promise.resolve({ rows: queue.length > 0 ? [queue.shift()] : [] });
    }
    if (sql.includes('DELETE FROM notification_outbox')) {
      return Promise.resolve({ rowCount: 3 });
    }
    return Promise.resolve({ rows: [] });
  });
};

describe('startOutboxWorker', () => {
  const original = { ...process.env };
  let stop: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
    poolQuery.mockReset();
    mockSendSms.mockClear();
    queue = [];
    claims = 0;
    installDatabase();
  });

  afterEach(() => {
    stop?.();
    jest.useRealTimers();
    process.env = { ...original };
  });

  it('drains the queue on startup and stops once it is empty', async () => {
    queue = [smsEvent(1), smsEvent(2), smsEvent(3)];
    stop = startOutboxWorker();
    await jest.advanceTimersByTimeAsync(0);

    expect(mockSendSms).toHaveBeenCalledTimes(3);
    expect(claims).toBe(4);
  });

  it('processes at most one batch per tick and continues on the next tick', async () => {
    process.env.OUTBOX_BATCH_SIZE = '2';
    queue = [smsEvent(1), smsEvent(2), smsEvent(3), smsEvent(4), smsEvent(5)];
    stop = startOutboxWorker();
    await jest.advanceTimersByTimeAsync(0);
    expect(mockSendSms).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(1000);
    expect(mockSendSms).toHaveBeenCalledTimes(4);
  });

  it('caps an oversized batch size and falls back on an invalid one', async () => {
    process.env.OUTBOX_BATCH_SIZE = '9999';
    queue = Array.from({ length: 80 }, (_, i) => smsEvent(i));
    stop = startOutboxWorker();
    await jest.advanceTimersByTimeAsync(0);
    expect(mockSendSms).toHaveBeenCalledTimes(50);
    stop();

    mockSendSms.mockClear();
    process.env.OUTBOX_BATCH_SIZE = 'lots';
    queue = Array.from({ length: 30 }, (_, i) => smsEvent(i));
    stop = startOutboxWorker();
    await jest.advanceTimersByTimeAsync(0);
    expect(mockSendSms).toHaveBeenCalledTimes(10);
  });

  it('keeps running after a database failure', async () => {
    poolQuery.mockRejectedValueOnce(new Error('connection lost'));
    queue = [smsEvent(1)];
    stop = startOutboxWorker();
    await jest.advanceTimersByTimeAsync(0);
    expect(mockSendSms).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1000);
    expect(mockSendSms).toHaveBeenCalledTimes(1);
  });

  it('runs retention cleanup hourly', async () => {
    stop = startOutboxWorker();
    await jest.advanceTimersByTimeAsync(60 * 60 * 1000);

    const deletes = poolQuery.mock.calls.filter(([sql]) => String(sql).includes('DELETE FROM'));
    expect(deletes).toHaveLength(1);
  });

  it('survives a failing cleanup', async () => {
    poolQuery.mockImplementation((sql: string) =>
      String(sql).includes('DELETE FROM')
        ? Promise.reject(new Error('locked'))
        : Promise.resolve({ rows: [] })
    );
    stop = startOutboxWorker();

    await expect(jest.advanceTimersByTimeAsync(60 * 60 * 1000)).resolves.not.toThrow();
  });

  it('stops polling once stopped', async () => {
    stop = startOutboxWorker();
    await jest.advanceTimersByTimeAsync(0);
    const before = claims;

    stop();
    await jest.advanceTimersByTimeAsync(10_000);

    expect(claims).toBe(before);
  });
});
