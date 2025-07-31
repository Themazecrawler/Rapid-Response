import express from 'express';
import { pool } from '../db';
import { queries } from '../db/queries';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(queries.getUserById, [req.user?.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'User not found' } 
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        campus: user.campus,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res, next) => {
  try {
    const { displayName, campus } = req.body;

    const result = await pool.query(
      'UPDATE users SET display_name = $1, campus = $2 WHERE id = $3 RETURNING *',
      [displayName, campus, req.user?.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'User not found' } 
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        campus: user.campus,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user's alert history
router.get('/alerts', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM emergency_alerts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user?.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router; 