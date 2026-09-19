import request from 'supertest';

const verifyIdToken = jest.fn();
jest.mock('../config/firebaseAdmin', () => ({
  firebaseAuth: { verifyIdToken },
  firebaseMessaging: { sendEachForMulticast: jest.fn() },
}));

const poolQuery = jest.fn();
jest.mock('../db', () => ({ pool: { query: (...args: unknown[]) => poolQuery(...args) } }));

const sendAlertConfirmationSms = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/sms', () => ({
  sendAlertConfirmationSms: (...args: unknown[]) => sendAlertConfirmationSms(...args),
}));

const notifyStaffOfNewAlert = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/push', () => ({
  notifyStaffOfNewAlert: (...args: unknown[]) => notifyStaffOfNewAlert(...args),
}));

import app from '../app';
import { queries } from '../db/queries';

const CLIENT_ALERT_ID = '1d0ca2a5-bc8b-45a7-a80a-8207c1e52b76';

const dbRow = {
  id: 1,
  user_id: 7,
  type: 'medical',
  description: 'Twisted ankle',
  latitude: '1.23',
  longitude: '4.56',
  building: 'Gym',
  floor: '1',
  status: 'active',
  priority: 'medium',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  resolved_at: null,
  reporter_phone: '+15555550100',
  client_alert_id: CLIENT_ALERT_ID,
};

const asStudent = () => {
  verifyIdToken.mockResolvedValue({ uid: 'firebase-uid', email: 'student@example.com' });
  poolQuery.mockImplementation((sql: string) => {
    if (sql.includes('FROM users WHERE auth_id')) {
      return Promise.resolve({ rows: [{ id: 7, role: 'student' }] });
    }
    throw new Error(`Unexpected query in test: ${sql}`);
  });
};

describe('POST /api/alerts', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    poolQuery.mockReset();
    sendAlertConfirmationSms.mockClear();
    notifyStaffOfNewAlert.mockClear();
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/alerts').send({ clientAlertId: 'x' });
    expect(res.status).toBe(401);
  });

  it('requires a clientAlertId', async () => {
    asStudent();
    const res = await request(app)
      .post('/api/alerts')
      .set('Authorization', 'Bearer token')
      .send({ type: 'medical' });

    expect(res.status).toBe(400);
  });

  it('creates a new alert without running notification side effects in the request', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'firebase-uid', email: 'student@example.com' });
    poolQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM users WHERE auth_id')) {
        return Promise.resolve({ rows: [{ id: 7, role: 'student' }] });
      }
      if (sql === queries.createAlert) {
        return Promise.resolve({ rows: [dbRow] });
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    });

    const res = await request(app).post('/api/alerts').set('Authorization', 'Bearer token').send({
      type: 'medical',
      description: 'Twisted ankle',
      priority: 'medium',
      reporterPhone: '+15555550100',
      clientAlertId: CLIENT_ALERT_ID,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.clientAlertId).toBe(CLIENT_ALERT_ID);
    expect(sendAlertConfirmationSms).not.toHaveBeenCalled();
    expect(notifyStaffOfNewAlert).not.toHaveBeenCalled();
  });

  it('returns the original alert on a retried clientAlertId without re-notifying', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'firebase-uid', email: 'student@example.com' });
    poolQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM users WHERE auth_id')) {
        return Promise.resolve({ rows: [{ id: 7, role: 'student' }] });
      }
      if (sql === queries.createAlert) {
        return Promise.resolve({ rows: [] });
      }
      if (sql === queries.getAlertByClientId) {
        return Promise.resolve({ rows: [dbRow] });
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    });

    const res = await request(app).post('/api/alerts').set('Authorization', 'Bearer token').send({
      type: 'medical',
      description: 'Twisted ankle',
      latitude: 1.23,
      longitude: 4.56,
      building: 'Gym',
      floor: '1',
      priority: 'medium',
      reporterPhone: '+15555550100',
      clientAlertId: CLIENT_ALERT_ID,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(dbRow.id);
    expect(sendAlertConfirmationSms).not.toHaveBeenCalled();
    expect(notifyStaffOfNewAlert).not.toHaveBeenCalled();
  });

  it('rejects a clientAlertId owned by another user without exposing the alert', async () => {
    asStudent();
    poolQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM users WHERE auth_id')) {
        return Promise.resolve({ rows: [{ id: 7, role: 'student' }] });
      }
      if (sql === queries.createAlert) {
        return Promise.resolve({ rows: [] });
      }
      if (sql === queries.getAlertByClientId) {
        return Promise.resolve({ rows: [{ ...dbRow, user_id: 99 }] });
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    });

    const res = await request(app).post('/api/alerts').set('Authorization', 'Bearer token').send({
      type: 'medical',
      description: 'Twisted ankle',
      latitude: 1.23,
      longitude: 4.56,
      building: 'Gym',
      floor: '1',
      priority: 'medium',
      clientAlertId: CLIENT_ALERT_ID,
    });

    expect(res.status).toBe(409);
    expect(res.body.data).toBeUndefined();
    expect(res.body.error.message).toBe('clientAlertId has already been used');
    expect(sendAlertConfirmationSms).not.toHaveBeenCalled();
    expect(notifyStaffOfNewAlert).not.toHaveBeenCalled();
  });

  it('rejects same-user reuse of a clientAlertId with a different payload', async () => {
    asStudent();
    poolQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM users WHERE auth_id')) {
        return Promise.resolve({ rows: [{ id: 7, role: 'student' }] });
      }
      if (sql === queries.createAlert) {
        return Promise.resolve({ rows: [] });
      }
      if (sql === queries.getAlertByClientId) {
        return Promise.resolve({ rows: [dbRow] });
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    });

    const res = await request(app).post('/api/alerts').set('Authorization', 'Bearer token').send({
      type: 'fire',
      description: 'Twisted ankle',
      latitude: 1.23,
      longitude: 4.56,
      building: 'Gym',
      floor: '1',
      priority: 'medium',
      clientAlertId: CLIENT_ALERT_ID,
    });

    expect(res.status).toBe(409);
    expect(res.body.data).toBeUndefined();
    expect(sendAlertConfirmationSms).not.toHaveBeenCalled();
    expect(notifyStaffOfNewAlert).not.toHaveBeenCalled();
  });

  it('rejects malformed alert input before querying the user profile', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'firebase-uid', email: 'student@example.com' });

    const res = await request(app)
      .post('/api/v1/alerts')
      .set('Authorization', 'Bearer token')
      .send({
        type: 'medical',
        description: 'Help',
        latitude: 100,
        priority: 'urgent',
        clientAlertId: 'not-a-uuid',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
    expect(poolQuery).not.toHaveBeenCalled();
  });
});

describe('GET /api/alerts/recent', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    poolQuery.mockReset();
  });

  it('is forbidden for a student', async () => {
    asStudent();
    const res = await request(app).get('/api/alerts/recent').set('Authorization', 'Bearer token');
    expect(res.status).toBe(403);
  });

  it('is allowed for security staff', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'firebase-uid', email: 'staff@example.com' });
    poolQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM users WHERE auth_id')) {
        return Promise.resolve({ rows: [{ id: 9, role: 'security' }] });
      }
      if (sql === queries.getRecentAlerts) {
        return Promise.resolve({ rows: [dbRow] });
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    });

    const res = await request(app).get('/api/alerts/recent').set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
