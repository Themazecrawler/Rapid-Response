import request from 'supertest';

jest.mock('../config/firebaseAdmin', () => ({
  firebaseAuth: { verifyIdToken: jest.fn() },
  firebaseMessaging: { sendEachForMulticast: jest.fn() },
}));

const poolQuery = jest.fn();
jest.mock('../db', () => ({ pool: { query: (...args: unknown[]) => poolQuery(...args) } }));

import app from '../app';

describe('system endpoints', () => {
  beforeEach(() => poolQuery.mockReset());

  it('reports liveness without depending on the database', async () => {
    const response = await request(app).get('/health/live');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('alive');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toBeDefined();
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it('does not grant CORS access to an unconfigured browser origin', async () => {
    const response = await request(app).get('/health/live').set('Origin', 'https://evil.example');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects oversized JSON bodies with 413', async () => {
    const response = await request(app)
      .post('/api/v1/auth/sync')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ padding: 'x'.repeat(70 * 1024) }));
    expect(response.status).toBe(413);
  });

  it('reports readiness and the current schema version', async () => {
    poolQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [{ version: '005_operational_hardening.sql' }] });

    const response = await request(app).get('/health/ready');
    expect(response.status).toBe(200);
    expect(response.body.schemaVersion).toBe('005_operational_hardening.sql');
  });

  it('returns 503 when a readiness dependency is unavailable', async () => {
    poolQuery.mockRejectedValue(new Error('database unavailable'));
    const response = await request(app).get('/health/ready');
    expect(response.status).toBe(503);
  });

  it('exposes Prometheus-compatible metrics outside production', async () => {
    const response = await request(app).get('/metrics');
    expect(response.status).toBe(200);
    expect(response.text).toContain('rapid_response_http_requests_total');
  });
});
