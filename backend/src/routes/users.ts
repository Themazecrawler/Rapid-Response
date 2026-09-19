import express, { NextFunction, Request, Response } from 'express';
import { pool } from '../db';
import { queries } from '../db/queries';
import { authenticateToken, resolveUser } from '../middleware/auth';
import { mapAlertRow } from '../utils/serializers';
import { getPagination, paginationValidators, rejectInvalidRequest } from '../utils/validation';
import { body } from 'express-validator';

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, resolveUser, async (req, res, next) => {
  try {
    const result = await pool.query(queries.getUserById, [req.user!.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    const user = result.rows[0];
    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        campus: user.campus,
        createdAt: user.created_at,
      },
    });
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

      const result = await pool.query(
        'UPDATE users SET display_name = $1, campus = $2 WHERE id = $3 RETURNING *',
        [displayName, campus, req.user!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' },
        });
      }

      const user = result.rows[0];
      return res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
          campus: user.campus,
          createdAt: user.created_at,
        },
      });
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
      const result = await pool.query(
        `SELECT * FROM emergency_alerts
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
        [req.user!.id, limit + 1, offset]
      );
      const hasMore = result.rows.length > limit;

      res.json({
        success: true,
        data: result.rows.slice(0, limit).map(mapAlertRow),
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

      await pool.query(queries.upsertDeviceToken, [req.user!.id, token]);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
