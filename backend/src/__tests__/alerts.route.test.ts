import request from 'supertest';

const verifyIdToken = jest.fn();
jest.mock('../config/firebaseAdmin', () => ({
  __esModule: true,
  default: {
    auth: () => ({ verifyIdToken }),
    messaging: () => ({ sendEachForMulticast: jest.fn() }),
  },
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
  client_alert_id: 'client-uuid-1',
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

  it('creates a new alert and fires SMS + staff push exactly once', async () => {
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

    const res = await request(app)
      .post('/api/alerts')
      .set('Authorization', 'Bearer token')
      .send({
        type: 'medical',
        description: 'Twisted ankle',
        reporterPhone: '+15555550100',
        clientAlertId: 'client-uuid-1',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.clientAlertId).toBe('client-uuid-1');
    expect(sendAlertConfirmationSms).toHaveBeenCalledTimes(1);
    expect(notifyStaffOfNewAlert).toHaveBeenCalledTimes(1);
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

    const res = await request(app)
      .post('/api/alerts')
      .set('Authorization', 'Bearer token')
      .send({
        type: 'medical',
        reporterPhone: '+15555550100',
        clientAlertId: 'client-uuid-1',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(dbRow.id);
    expect(sendAlertConfirmationSms).not.toHaveBeenCalled();
    expect(notifyStaffOfNewAlert).not.toHaveBeenCalled();
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
