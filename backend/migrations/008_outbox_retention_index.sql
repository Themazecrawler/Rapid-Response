-- Lets the retention job find old processed rows without scanning the whole outbox.
CREATE INDEX IF NOT EXISTS idx_notification_outbox_processed
    ON notification_outbox(processed_at)
    WHERE processed_at IS NOT NULL;
