import express from 'express';
import { matchedData, query } from 'express-validator';
import { pool } from '../db';
import { queries } from '../db/queries';
import { authenticateToken, requireRole, resolveUser } from '../middleware/auth';
import { setGauge } from '../observability';
import { realtimeEnabled, subscribeToRealtime, RealtimeMessage } from '../services/realtime';
import { mapAlertRow } from '../utils/serializers';
import { rejectInvalidRequest } from '../utils/validation';

const router = express.Router();

const HEARTBEAT_MS = 25_000;
const MAX_STREAM_LIFETIME_MS = 50 * 60 * 1000;
const MAX_BUFFERED_BYTES = 64 * 1024;
const REPLAY_LIMIT = 50;
const MAX_POLL_SECONDS = 25;

let activeConnections = 0;

const maxConnections = (): number => {
  const configured = Number(process.env.MAX_REALTIME_CONNECTIONS);
  return Number.isInteger(configured) && configured > 0 ? configured : 200;
};

const acquireConnection = (): boolean => {
  if (activeConnections >= maxConnections()) return false;
  activeConnections += 1;
  setGauge(
    'rapid_response_realtime_connections',
    'Open stream and long-poll connections.',
    activeConnections
  );
  return true;
};

const releaseConnection = (): void => {
  activeConnections = Math.max(0, activeConnections - 1);
  setGauge(
    'rapid_response_realtime_connections',
    'Open stream and long-poll connections.',
    activeConnections
  );
};

export const activeRealtimeConnections = (): number => activeConnections;

const staffOnly = [authenticateToken, resolveUser, requireRole('security', 'admin')];

const rejectWhenUnavailable = (
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (!realtimeEnabled()) {
    return res
      .status(503)
      .json({ success: false, error: { message: 'Real-time delivery is disabled' } });
  }
  return next();
};

const fetchAlertsAfter = async (afterId: number) => {
  const { rows } = await pool.query(queries.getAlertsAfterId, [afterId, REPLAY_LIMIT]);
  return rows.map(mapAlertRow);
};

router.get(
  '/stream',
  ...staffOnly,
  rejectWhenUnavailable,
  async (req: express.Request, res: express.Response) => {
    if (!acquireConnection()) {
      res.setHeader('Retry-After', '5');
      return res
        .status(503)
        .json({ success: false, error: { message: 'Too many open real-time connections' } });
    }

    const lastEventId = Number(req.header('Last-Event-ID'));
    let closed = false;
    let replaying = Number.isInteger(lastEventId) && lastEventId >= 0;
    let highestSentId = replaying ? lastEventId : 0;
    const queued: RealtimeMessage[] = [];

    const close = () => {
      if (closed) return;
      closed = true;
      unsubscribe();
      clearInterval(heartbeat);
      clearTimeout(lifetime);
      releaseConnection();
      res.end();
    };

    const write = (chunk: string) => {
      if (closed) return;
      if (res.writableLength > MAX_BUFFERED_BYTES) {
        close();
        return;
      }
      res.write(chunk);
    };

    const heartbeat = setInterval(() => write(': keep-alive\n\n'), HEARTBEAT_MS);
    const lifetime = setTimeout(close, MAX_STREAM_LIFETIME_MS);
    heartbeat.unref();
    lifetime.unref();

    const deliver = (message: RealtimeMessage) => {
      if (message.type === 'resync') {
        write('event: resync\ndata: {}\n\n');
        return;
      }
      const id = Number(message.alert.id);
      if (id <= highestSentId) return;
      highestSentId = id;
      write(`id: ${id}\nevent: alert\ndata: ${JSON.stringify(message.alert)}\n\n`);
    };

    const unsubscribe = subscribeToRealtime((message) => {
      if (replaying) queued.push(message);
      else deliver(message);
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 5000\n\n');
    res.on('close', close);

    if (replaying) {
      try {
        for (const alert of await fetchAlertsAfter(lastEventId)) {
          deliver({ type: 'alert', alert });
        }
      } catch (_error) {
        write('event: resync\ndata: {}\n\n');
      }
      replaying = false;
      queued.splice(0).forEach(deliver);
    }
    return undefined;
  }
);

router.get(
  '/poll',
  ...staffOnly,
  rejectWhenUnavailable,
  query('after').isInt({ min: 0 }).toInt(),
  query('timeout').optional().isInt({ min: 1, max: MAX_POLL_SECONDS }).toInt(),
  rejectInvalidRequest,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { after, timeout } = matchedData(req, { locations: ['query'] });
    const timeoutSeconds = typeof timeout === 'number' ? timeout : MAX_POLL_SECONDS;

    if (!acquireConnection()) {
      res.setHeader('Retry-After', '5');
      return res
        .status(503)
        .json({ success: false, error: { message: 'Too many open real-time connections' } });
    }

    let finished = false;

    const finish = async (
      respond: boolean,
      preloaded?: Awaited<ReturnType<typeof fetchAlertsAfter>>
    ) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      unsubscribe();
      releaseConnection();
      if (!respond) return;
      try {
        const alerts = preloaded ?? (await fetchAlertsAfter(after));
        const cursor = alerts.length > 0 ? Number(alerts[alerts.length - 1].id) : after;
        res.json({ success: true, data: alerts, cursor });
      } catch (error) {
        next(error);
      }
    };

    const unsubscribe = subscribeToRealtime(() => void finish(true));
    const timer = setTimeout(() => void finish(true), timeoutSeconds * 1000);
    timer.unref();
    res.on('close', () => void finish(false));

    try {
      const existing = await fetchAlertsAfter(after);
      if (existing.length > 0) await finish(true, existing);
    } catch (error) {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        unsubscribe();
        releaseConnection();
        next(error);
      }
    }
    return undefined;
  }
);

export default router;
