import type { Express } from 'express';
import request from 'supertest';

const mockVerifyIdToken = jest.fn();
jest.mock('../config/firebaseAdmin', () => ({
  firebaseAuth: { verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args) },
  firebaseMessaging: { sendEachForMulticast: jest.fn() },
}));
jest.mock('../db', () => ({
  connectionConfig: {},
  pool: { query: jest.fn() },
}));

jest.setTimeout(30_000);

const loadApp = async (env: Record<string, string>): Promise<Express> => {
  Object.assign(process.env, env);
  let app!: Express;
  await jest.isolateModulesAsync(async () => {
    app = (await import('../app')).default;
  });
  return app;
};

describe('rate limiting', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    mockVerifyIdToken.mockReset();
  });

  it('limits per client when the proxy is trusted, not per proxy', async () => {
    const app = await loadApp({ RATE_LIMIT_MAX: '2', TRUST_PROXY: '1' });
    const get = (ip: string) => request(app).get('/api/v1/contacts').set('X-Forwarded-For', ip);

    expect((await get('203.0.113.1')).status).toBe(401);
    expect((await get('203.0.113.1')).status).toBe(401);
    expect((await get('203.0.113.1')).status).toBe(429);
    expect((await get('203.0.113.2')).status).toBe(401);
  });

  it('never counts alert submissions against the shared IP limit', async () => {
    const app = await loadApp({ RATE_LIMIT_MAX: '1' });

    for (let i = 0; i < 4; i += 1) {
      expect((await request(app).post('/api/v1/alerts').send({})).status).toBe(401);
    }
    expect((await request(app).get('/api/v1/contacts')).status).toBe(401);
    expect((await request(app).get('/api/v1/contacts')).status).toBe(429);
  });

  it('caps alert submissions per signed-in user and leaves other users alone', async () => {
    const app = await loadApp({ ALERT_RATE_LIMIT_PER_HOUR: '2' });
    mockVerifyIdToken.mockImplementation(async (token: string) => ({
      uid: token,
      email: `${token}@example.com`,
    }));
    const submit = (uid: string) =>
      request(app).post('/api/v1/alerts').set('Authorization', `Bearer ${uid}`).send({});

    expect((await submit('user-a')).status).toBe(400);
    expect((await submit('user-a')).status).toBe(400);
    const limited = await submit('user-a');
    expect(limited.status).toBe(429);
    expect(limited.body.error.message).toContain('Too many alerts');
    expect((await submit('user-b')).status).toBe(400);
  });
});
