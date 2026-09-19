-- Publishes the new alert id on a Postgres channel so every API instance can push it to its
-- connected staff clients. The payload is only the id: NOTIFY payloads are limited to 8000
-- bytes and subscribers re-read the row with their own authorization checks.
CREATE OR REPLACE FUNCTION notify_alert_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('alert_created', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER emergency_alert_realtime_notify
AFTER INSERT ON emergency_alerts
FOR EACH ROW EXECUTE FUNCTION notify_alert_created();
