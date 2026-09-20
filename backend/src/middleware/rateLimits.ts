import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const positiveInteger = (name: string, fallback: number): number => {
  const configured = Number(process.env[name]);
  return Number.isInteger(configured) && configured > 0 ? configured : fallback;
};

const isAlertSubmission = (method: string, path: string): boolean =>
  method === 'POST' && /\/alerts\/?$/.test(path);

export const createIpRateLimiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: positiveInteger('RATE_LIMIT_MAX', 600),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isAlertSubmission(req.method, req.path),
  });

export const createAlertSubmissionLimiter = () =>
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: positiveInteger('ALERT_RATE_LIMIT_PER_HOUR', 30),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.firebaseUid ?? ipKeyGenerator(req.ip ?? 'unknown'),
    message: {
      success: false,
      error: { message: 'Too many alerts submitted. Try again later.' },
    },
  });
