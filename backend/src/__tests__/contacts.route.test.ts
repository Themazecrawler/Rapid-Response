import request from 'supertest';

const verifyIdToken = jest.fn();
jest.mock('../config/firebaseAdmin', () => ({
  firebaseAuth: { verifyIdToken },
  firebaseMessaging: { sendEachForMulticast: jest.fn() },
}));

const poolQuery = jest.fn();
jest.mock('../db', () => ({ pool: { query: (...args: unknown[]) => poolQuery(...args) } }));

import app from '../app';
import { queries } from '../db/queries';

const contact = {
  id: 3,
  name: 'Campus Security',
  role: 'Officer',
  phone: '+15555550100',
  email: 'security@example.com',
  department: 'Security',
  available: true,
};

const asRole = (role: string, extra?: (sql: string) => unknown) => {
  verifyIdToken.mockResolvedValue({ uid: 'firebase-uid', email: 'user@example.com' });
  poolQuery.mockImplementation((sql: string) => {
    if (sql.includes('FROM users WHERE auth_id')) {
      return Promise.resolve({ rows: [{ id: 7, role }] });
    }
    const result = extra?.(sql);
    if (result !== undefined) return Promise.resolve(result);
    throw new Error(`Unexpected query in test: ${sql}`);
  });
};

describe('contacts routes', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    poolQuery.mockReset();
  });

  describe('GET /api/contacts/all', () => {
    it('is forbidden for students', async () => {
      asRole('student');
      const res = await request(app).get('/api/contacts/all').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });

    it('returns every contact for security staff', async () => {
      asRole('security', (sql) =>
        sql === queries.getAllContacts
          ? { rows: [contact, { ...contact, available: false }] }
          : undefined
      );
      const res = await request(app).get('/api/contacts/all').set('Authorization', 'Bearer t');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('POST /api/contacts', () => {
    const body = {
      name: 'Campus Security',
      role: 'Officer',
      phone: '+15555550100',
      email: 'security@example.com',
      department: 'Security',
    };

    it('is forbidden for students', async () => {
      asRole('student');
      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', 'Bearer t')
        .send(body);
      expect(res.status).toBe(403);
    });

    it('rejects an invalid email', async () => {
      asRole('admin');
      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', 'Bearer t')
        .send({ ...body, email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('creates a contact for admin', async () => {
      asRole('admin', (sql) => (sql === queries.createContact ? { rows: [contact] } : undefined));
      const res = await request(app)
        .post('/api/contacts')
        .set('Authorization', 'Bearer t')
        .send(body);
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Campus Security');
    });
  });

  describe('PATCH /api/contacts/:id/availability', () => {
    it('is forbidden for students', async () => {
      asRole('student');
      const res = await request(app)
        .patch('/api/contacts/3/availability')
        .set('Authorization', 'Bearer t')
        .send({ available: false });
      expect(res.status).toBe(403);
    });

    it('rejects a non-boolean available value', async () => {
      asRole('security');
      const res = await request(app)
        .patch('/api/contacts/3/availability')
        .set('Authorization', 'Bearer t')
        .send({ available: 'maybe' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown contact', async () => {
      asRole('security', (sql) =>
        sql.includes('UPDATE emergency_contacts') ? { rows: [] } : undefined
      );
      const res = await request(app)
        .patch('/api/contacts/999/availability')
        .set('Authorization', 'Bearer t')
        .send({ available: false });
      expect(res.status).toBe(404);
    });

    it('updates availability for security staff', async () => {
      asRole('security', (sql) =>
        sql.includes('UPDATE emergency_contacts')
          ? { rows: [{ ...contact, available: false }] }
          : undefined
      );
      const res = await request(app)
        .patch('/api/contacts/3/availability')
        .set('Authorization', 'Bearer t')
        .send({ available: false });
      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
    });
  });
});

describe('GET /api/contacts (cached list)', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    poolQuery.mockReset();
  });

  it('serves available contacts and reuses the cached list until a write invalidates it', async () => {
    const listCalls = () =>
      poolQuery.mock.calls.filter(([sql]) => sql === queries.getAvailableContacts).length;
    asRole('security', (sql) => {
      if (sql === queries.getAvailableContacts) return { rows: [contact] };
      if (sql.includes('UPDATE emergency_contacts'))
        return { rows: [{ ...contact, available: false }] };
      return undefined;
    });
    const get = () => request(app).get('/api/contacts').set('Authorization', 'Bearer t');

    const first = await get();
    await get();
    expect(first.body.data).toHaveLength(1);
    expect(listCalls()).toBe(1);

    await request(app)
      .patch('/api/contacts/3/availability')
      .set('Authorization', 'Bearer t')
      .send({ available: false });
    await get();

    expect(listCalls()).toBe(2);
  });

  it('reports database failures', async () => {
    asRole('student', (sql) => {
      if (sql === queries.getAvailableContacts) throw new Error('db down');
      return undefined;
    });
    poolQuery.mockImplementation((sql: string) => {
      if (sql === queries.getAvailableContacts) return Promise.reject(new Error('db down'));
      return Promise.resolve({ rows: [] });
    });
    process.env.ENABLE_CACHE = 'false';

    const res = await request(app).get('/api/contacts').set('Authorization', 'Bearer t');

    delete process.env.ENABLE_CACHE;
    expect(res.status).toBe(500);
  });
});
