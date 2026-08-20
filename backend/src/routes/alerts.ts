import express from 'express';
import { pool } from '../db';
import { queries } from '../db/queries';
import { authenticateToken, resolveUser } from '../middleware/auth';
import { mapAlertRow } from '../utils/serializers';
import { sendAlertConfirmationSms } from '../services/sms';

const router = express.Router();

// Create new alert. Idempotent on clientAlertId: the Android app queues alerts locally and
// retries with backoff until delivery is confirmed, so this route may see the same
// clientAlertId more than once if an earlier attempt succeeded but its response was lost.
router.post('/', authenticateToken, resolveUser, async (req, res, next) => {
  try {
    const {
      type,
      description,
      latitude,
      longitude,
      building,
      floor,
      priority,
      reporterPhone,
      clientAlertId
    } = req.body;

    if (!clientAlertId) {
      return res.status(400).json({
        success: false,
        error: { message: 'clientAlertId is required' }
      });
    }

    const insertResult = await pool.query(queries.createAlert, [
      req.user!.id,
      type,
      description,
      latitude,
      longitude,
      building,
      floor,
      'active',
      priority,
      reporterPhone ?? null,
      clientAlertId
    ]);

    let alert = insertResult.rows[0];
    const isNewAlert = Boolean(alert);

    if (!alert) {
      // Conflict on client_alert_id: this alert already exists from an earlier attempt.
      const existing = await pool.query(queries.getAlertByClientId, [clientAlertId]);
      alert = existing.rows[0];
    }

    if (isNewAlert && reporterPhone) {
      // Fire-and-forget, and only on the first successful insert - a retried duplicate
      // request must not re-send the confirmation SMS.
      sendAlertConfirmationSms(reporterPhone, type).catch((error) => {
        console.error('Failed to send alert confirmation SMS:', error);
      });
    }

    return res.status(201).json({ success: true, data: mapAlertRow(alert) });
  } catch (error) {
    return next(error);
  }
});

// Get recent alerts
router.get('/recent', authenticateToken, resolveUser, async (req, res, next) => {
  try {
    const result = await pool.query(queries.getRecentAlerts);
    res.json({ success: true, data: result.rows.map(mapAlertRow) });
  } catch (error) {
    next(error);
  }
});

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Aggregate alert statistics for the charts screen. Not scoped to the caller: this is a
// campus-wide picture (alert types/priorities/day-of-week trends), not personal history.
router.get('/stats', authenticateToken, resolveUser, async (req, res, next) => {
  try {
    const [byType, byPriority, byStatus, byDayOfWeek] = await Promise.all([
      pool.query(queries.statsByType),
      pool.query(queries.statsByPriority),
      pool.query(queries.statsByStatus),
      pool.query(queries.statsByDayOfWeek),
    ]);

    const totalAlerts = byStatus.rows.reduce((sum, row) => sum + row.count, 0);
    const statusCounts: Record<string, number> = {};
    byStatus.rows.forEach((row) => {
      statusCounts[row.status] = row.count;
    });

    // Postgres DOW is 0 (Sun) .. 6 (Sat); rotate into a Mon..Sun array, defaulting to 0.
    const dowCounts = new Array(7).fill(0);
    byDayOfWeek.rows.forEach((row) => {
      const mondayFirstIndex = (row.dow + 6) % 7;
      dowCounts[mondayFirstIndex] = row.count;
    });
    const byDayOfWeekOut = DAY_LABELS.map((label, i) => ({ label, count: dowCounts[i] }));

    const busiestDay = byDayOfWeekOut.reduce(
      (max, entry) => (entry.count > max.count ? entry : max),
      byDayOfWeekOut[0]
    );

    res.json({
      success: true,
      data: {
        totalAlerts,
        activeAlerts: statusCounts['active'] ?? 0,
        investigatingAlerts: statusCounts['investigating'] ?? 0,
        resolvedAlerts: statusCounts['resolved'] ?? 0,
        byType: byType.rows.map((row) => ({ label: row.type, count: row.count })),
        byPriority: byPriority.rows.map((row) => ({ label: row.priority, count: row.count })),
        byDayOfWeek: byDayOfWeekOut,
        mostCommonType: byType.rows[0]?.type ?? null,
        busiestDay: totalAlerts > 0 ? busiestDay.label : null,
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
