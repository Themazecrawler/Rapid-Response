import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireRole, resolveUser } from '../middleware/auth';
import { body, param } from 'express-validator';
import { appCache, cacheTtlMs } from '../services/cache';
import { contactRepository } from '../repositories/contactRepository';
import { rejectInvalidRequest } from '../utils/validation';

const router = express.Router();

// Get all available contacts
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const rows = await appCache.getOrLoad(
      'contacts:available',
      cacheTtlMs('CONTACTS_CACHE_TTL_SECONDS', 60),
      () => contactRepository.listAvailable()
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
      res.json({
        success: true,
        data: await contactRepository.listAll(),
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
  rejectInvalidRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, role, phone, email, department } = req.body;
      const contact = await contactRepository.create({ name, role, phone, email, department });

      appCache.invalidate('contacts:');
      return res.status(201).json({
        success: true,
        data: contact,
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
  rejectInvalidRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contact = await contactRepository.setAvailability(
        String(req.params.id),
        req.body.available
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: { message: 'Contact not found' },
        });
      }

      appCache.invalidate('contacts:');
      return res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
