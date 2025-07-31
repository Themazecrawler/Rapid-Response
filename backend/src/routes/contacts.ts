import express from 'express';
import { pool } from '../db';
import { queries } from '../db/queries';
import { authenticateToken } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Get all available contacts
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(queries.getAvailableContacts);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create new contact
router.post('/', authenticateToken, [
  body('name').notEmpty().trim(),
  body('role').notEmpty().trim(),
  body('phone').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('department').notEmpty().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Validation failed', details: errors.array() } 
      });
    }

    const { name, role, phone, email, department } = req.body;

    const result = await pool.query(queries.createContact, [
      name,
      role,
      phone,
      email,
      department
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update contact availability
router.patch('/:id/availability', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { available } = req.body;

    const result = await pool.query(
      'UPDATE emergency_contacts SET available = $1 WHERE id = $2 RETURNING *',
      [available, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Contact not found' } 
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router; 