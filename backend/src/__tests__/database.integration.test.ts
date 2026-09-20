import { Client } from 'pg';
import request from 'supertest';

jest.mock('../config/firebaseAdmin', () => ({
  firebaseAuth: {
    verifyIdToken: jest.fn(async (token: string) => ({
      uid: token,
      email: `${token}@example.com`,
    })),
  },
  firebaseMessaging: { sendEachForMulticast: jest.fn() },
}));

const mockSendSms = jest.fn().mockResolvedValue(undefined);
const mockNotifyStaff = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/sms', () => ({
  sendAlertConfirmationSms: (...args: unknown[]) => mockSendSms(...args),
}));
jest.mock('../services/push', () => ({
  notifyStaffOfNewAlert: (...args: unknown[]) => mockNotifyStaff(...args),
}));

import app from '../app';
import { connectionConfig, pool } from '../db';
import { queries } from '../db/queries';
import { cleanupProcessedOutboxEvents, processNextOutboxEvent } from '../services/outbox';

const describeDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

jest.setTimeout(30_000);

const createUser = async (authId: string, role = 'student'): Promise<number> => {
  const { rows } = await pool.query(
    `INSERT INTO users (auth_id, email, display_name, role, campus)
     VALUES ($1, $2, $3, $4, 'Main') RETURNING id`,
    [authId, `${authId}@example.com`, authId, role]
  );
  return rows[0].id;
};

let alertCounter = 0;
const insertAlert = async (userId: number, phone: string | null = null) => {
  alertCounter += 1;
  const clientAlertId = `00000000-0000-4000-8000-${String(alertCounter).padStart(12, '0')}`;
  const result = await pool.query(queries.createAlert, [
    userId,
    'fire',
    'Smoke in the library',
    null,
    null,
    'Library',
    null,
    'active',
    'high',
    phone,
    clientAlertId,
  ]);
  return { row: result.rows[0], clientAlertId };
};

const outboxTypes = async (): Promise<string[]> =>
  (await pool.query('SELECT event_type FROM notification_outbox ORDER BY id')).rows.map(
    (row) => row.event_type
  );

