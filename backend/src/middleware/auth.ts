import { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../config/firebaseAdmin';
import { userRepository } from '../repositories/userRepository';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Access token required' },
    });
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.user = {
      firebaseUid: decoded.uid,
      email: decoded.email ?? null,
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token' },
    });
  }
};

// Resolves the Postgres `users` row (id/role) for the Firebase-authenticated caller.
// Must run after authenticateToken. Routes that touch alert/user data need the numeric
// id; /api/auth/sync is the only route that's expected to run before this row exists.
export const resolveUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await userRepository.findAuthProfile(req.user?.firebaseUid);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { message: 'No profile found for this account. Call /api/auth/sync first.' },
      });
    }

    req.user = {
      ...req.user!,
      id: profile.id,
      role: profile.role,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

// Must run after resolveUser (needs req.user.role populated). Used to restrict
// campus-wide views - like the incoming-alerts feed security/admin get push notifications
// for - to the roles that should actually see every reported alert.
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'You do not have permission to access this resource' },
      });
    }
    return next();
  };
};
