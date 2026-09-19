import express from 'express';
import { pool } from '../db';
import { queries } from '../db/queries';
import { authenticateToken, resolveUser } from '../middleware/auth';
import { mapAlertRow } from '../utils/serializers';

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
router.put('/profile', authenticateToken, resolveUser, async (req, res, next) => {
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
});

// Get user's alert history
router.get('/alerts', authenticateToken, resolveUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM emergency_alerts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );

    res.json({
      success: true,
      data: result.rows.map(mapAlertRow),
    });
  } catch (error) {
    next(error);
  }
});

// Register (or reassign, if it moved to a different account on the same device) an FCM
// token for push notifications. Called on every sign-in and whenever the token rotates -
// every authenticated user registers a token, but only security/admin ever get pushed to
// (see services/push.ts), so nothing extra happens for students registering theirs.
router.post('/device-token', authenticateToken, resolveUser, async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: { message: 'token is required' },
      });
    }

    await pool.query(queries.upsertDeviceToken, [req.user!.id, token]);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
