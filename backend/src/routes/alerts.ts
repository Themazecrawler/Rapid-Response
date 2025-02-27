import express from 'express';
import { pool } from '../db';
import { queries } from '../db/queries';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Create new alert
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      type,
      description,
      latitude,
      longitude,
      building,
      floor,
      priority
    } = req.body;

    const result = await pool.query(queries.createAlert, [
      req.user.id,
      type,
      description,
      latitude,
      longitude,
      building,
      floor,
      'active',
      priority
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get recent alerts
router.get('/recent', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(queries.getRecentAlerts);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;