import express, { NextFunction, Request, Response } from 'express';
import { authenticateToken, resolveUser } from '../middleware/auth';
import { mapAlertRow, mapUserRow } from '../utils/serializers';
import { getPagination, paginationValidators, rejectInvalidRequest } from '../utils/validation';
import { body } from 'express-validator';
import { alertRepository } from '../repositories/alertRepository';
import { userRepository } from '../repositories/userRepository';

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, resolveUser, async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user!.id!);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    return res.json({ success: true, data: mapUserRow(user) });
  } catch (error) {
    return next(error);
  }
});

// Update user profile
router.put(
  '/profile',
  authenticateToken,
  resolveUser,
  [
    body('displayName').isString().trim().notEmpty().isLength({ max: 255 }),
    body('campus').isString().trim().notEmpty().isLength({ max: 255 }),
  ],
  rejectInvalidRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { displayName, campus } = req.body;
      const user = await userRepository.updateProfile(req.user!.id!, displayName, campus);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' },
        });
      }

      return res.json({ success: true, data: mapUserRow(user) });
    } catch (error) {
      return next(error);
    }
  }
);

// Get user's alert history
router.get(
  '/alerts',
  authenticateToken,
  resolveUser,
  ...paginationValidators,
  rejectInvalidRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit, offset } = getPagination(req);
      const rows = await alertRepository.listByUser(req.user!.id!, limit + 1, offset);
      const hasMore = rows.length > limit;

      res.json({
        success: true,
        data: rows.slice(0, limit).map(mapAlertRow),
        pagination: { limit, offset, hasMore },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Register (or reassign, if it moved to a different account on the same device) an FCM
// token for push notifications. Called on every sign-in and whenever the token rotates -
// every authenticated user registers a token, but only security/admin ever get pushed to
// (see services/push.ts), so nothing extra happens for students registering theirs.
router.post(
  '/device-token',
  authenticateToken,
  resolveUser,
  body('token').isString().trim().notEmpty().isLength({ max: 4096 }),
  rejectInvalidRequest,
  async (req, res, next) => {
    try {
      const { token } = req.body;

      await userRepository.registerDeviceToken(req.user!.id!, token);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
