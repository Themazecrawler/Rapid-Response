import express from 'express';
import { authenticateToken, requireRole, resolveUser } from '../middleware/auth';
import { mapAlertRow } from '../utils/serializers';
import { body } from 'express-validator';
import { getPagination, paginationValidators, rejectInvalidRequest } from '../utils/validation';
import { appCache, cacheTtlMs } from '../services/cache';
import { loadAlertStatistics } from '../services/alertStatistics';
import { createAlertSubmissionLimiter } from '../middleware/rateLimits';
import { alertRepository } from '../repositories/alertRepository';

const router = express.Router();
const alertSubmissionLimiter = createAlertSubmissionLimiter();

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
  alertSubmissionLimiter,
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

      let alert = await alertRepository.create({
        userId: req.user!.id!,
        type,
        description,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        building: building ?? null,
        floor: floor ?? null,
        priority,
        reporterPhone: reporterPhone ?? null,
        clientAlertId,
      });
      const isNewAlert = Boolean(alert);

      if (!alert) {
        // Conflict on client_alert_id: this alert already exists from an earlier attempt.
        alert = await alertRepository.findByClientAlertId(clientAlertId);

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
      const rows = await alertRepository.listRecent(limit + 1, offset);
      const hasMore = rows.length > limit;
      res.json({
        success: true,
        data: rows.slice(0, limit).map(mapAlertRow),
        pagination: { limit, offset, hasMore },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Aggregate alert statistics for the charts screen. Not scoped to the caller: this is a
// campus-wide picture (alert types/priorities/day-of-week trends), not personal history.
router.get('/stats', authenticateToken, resolveUser, async (req, res, next) => {
  try {
    const data = await appCache.getOrLoad(
      'alerts:stats',
      cacheTtlMs('STATS_CACHE_TTL_SECONDS', 30),
      loadAlertStatistics
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
