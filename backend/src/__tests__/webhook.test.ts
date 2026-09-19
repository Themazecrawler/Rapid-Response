import request from 'supertest';
import twilio from 'twilio';

jest.mock('../config/firebaseAdmin', () => ({
  firebaseAuth: { verifyIdToken: jest.fn() },
  firebaseMessaging: { sendEachForMulticast: jest.fn() },
}));
jest.mock('../db', () => ({
  connectionConfig: {},
  pool: { query: jest.fn() },
}));

import app from '../app';
import { renderMetrics } from '../observability';

const authToken = 'twilio-auth-token';
const baseUrl = 'https://api.example.com';
const path = '/api/v1/webhooks/twilio/status';
const params = { MessageSid: 'SM123', MessageStatus: 'delivered' };

describe('POST /api/v1/webhooks/twilio/status', () => {
  beforeEach(() => {
    process.env.TWILIO_AUTH_TOKEN = authToken;
    process.env.PUBLIC_BASE_URL = baseUrl;
  });

  afterEach(() => {
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.PUBLIC_BASE_URL;
  });

  it('accepts a correctly signed status callback and counts it', async () => {
    const signature = twilio.getExpectedTwilioSignature(authToken, `${baseUrl}${path}`, params);
    const res = await request(app)
      .post(path)
      .set('X-Twilio-Signature', signature)
      .type('form')
      .send(params);

    expect(res.status).toBe(204);
    expect(renderMetrics()).toContain('rapid_response_sms_status_total{status="delivered"} 1');
  });

  it('rejects a callback signed with the wrong token', async () => {
    const signature = twilio.getExpectedTwilioSignature('wrong', `${baseUrl}${path}`, params);
    const res = await request(app)
      .post(path)
      .set('X-Twilio-Signature', signature)
      .type('form')
      .send(params);
    expect(res.status).toBe(403);
  });

  it('rejects a callback whose body was tampered with', async () => {
    const signature = twilio.getExpectedTwilioSignature(authToken, `${baseUrl}${path}`, params);
    const res = await request(app)
      .post(path)
      .set('X-Twilio-Signature', signature)
      .type('form')
      .send({ ...params, MessageStatus: 'failed' });
    expect(res.status).toBe(403);
  });

  it('rejects an unsigned callback', async () => {
    const res = await request(app).post(path).type('form').send(params);
    expect(res.status).toBe(403);
  });

  it('is unavailable until the public URL is configured', async () => {
    delete process.env.PUBLIC_BASE_URL;
    const res = await request(app).post(path).type('form').send(params);
    expect(res.status).toBe(503);
  });

  it('rejects oversized bodies', async () => {
    const res = await request(app)
      .post(path)
      .type('form')
      .send({ padding: 'x'.repeat(20 * 1024) });
    expect(res.status).toBe(413);
  });
});
