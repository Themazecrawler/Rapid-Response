import express, { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { queries } from '../db/queries';
import { authenticateToken, requireRole, resolveUser } from '../middleware/auth';
import { body, param, validationResult } from 'express-validator';
import { appCache, cacheTtlMs } from '../services/cache';

const router = express.Router();

// Get all available contacts
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const rows = await appCache.getOrLoad(
      'contacts:available',
      cacheTtlMs('CONTACTS_CACHE_TTL_SECONDS', 60),
      async () => (await pool.query(queries.getAvailableContacts)).rows
    );
    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

// Get every contact, including unavailable ones (staff management view)
router.get(
  '/all',
  authenticateToken,
  resolveUser,
  requireRole('security', 'admin'),
  async (req, res, next) => {
    try {
      const result = await pool.query(queries.getAllContacts);
      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create new contact
router.post(
  '/',
  authenticateToken,
  resolveUser,
  requireRole('security', 'admin'),
  [
    body('name').notEmpty().trim(),
    body('role').notEmpty().trim(),
    body('phone').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('department').notEmpty().trim(),
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

      const { name, role, phone, email, department } = req.body;

      const result = await pool.query(queries.createContact, [
        name,
        role,
        phone,
        email,
        department,
      ]);

      appCache.invalidate('contacts:');
      return res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      return next(error);
    }
  }
);

// Update contact availability
router.patch(
  '/:id/availability',
  authenticateToken,
  resolveUser,
  requireRole('security', 'admin'),
  [param('id').isInt(), body('available').isBoolean()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', details: errors.array() },
        });
      }

      const { id } = req.params;
      const { available } = req.body;

      const result = await pool.query(
        'UPDATE emergency_contacts SET available = $1 WHERE id = $2 RETURNING *',
        [available, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Contact not found' },
        });
      }

      appCache.invalidate('contacts:');
      return res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
