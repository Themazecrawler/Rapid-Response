import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { body } from 'express-validator';
import { rejectInvalidRequest } from '../utils/validation';
import { mapUserRow } from '../utils/serializers';
import { userRepository } from '../repositories/userRepository';

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
  rejectInvalidRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { displayName, campus } = req.body;
      const { firebaseUid, email } = req.user!;

      const user = await userRepository.upsertFromFirebase(firebaseUid, email, displayName, campus);
      return res.status(200).json({ success: true, data: mapUserRow(user) });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