describeDatabase('PostgreSQL integration', () => {
  beforeEach(async () => {
    mockSendSms.mockClear();
    mockNotifyStaff.mockClear();
    await pool.query(
      'TRUNCATE notification_outbox, emergency_alerts, device_tokens, users RESTART IDENTITY CASCADE'
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it('has every migration applied', async () => {
    const { rows } = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
    const versions = rows.map((row) => row.version);
    expect(versions).toContain('006_notification_outbox.sql');
    expect(versions).toContain('009_sms_abuse_limits.sql');
  });

  describe('alert creation', () => {
    it('is idempotent on client_alert_id at the database level', async () => {
      const userId = await createUser('reporter');
      const first = await insertAlert(userId);
      const replay = await pool.query(queries.createAlert, [
        userId,
        'fire',
        'Smoke in the library',
        null,
        null,
        'Library',
        null,
        'active',
        'high',
        null,
        first.clientAlertId,
      ]);

      expect(first.row.id).toBeDefined();
      expect(replay.rows).toHaveLength(0);
      expect((await pool.query('SELECT COUNT(*)::int AS n FROM emergency_alerts')).rows[0].n).toBe(
        1
      );
    });

    it('queues exactly one push per alert and none for a replay', async () => {
      const userId = await createUser('reporter');
      const { clientAlertId } = await insertAlert(userId);
      await pool.query(queries.createAlert, [
        userId,
        'fire',
        'Smoke in the library',
        null,
        null,
        'Library',
        null,
        'active',
        'high',
        null,
        clientAlertId,
      ]);

      expect(await outboxTypes()).toEqual(['alert.push']);
    });

    it('publishes the new alert id on the realtime channel', async () => {
      const listener = new Client({ ...connectionConfig });
      await listener.connect();
      await listener.query('LISTEN alert_created');
      const received = new Promise<string>((resolve) =>
        listener.once('notification', (message) => resolve(message.payload ?? ''))
      );

      const userId = await createUser('reporter');
      const { row } = await insertAlert(userId);

      expect(await received).toBe(String(row.id));
      await listener.end();
    });
  });

  describe('SMS abuse limits', () => {
    it('queues an SMS for a first alert with a phone number', async () => {
      const userId = await createUser('reporter');
      await insertAlert(userId, '+15555550100');
      expect(await outboxTypes()).toEqual(['alert.push', 'alert.sms']);
    });

    it('stops texting a user after five alerts in a day but still saves and pushes the alert', async () => {
      const userId = await createUser('spammer');
      for (let i = 0; i < 7; i += 1) {
        await insertAlert(userId, `+1555555010${i}`);
      }

      const types = await outboxTypes();
      expect(types.filter((type) => type === 'alert.sms')).toHaveLength(5);
      expect(types.filter((type) => type === 'alert.push')).toHaveLength(7);
      expect((await pool.query('SELECT COUNT(*)::int AS n FROM emergency_alerts')).rows[0].n).toBe(
        7
      );
    });

    it('stops texting one phone number after three alerts in a day, whoever reports them', async () => {
      const victim = '+15555550199';
      for (let i = 0; i < 5; i += 1) {
        const userId = await createUser(`account-${i}`);
        await insertAlert(userId, victim);
      }

      const smsCount = (await outboxTypes()).filter((type) => type === 'alert.sms').length;
      expect(smsCount).toBe(3);
    });
  });

  describe('notification outbox', () => {
    it('lets concurrent workers claim different events, never the same one twice', async () => {
      for (let i = 0; i < 6; i += 1) {
        const userId = await createUser(`reporter-${i}`);
        await insertAlert(userId, `+1555555020${i}`);
      }

      await Promise.all(Array.from({ length: 12 }, () => processNextOutboxEvent()));

      expect(mockSendSms).toHaveBeenCalledTimes(6);
      expect(mockNotifyStaff).toHaveBeenCalledTimes(6);
      const pending = await pool.query(
        'SELECT COUNT(*)::int AS n FROM notification_outbox WHERE processed_at IS NULL'
      );
      expect(pending.rows[0].n).toBe(0);
    });

    it('deletes only processed rows older than the retention window', async () => {
      const userId = await createUser('reporter');
      await insertAlert(userId, '+15555550100');
      await pool.query(
        `UPDATE notification_outbox SET processed_at = NOW() - INTERVAL '45 days'
         WHERE event_type = 'alert.sms'`
      );
      await pool.query(
        `UPDATE notification_outbox SET processed_at = NOW() WHERE event_type = 'alert.push'`
      );

      expect(await cleanupProcessedOutboxEvents()).toBe(1);
      expect(await outboxTypes()).toEqual(['alert.push']);
    });
  });

  describe('HTTP API against the real database', () => {
    const body = (clientAlertId: string) => ({
      clientAlertId,
      type: 'fire',
      description: 'Smoke in the library',
      priority: 'high',
      building: 'Library',
    });
    const submit = (uid: string, clientAlertId: string) =>
      request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${uid}`)
        .send(body(clientAlertId));

    it('creates an alert, treats a retry as the same alert, and rejects reuse by another user', async () => {
      await createUser('alice');
      await createUser('bob');
      const id = '11111111-1111-4111-8111-111111111111';

      const created = await submit('alice', id);
      const retried = await submit('alice', id);
      const stolen = await submit('bob', id);

      expect(created.status).toBe(201);
      expect(retried.status).toBe(200);
      expect(retried.body.data.id).toBe(created.body.data.id);
      expect(stolen.status).toBe(409);
      expect((await pool.query('SELECT COUNT(*)::int AS n FROM emergency_alerts')).rows[0].n).toBe(
        1
      );
    });

    it('returns aggregate stats and keeps staff-only feeds away from students', async () => {
      await createUser('alice');
      await createUser('guard', 'security');
      await submit('alice', '22222222-2222-4222-8222-222222222222');

      const stats = await request(app)
        .get('/api/v1/alerts/stats')
        .set('Authorization', 'Bearer alice');
      const studentFeed = await request(app)
        .get('/api/v1/alerts/recent')
        .set('Authorization', 'Bearer alice');
      const staffFeed = await request(app)
        .get('/api/v1/alerts/recent')
        .set('Authorization', 'Bearer guard');

      expect(stats.body.data.totalAlerts).toBe(1);
      expect(studentFeed.status).toBe(403);
      expect(staffFeed.status).toBe(200);
      expect(staffFeed.body.data).toHaveLength(1);
    });

    it('lets a user sync a profile and read it back', async () => {
      const sync = await request(app)
        .post('/api/v1/auth/sync')
        .set('Authorization', 'Bearer carol')
        .send({ displayName: 'Carol', campus: 'North' });
      const profile = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer carol');

      expect(sync.status).toBe(200);
      expect(profile.body.data).toMatchObject({
        displayName: 'Carol',
        campus: 'North',
        role: 'student',
      });
    });
  });
});
