import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import alertRoutes from './routes/alerts';
import alertStreamRoutes from './routes/alertStream';
import contactRoutes from './routes/contacts';
import userRoutes from './routes/users';
import systemRoutes from './routes/system';
import { requestTelemetry } from './observability';

const app = express();

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

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

const mountApi = (prefix: string) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/alerts`, alertStreamRoutes);
  app.use(`${prefix}/alerts`, alertRoutes);
  app.use(`${prefix}/contacts`, contactRoutes);
  app.use(`${prefix}/users`, userRoutes);
};

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
