import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { queries } from '../db/queries';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Register user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('displayName').notEmpty().trim(),
  body('campus').notEmpty().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Validation failed', details: errors.array() } 
      });
    }

    const { email, password, displayName, campus } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'User already exists' } 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await pool.query(queries.createUser, [
      email, // auth_id will be email for now
      email,
      displayName,
      'user', // default role
      campus
    ]);

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
          campus: user.campus
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Validation failed', details: errors.array() } 
      });
    }

    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Invalid credentials' } 
      });
    }

    const user = result.rows[0];

    // Verify password (assuming password is stored in auth_id for now)
    const isValidPassword = await bcrypt.compare(password, user.auth_id || '');
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Invalid credentials' } 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
          campus: user.campus
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router; 