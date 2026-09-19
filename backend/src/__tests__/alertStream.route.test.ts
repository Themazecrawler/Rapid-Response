import http from 'http';
import { AddressInfo } from 'net';
import request from 'supertest';

const verifyIdToken = jest.fn();
jest.mock('../config/firebaseAdmin', () => ({
  firebaseAuth: { verifyIdToken },
  firebaseMessaging: { sendEachForMulticast: jest.fn() },
}));

const poolQuery = jest.fn();
jest.mock('../db', () => ({
  connectionConfig: {},
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));

import app from '../app';
import { queries } from '../db/queries';
import { activeRealtimeConnections } from '../routes/alertStream';
import { publishRealtimeMessage } from '../services/realtime';
import { mapAlertRow } from '../utils/serializers';

const dbRow = (id: number) => ({
  id,
  user_id: 1,
  type: 'fire',
  description: 'Smoke',
  latitude: null,
  longitude: null,
  building: 'Library',
  floor: null,
  status: 'active',
  priority: 'high',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  resolved_at: null,
  reporter_name: 'Jane',
  client_alert_id: `c-${id}`,
});

let alertRows: ReturnType<typeof dbRow>[] = [];

const asRole = (role: string) => {
  verifyIdToken.mockResolvedValue({ uid: 'firebase-uid', email: 'staff@example.com' });
  poolQuery.mockImplementation((sql: string) => {
    if (sql.includes('FROM users WHERE auth_id')) {
      return Promise.resolve({ rows: [{ id: 7, role }] });
    }
    if (sql === queries.getAlertsAfterId) return Promise.resolve({ rows: alertRows });
    throw new Error(`Unexpected query in test: ${sql}`);
  });
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (condition: () => boolean, timeoutMs = 2000) => {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for condition');
    await wait(10);
  }
};

describe('real-time alert delivery', () => {
  let server: http.Server;
  let port: number;
  const open: http.ClientRequest[] = [];

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    verifyIdToken.mockReset();
    poolQuery.mockReset();
    alertRows = [];
    delete process.env.ENABLE_REALTIME;
    delete process.env.MAX_REALTIME_CONNECTIONS;
  });

  afterEach(async () => {
    open.splice(0).forEach((req) => req.destroy());
    await waitFor(() => activeRealtimeConnections() === 0);
  });

  const openStream = (headers: Record<string, string> = {}) =>
    new Promise<{ status: number; headers: http.IncomingHttpHeaders; text: () => string }>(
      (resolve, reject) => {
        let body = '';
        const req = http.get(
          {
            port,
            path: '/api/v1/alerts/stream',
            headers: { Authorization: 'Bearer token', ...headers },
          },
          (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => (body += chunk));
            resolve({ status: res.statusCode ?? 0, headers: res.headers, text: () => body });
          }
        );
        req.on('error', reject);
        open.push(req);
      }
    );

  describe('GET /alerts/stream', () => {
    it('is forbidden for students', async () => {
      asRole('student');
      const res = await request(app).get('/api/v1/alerts/stream').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });

    it('opens an event stream and pushes alerts published after connecting', async () => {
      asRole('security');
      const stream = await openStream();
      expect(stream.status).toBe(200);
      expect(stream.headers['content-type']).toContain('text/event-stream');
      expect(stream.text()).toContain('retry: 5000');

      publishRealtimeMessage({ type: 'alert', alert: mapAlertRow(dbRow(5)) });
      await waitFor(() => stream.text().includes('event: alert'));

      expect(stream.text()).toContain('id: 5');
      expect(stream.text()).toContain('"reporterName":"Jane"');
    });

    it('forwards resync messages', async () => {
      asRole('admin');
      const stream = await openStream();
      publishRealtimeMessage({ type: 'resync' });
      await waitFor(() => stream.text().includes('event: resync'));
    });

    it('replays missed alerts after Last-Event-ID without duplicating them', async () => {
      asRole('security');
      alertRows = [dbRow(6), dbRow(7)];
      const stream = await openStream({ 'Last-Event-ID': '5' });
      await waitFor(() => stream.text().includes('id: 7'));

      publishRealtimeMessage({ type: 'alert', alert: mapAlertRow(dbRow(7)) });
      publishRealtimeMessage({ type: 'alert', alert: mapAlertRow(dbRow(8)) });
      await waitFor(() => stream.text().includes('id: 8'));

      expect(stream.text().match(/id: 7/g)).toHaveLength(1);
      expect(stream.text().match(/id: 6/g)).toHaveLength(1);
    });

    it('rejects new connections beyond the configured cap and frees slots on disconnect', async () => {
      asRole('security');
      process.env.MAX_REALTIME_CONNECTIONS = '1';
      await openStream();
      expect(activeRealtimeConnections()).toBe(1);

      const rejected = await openStream();
      expect(rejected.status).toBe(503);
      expect(rejected.headers['retry-after']).toBe('5');

      open.splice(0).forEach((req) => req.destroy());
      await waitFor(() => activeRealtimeConnections() === 0);
      const reconnected = await openStream();
      expect(reconnected.status).toBe(200);
    });

    it('can be switched off with the ENABLE_REALTIME flag', async () => {
      asRole('security');
      process.env.ENABLE_REALTIME = 'false';
      const res = await request(app).get('/api/v1/alerts/stream').set('Authorization', 'Bearer t');
      expect(res.status).toBe(503);
    });
  });

  describe('GET /alerts/poll', () => {
    const poll = (query: string) =>
      request(app).get(`/api/v1/alerts/poll?${query}`).set('Authorization', 'Bearer t');

    it('requires a numeric after cursor', async () => {
      asRole('security');
      expect((await poll('')).status).toBe(400);
      expect((await poll('after=abc')).status).toBe(400);
    });

    it('is forbidden for students', async () => {
      asRole('student');
      expect((await poll('after=0')).status).toBe(403);
    });

    it('returns immediately with alerts newer than the cursor', async () => {
      asRole('security');
      alertRows = [dbRow(3), dbRow(4)];
      const res = await poll('after=2');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.cursor).toBe(4);
    });

    it('holds the request open until an alert arrives', async () => {
      asRole('security');
      const pending = poll('after=4&timeout=10').then((response) => response);
      await wait(50);
      expect(activeRealtimeConnections()).toBe(1);

      alertRows = [dbRow(5)];
      publishRealtimeMessage({ type: 'alert', alert: mapAlertRow(dbRow(5)) });
      const res = await pending;

      expect(res.body.data.map((alert: { id: number }) => alert.id)).toEqual([5]);
      expect(res.body.cursor).toBe(5);
      expect(activeRealtimeConnections()).toBe(0);
    });

    it('returns an empty page with the same cursor when nothing arrives before the timeout', async () => {
      asRole('security');
      const res = await poll('after=9&timeout=1');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.cursor).toBe(9);
      expect(activeRealtimeConnections()).toBe(0);
    });
  });
});
