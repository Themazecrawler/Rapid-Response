import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createIpRateLimiter } from './middleware/rateLimits';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import alertRoutes from './routes/alerts';
import alertStreamRoutes from './routes/alertStream';
import webhookRoutes from './routes/webhooks';
import contactRoutes from './routes/contacts';
import userRoutes from './routes/users';
import systemRoutes from './routes/system';
import { requestTelemetry } from './observability';

const app = express();

const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) {
  app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
}

const allowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(helmet());
app.use(requestTelemetry);
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
  })
);
app.use(express.json({ limit: '64kb' }));
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(systemRoutes);

app.use(createIpRateLimiter());

const mountApi = (prefix: string) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/alerts`, alertStreamRoutes);
  app.use(`${prefix}/alerts`, alertRoutes);
  app.use(`${prefix}/contacts`, contactRoutes);
  app.use(`${prefix}/users`, userRoutes);
};

app.use('/api/v1/webhooks', webhookRoutes);
mountApi('/api/v1');
mountApi('/api'); // Backward-compatible alias for existing mobile installs.

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found', requestId: req.requestId },
  });
});

app.use(errorHandler);

export default app;
