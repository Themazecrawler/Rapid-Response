import express, { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { queries } from '../db/queries';
import { authenticateToken } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Creates the Postgres profile row for a Firebase-authenticated user on their first
// launch (or updates display name/campus on later ones). Firebase owns the credential/
// identity; this table only owns app-specific fields (role, campus).
router.post(
  '/sync',
  authenticateToken,
  [
    body('displayName').isString().trim().notEmpty().isLength({ max: 255 }),
    body('campus').isString().trim().notEmpty().isLength({ max: 255 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', details: errors.array() },
        });
      }

      const { displayName, campus } = req.body;
      const { firebaseUid, email } = req.user!;

      const result = await pool.query(queries.upsertUser, [
        firebaseUid,
        email,
        displayName,
        'student',
        campus,
      ]);

      const user = result.rows[0];
      return res.status(200).json({
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

export default router;
