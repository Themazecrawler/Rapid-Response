import express from 'express';
import { pool } from '../db';
import { queries } from '../db/queries';
import { authenticateToken, requireRole, resolveUser } from '../middleware/auth';
import { mapAlertRow } from '../utils/serializers';
import { body } from 'express-validator';
import { getPagination, paginationValidators, rejectInvalidRequest } from '../utils/validation';
import { appCache, cacheTtlMs } from '../services/cache';

const router = express.Router();

const sameNullableValue = (stored: unknown, submitted: unknown): boolean =>
  (stored ?? null) === (submitted ?? null);

const sameCoordinate = (stored: unknown, submitted: unknown): boolean => {
  if (stored == null || submitted == null) {
    return stored == null && submitted == null;
  }

  const storedNumber = Number(stored);
  const submittedNumber = Number(submitted);
  return (
    Number.isFinite(storedNumber) &&
    Number.isFinite(submittedNumber) &&
    storedNumber.toFixed(8) === submittedNumber.toFixed(8)
  );
};

const isExactAlertReplay = (
  alert: Record<string, unknown>,
  userId: number,
  submitted: Record<string, unknown>
): boolean =>
  alert.user_id === userId &&
  alert.type === submitted.type &&
  sameNullableValue(alert.description, submitted.description) &&
  sameCoordinate(alert.latitude, submitted.latitude) &&
  sameCoordinate(alert.longitude, submitted.longitude) &&
  sameNullableValue(alert.building, submitted.building) &&
  sameNullableValue(alert.floor, submitted.floor) &&
  alert.priority === submitted.priority &&
  sameNullableValue(alert.reporter_phone, submitted.reporterPhone);

const validateAlert = [
  body('clientAlertId').isUUID().withMessage('clientAlertId must be a UUID'),
  body('type').isString().trim().notEmpty().isLength({ max: 255 }),
  body('description').isString().trim().notEmpty().isLength({ max: 4000 }),
  body('latitude').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).toFloat(),
  body('longitude').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).toFloat(),
  body('building').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('floor').optional({ nullable: true }).isString().trim().isLength({ max: 50 }),
  body('priority').isIn(['high', 'medium', 'low']),
  body('reporterPhone')
    .optional({ nullable: true })
    .matches(/^\+[1-9]\d{7,14}$/)
    .withMessage('reporterPhone must use E.164 format'),
];

// Create new alert. Idempotent on clientAlertId: the Android app queues alerts locally and
// retries with backoff until delivery is confirmed, so this route may see the same
// clientAlertId more than once if an earlier attempt succeeded but its response was lost.
router.post(
  '/',
  authenticateToken,
  ...validateAlert,
  rejectInvalidRequest,
  resolveUser,
  async (req, res, next) => {
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
        clientAlertId,
      } = req.body;

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
        clientAlertId,
      ]);

      let alert = insertResult.rows[0];
      const isNewAlert = Boolean(alert);

      if (!alert) {
        // Conflict on client_alert_id: this alert already exists from an earlier attempt.
        const existing = await pool.query(queries.getAlertByClientId, [clientAlertId]);
        alert = existing.rows[0];

        if (!alert || !isExactAlertReplay(alert, req.user!.id!, req.body)) {
          return res.status(409).json({
            success: false,
            error: { message: 'clientAlertId has already been used' },
          });
        }
      }

      return res.status(isNewAlert ? 201 : 200).json({
        success: true,
        data: mapAlertRow(alert),
      });
    } catch (error) {
      return next(error);
    }
  }
);

// Campus-wide recent alerts (not scoped to the caller) - restricted to security/admin, the
// same audience push notifications go to, since this exposes every reported alert.
router.get(
  '/recent',
  authenticateToken,
  resolveUser,
  requireRole('security', 'admin'),
  ...paginationValidators,
  rejectInvalidRequest,
  async (req, res, next) => {
    try {
      const { limit, offset } = getPagination(req);
      const result = await pool.query(queries.getRecentAlerts, [limit + 1, offset]);
      const hasMore = result.rows.length > limit;
      res.json({
        success: true,
        data: result.rows.slice(0, limit).map(mapAlertRow),
        pagination: { limit, offset, hasMore },
      });
    } catch (error) {
      next(error);
    }
  }
);

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Aggregate alert statistics for the charts screen. Not scoped to the caller: this is a
// campus-wide picture (alert types/priorities/day-of-week trends), not personal history.
router.get('/stats', authenticateToken, resolveUser, async (req, res, next) => {
  try {
    const data = await appCache.getOrLoad(
      'alerts:stats',
      cacheTtlMs('STATS_CACHE_TTL_SECONDS', 30),
      async () => {
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

        return {
          totalAlerts,
          activeAlerts: statusCounts['active'] ?? 0,
          investigatingAlerts: statusCounts['investigating'] ?? 0,
          resolvedAlerts: statusCounts['resolved'] ?? 0,
          byType: byType.rows.map((row) => ({ label: row.type, count: row.count })),
          byPriority: byPriority.rows.map((row) => ({ label: row.priority, count: row.count })),
          byDayOfWeek: byDayOfWeekOut,
          mostCommonType: byType.rows[0]?.type ?? null,
          busiestDay: totalAlerts > 0 ? busiestDay.label : null,
        };
      }
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
