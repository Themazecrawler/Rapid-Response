import { Request, Response } from 'express';

const verifyIdToken = jest.fn();
jest.mock('../config/firebaseAdmin', () => ({
  __esModule: true,
  default: { auth: () => ({ verifyIdToken }) },
}));

const poolQuery = jest.fn();
jest.mock('../db', () => ({ pool: { query: (...args: unknown[]) => poolQuery(...args) } }));

import { authenticateToken, resolveUser, requireRole } from '../middleware/auth';

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('authenticateToken', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it('rejects with 401 when no Authorization header is present', async () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 403 when the token fails verification', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad token'));
    const req = { headers: { authorization: 'Bearer invalid' } } as Request;
    const res = mockRes();
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches the decoded user and calls next() on a valid token', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'firebase-uid-1', email: 'user@example.com' });
    const req = { headers: { authorization: 'Bearer valid-token' } } as Request;
    const res = mockRes();
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(req.user).toEqual({ firebaseUid: 'firebase-uid-1', email: 'user@example.com' });
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('resolveUser', () => {
  beforeEach(() => {
    poolQuery.mockReset();
  });

  it('returns 404 when no Postgres profile exists for the Firebase uid', async () => {
    poolQuery.mockResolvedValue({ rows: [] });
    const req = { user: { firebaseUid: 'no-profile', email: null } } as Request;
    const res = mockRes();
    const next = jest.fn();

    await resolveUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches id/role from the profile row and calls next()', async () => {
    poolQuery.mockResolvedValue({ rows: [{ id: 7, role: 'security' }] });
    const req = { user: { firebaseUid: 'has-profile', email: null } } as Request;
    const res = mockRes();
    const next = jest.fn();

    await resolveUser(req, res, next);

    expect(req.user).toEqual({
      firebaseUid: 'has-profile',
      email: null,
      id: 7,
      role: 'security',
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('forwards database errors to next(error) instead of throwing', async () => {
    const dbError = new Error('connection lost');
    poolQuery.mockRejectedValue(dbError);
    const req = { user: { firebaseUid: 'x', email: null } } as Request;
    const res = mockRes();
    const next = jest.fn();

    await resolveUser(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});

describe('requireRole', () => {
  it('rejects with 403 when the caller role is not in the allowed list', () => {
    const req = { user: { firebaseUid: 'x', email: null, role: 'student' } } as Request;
    const res = mockRes();
    const next = jest.fn();

    requireRole('security', 'admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when the caller role is in the allowed list', () => {
    const req = { user: { firebaseUid: 'x', email: null, role: 'admin' } } as Request;
    const res = mockRes();
    const next = jest.fn();

    requireRole('security', 'admin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
