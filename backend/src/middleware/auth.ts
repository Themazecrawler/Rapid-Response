import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebaseAdmin';
import { pool } from '../db';

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Access token required' }
    });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      firebaseUid: decoded.uid,
      email: decoded.email ?? null,
    };
    return next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: { message: 'Invalid or expired token' }
    });
  }
};

// Resolves the Postgres `users` row (id/role) for the Firebase-authenticated caller.
// Must run after authenticateToken. Routes that touch alert/user data need the numeric
// id; /api/auth/sync is the only route that's expected to run before this row exists.
export const resolveUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await pool.query(
      'SELECT id, role FROM users WHERE auth_id = $1',
      [req.user?.firebaseUid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No profile found for this account. Call /api/auth/sync first.' }
      });
    }

    req.user = {
      ...req.user!,
      id: result.rows[0].id,
      role: result.rows[0].role,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
