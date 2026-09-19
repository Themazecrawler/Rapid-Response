import { pool } from '../db';
import { log } from '../observability';
import { sendAlertConfirmationSms } from './sms';
import { notifyStaffOfNewAlert } from './push';

interface OutboxEvent {
  id: string;
  event_type: 'alert.sms' | 'alert.push';
  payload: Record<string, unknown>;
  attempts: number;
}

const MAX_ATTEMPTS = 8;
const DEFAULT_BATCH_SIZE = 10;

const enabled = (name: string): boolean => process.env[name] !== 'false';

const claimNextEvent = async (): Promise<OutboxEvent | undefined> => {
  const { rows } = await pool.query<OutboxEvent>(`
    UPDATE notification_outbox
    SET locked_at = NOW(), attempts = attempts + 1
    WHERE id = (
      SELECT id
      FROM notification_outbox
      WHERE processed_at IS NULL
        AND failed_at IS NULL
        AND available_at <= NOW()
        AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
      ORDER BY available_at, id
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, event_type, payload, attempts
  `);
  return rows[0];
};

const dispatch = async (event: OutboxEvent): Promise<void> => {
  if (event.event_type === 'alert.sms') {
    if (!enabled('ENABLE_SMS')) return;
    await sendAlertConfirmationSms(String(event.payload.toPhone), String(event.payload.alertType));
    return;
  }

  if (!enabled('ENABLE_PUSH_NOTIFICATIONS')) return;
  await notifyStaffOfNewAlert(
    {
      id: String(event.payload.alertId),
      type: String(event.payload.type),
      priority: String(event.payload.priority),
      description: String(event.payload.description),
      building: event.payload.building == null ? null : String(event.payload.building),
    },
    Number(event.payload.reporterUserId)
  );
};

export const processNextOutboxEvent = async (): Promise<boolean> => {
  const event = await claimNextEvent();
  if (!event) return false;

  try {
    await dispatch(event);
    await pool.query(
      `UPDATE notification_outbox
       SET processed_at = NOW(), locked_at = NULL, last_error = NULL
       WHERE id = $1`,
      [event.id]
    );
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const terminal = event.attempts >= MAX_ATTEMPTS;
    const delaySeconds = Math.min(300, 2 ** event.attempts);
    await pool.query(
      `UPDATE notification_outbox
       SET locked_at = NULL,
           last_error = $2,
           failed_at = CASE WHEN $3 THEN NOW() ELSE failed_at END,
           available_at = CASE
             WHEN $3 THEN available_at
             ELSE NOW() + ($4 * INTERVAL '1 second')
           END
       WHERE id = $1`,
      [event.id, message.slice(0, 2000), terminal, delaySeconds]
    );
    log(terminal ? 'error' : 'warn', 'outbox_delivery_failed', {
      outboxId: event.id,
      eventType: event.event_type,
      attempts: event.attempts,
      terminal,
      error: message,
    });
    return true;
  }
};

export const cleanupProcessedOutboxEvents = async (): Promise<number> => {
  const configured = Number(process.env.OUTBOX_RETENTION_DAYS);
  const retentionDays = Number.isFinite(configured) && configured > 0 ? configured : 30;
  const { rowCount } = await pool.query(
    `DELETE FROM notification_outbox
     WHERE id IN (
       SELECT id FROM notification_outbox
       WHERE processed_at IS NOT NULL
         AND processed_at < NOW() - ($1 * INTERVAL '1 day')
       LIMIT 1000
     )`,
    [retentionDays]
  );
  return rowCount ?? 0;
};

export const startOutboxWorker = (): (() => void) => {
  const configuredBatchSize = Number(process.env.OUTBOX_BATCH_SIZE || DEFAULT_BATCH_SIZE);
  const batchSize = Number.isInteger(configuredBatchSize)
    ? Math.max(1, Math.min(configuredBatchSize, 50))
    : DEFAULT_BATCH_SIZE;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      for (let processed = 0; processed < batchSize; processed += 1) {
        if (!(await processNextOutboxEvent())) break;
      }
    } catch (error) {
      log('error', 'outbox_worker_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      running = false;
    }
  };

  const cleanup = async () => {
    try {
      const removed = await cleanupProcessedOutboxEvents();
      if (removed > 0) log('info', 'outbox_retention_cleanup', { removed });
    } catch (error) {
      log('error', 'outbox_retention_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), 1000);
  const cleanupTimer = setInterval(() => void cleanup(), 60 * 60 * 1000);
  timer.unref();
  cleanupTimer.unref();
  return () => {
    clearInterval(timer);
    clearInterval(cleanupTimer);
  };
};
