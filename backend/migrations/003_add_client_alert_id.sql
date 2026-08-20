-- Client-generated idempotency key. The Android app now queues alerts locally and retries
-- delivery with backoff (WorkManager) until it succeeds; if an earlier attempt actually
-- reached the server but the response was lost (timeout, connection drop), the retry must
-- not create a second alert row. UNIQUE allows any number of NULLs, so this is safe to add
-- without backfilling existing rows.
ALTER TABLE emergency_alerts ADD COLUMN client_alert_id UUID UNIQUE;
