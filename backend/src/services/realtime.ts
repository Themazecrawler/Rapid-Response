import { EventEmitter } from 'events';
import { Client } from 'pg';
import { connectionConfig, pool } from '../db';
import { queries } from '../db/queries';
import { incrementCounter, log } from '../observability';
import { mapAlertRow } from '../utils/serializers';
import { appCache } from './cache';

export type RealtimeMessage =
  { type: 'alert'; alert: ReturnType<typeof mapAlertRow> } | { type: 'resync' };

const CHANNEL = 'alert_created';
const bus = new EventEmitter();
bus.setMaxListeners(0);

export const realtimeEnabled = (): boolean => process.env.ENABLE_REALTIME !== 'false';

export const publishRealtimeMessage = (message: RealtimeMessage): void => {
  bus.emit('message', message);
};

export const subscribeToRealtime = (listener: (message: RealtimeMessage) => void): (() => void) => {
  bus.on('message', listener);
  return () => bus.off('message', listener);
};

const publishAlertById = async (id: number): Promise<void> => {
  const { rows } = await pool.query(queries.getAlertWithReporterById, [id]);
  if (rows.length === 0) return;
  publishRealtimeMessage({ type: 'alert', alert: mapAlertRow(rows[0]) });
  incrementCounter('rapid_response_realtime_events_total', 'Alert events fanned out.');
};

export const startAlertListener = (): (() => void) => {
  let stopped = false;
  let client: Client | null = null;
  let attempt = 0;
  let reconnectTimer: NodeJS.Timeout | undefined;
  let hasConnectedBefore = false;

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return;
    const delayMs = Math.min(30_000, 500 * 2 ** attempt);
    attempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      void connect();
    }, delayMs);
    reconnectTimer.unref();
  };

  const dropClient = () => {
    const current = client;
    client = null;
    current?.removeAllListeners();
    current?.on('error', () => undefined);
    void current?.end().catch(() => undefined);
  };

  const connect = async () => {
    if (stopped) return;
    const next = new Client({
      ...connectionConfig,
      statement_timeout: undefined,
      query_timeout: undefined,
      keepAlive: true,
    });
    client = next;

    next.on('notification', (message) => {
      if (message.channel !== CHANNEL) return;
      const id = Number(message.payload);
      if (!Number.isInteger(id)) return;
      appCache.invalidate('alerts:');
      publishAlertById(id).catch((error) =>
        log('error', 'realtime_publish_failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    });
    next.on('error', (error) => {
      log('warn', 'realtime_listener_error', { error: error.message });
      dropClient();
      scheduleReconnect();
    });
    next.on('end', () => {
      if (client === next) {
        dropClient();
        scheduleReconnect();
      }
    });

    try {
      await next.connect();
      await next.query(`LISTEN ${CHANNEL}`);
      attempt = 0;
      log('info', 'realtime_listener_connected');
      if (hasConnectedBefore) {
        appCache.invalidate('alerts:');
        publishRealtimeMessage({ type: 'resync' });
      }
      hasConnectedBefore = true;
    } catch (error) {
      log('warn', 'realtime_listener_connect_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      dropClient();
      scheduleReconnect();
    }
  };

  void connect();

  return () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    dropClient();
  };
};
