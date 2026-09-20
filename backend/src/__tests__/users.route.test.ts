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

const userRow = {
  id: 7,
  email: 'jane@example.com',
  display_name: 'Jane',
  role: 'student',
  campus: 'Main',
  created_at: '2024-01-01T00:00:00.000Z',
};

const alertRow = (id: number) => ({
  id,
  user_id: 7,
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
});

const asStudent = (handler: (sql: string) => unknown = () => undefined) => {
  verifyIdToken.mockResolvedValue({ uid: 'uid-7', email: 'jane@example.com' });
  poolQuery.mockImplementation((sql: string) => {
    if (sql.includes('FROM users WHERE auth_id')) {
      return Promise.resolve({ rows: [{ id: 7, role: 'student' }] });
    }
    const result = handler(sql);
    if (result !== undefined) return Promise.resolve(result);
    throw new Error(`Unexpected query in test: ${sql}`);
  });
};

const authed = (method: 'get' | 'put' | 'post', path: string) =>
  request(app)[method](path).set('Authorization', 'Bearer token');

describe('users routes', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    poolQuery.mockReset();
  });

  describe('GET /users/profile', () => {
    it('returns the profile in API shape', async () => {
      asStudent((sql) => (sql === queries.getUserById ? { rows: [userRow] } : undefined));
      const res = await authed('get', '/api/v1/users/profile');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        id: 7,
        email: 'jane@example.com',
        displayName: 'Jane',
        role: 'student',
        campus: 'Main',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('returns 404 when the row vanished after authentication', async () => {
      asStudent((sql) => (sql === queries.getUserById ? { rows: [] } : undefined));
      expect((await authed('get', '/api/v1/users/profile')).status).toBe(404);
    });

    it('requires a token', async () => {
      expect((await request(app).get('/api/v1/users/profile')).status).toBe(401);
    });
  });

  describe('PUT /users/profile', () => {
    it('rejects an empty display name', async () => {
      asStudent();
      const res = await authed('put', '/api/v1/users/profile').send({
        displayName: '  ',
        campus: 'Main',
      });
      expect(res.status).toBe(400);
    });

    it('rejects an oversized campus', async () => {
      asStudent();
      const res = await authed('put', '/api/v1/users/profile').send({
        displayName: 'Jane',
        campus: 'x'.repeat(300),
      });
      expect(res.status).toBe(400);
    });

    it('updates the profile', async () => {
      asStudent((sql) =>
        sql === queries.updateUserProfile
          ? { rows: [{ ...userRow, display_name: 'Jane D', campus: 'North' }] }
          : undefined
      );
      const res = await authed('put', '/api/v1/users/profile').send({
        displayName: 'Jane D',
        campus: 'North',
      });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ displayName: 'Jane D', campus: 'North' });
      const update = poolQuery.mock.calls.find(([sql]) => sql === queries.updateUserProfile);
      expect(update?.[1]).toEqual(['Jane D', 'North', 7]);
    });

    it('returns 404 when there is nothing to update', async () => {
      asStudent((sql) => (sql === queries.updateUserProfile ? { rows: [] } : undefined));
      const res = await authed('put', '/api/v1/users/profile').send({
        displayName: 'Jane',
        campus: 'Main',
      });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /users/alerts', () => {
    it('pages the caller history and reports whether more exist', async () => {
      asStudent((sql) =>
        sql === queries.getAlertsByUser
          ? { rows: [alertRow(3), alertRow(2), alertRow(1)] }
          : undefined
      );
      const res = await authed('get', '/api/v1/users/alerts?limit=2');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toEqual({ limit: 2, offset: 0, hasMore: true });
      const call = poolQuery.mock.calls.find(([sql]) => sql === queries.getAlertsByUser);
      expect(call?.[1]).toEqual([7, 3, 0]);
    });

    it('reports no more pages when the result fits', async () => {
      asStudent((sql) => (sql === queries.getAlertsByUser ? { rows: [alertRow(1)] } : undefined));
      const res = await authed('get', '/api/v1/users/alerts');
      expect(res.body.pagination.hasMore).toBe(false);
    });

    it('rejects an out-of-range page size', async () => {
      asStudent();
      expect((await authed('get', '/api/v1/users/alerts?limit=1000')).status).toBe(400);
    });
  });

  describe('POST /users/device-token', () => {
    it('registers a token for the caller', async () => {
      asStudent((sql) => (sql === queries.upsertDeviceToken ? { rows: [] } : undefined));
      const res = await authed('post', '/api/v1/users/device-token').send({ token: 'fcm-token' });
      expect(res.status).toBe(204);
      const call = poolQuery.mock.calls.find(([sql]) => sql === queries.upsertDeviceToken);
      expect(call?.[1]).toEqual([7, 'fcm-token']);
    });

    it('rejects a missing token', async () => {
      asStudent();
      expect((await authed('post', '/api/v1/users/device-token').send({})).status).toBe(400);
    });
  });
});

describe('POST /auth/sync', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    poolQuery.mockReset();
    verifyIdToken.mockResolvedValue({ uid: 'uid-7', email: 'jane@example.com' });
  });

  it('creates or refreshes the profile as a student, ignoring any client-supplied role', async () => {
    poolQuery.mockImplementation((sql: string) =>
      sql === queries.upsertUser
        ? Promise.resolve({ rows: [userRow] })
        : Promise.reject(new Error(sql))
    );

    const res = await request(app)
      .post('/api/v1/auth/sync')
      .set('Authorization', 'Bearer token')
      .send({ displayName: 'Jane', campus: 'Main', role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.data.displayName).toBe('Jane');
    expect(poolQuery.mock.calls[0][1]).toEqual([
      'uid-7',
      'jane@example.com',
      'Jane',
      'student',
      'Main',
    ]);
  });

  it('requires both fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/sync')
      .set('Authorization', 'Bearer token')
      .send({ displayName: 'Jane' });
    expect(res.status).toBe(400);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it('requires a token', async () => {
    expect((await request(app).post('/api/v1/auth/sync').send({})).status).toBe(401);
  });

  it('passes database failures to the error handler', async () => {
    poolQuery.mockRejectedValue(new Error('db down'));
    const res = await request(app)
      .post('/api/v1/auth/sync')
      .set('Authorization', 'Bearer token')
      .send({ displayName: 'Jane', campus: 'Main' });
    expect(res.status).toBe(500);
  });
});
