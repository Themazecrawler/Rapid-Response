import express from 'express';
import { pool } from '../db';
import { renderMetrics } from '../observability';

const router = express.Router();

router.get('/health/live', (_req, res) => {
  res.json({ success: true, status: 'alive', uptimeSeconds: Math.floor(process.uptime()) });
});

router.get('/health/ready', async (_req, res) => {
  try {
    const [database, migration] = await Promise.all([
      pool.query('SELECT 1'),
      pool.query<{ version: string }>(
        'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1'
      ),
    ]);
    return res.json({
      success: true,
      status: 'ready',
      database: database.rowCount === 1 ? 'up' : 'unknown',
      schemaVersion: migration.rows[0]?.version ?? null,
    });
  } catch {
    return res.status(503).json({ success: false, status: 'not_ready' });
  }
});

router.get('/metrics', (req, res) => {
  const expectedToken = process.env.METRICS_BEARER_TOKEN;
  if (
    process.env.NODE_ENV === 'production' &&
    (!expectedToken || req.headers.authorization !== `Bearer ${expectedToken}`)
  ) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }
  return res.type('text/plain; version=0.0.4').send(renderMetrics());
});

export default router;
