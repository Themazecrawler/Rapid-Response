CREATE TABLE notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('alert.sms', 'alert.push')),
    payload JSONB NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_outbox_pending
    ON notification_outbox(available_at, id)
    WHERE processed_at IS NULL AND failed_at IS NULL;

CREATE OR REPLACE FUNCTION enqueue_alert_notifications()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_outbox (event_type, payload)
    VALUES (
        'alert.push',
        jsonb_build_object(
            'reporterUserId', NEW.user_id,
            'alertId', NEW.id,
            'type', NEW.type,
            'priority', NEW.priority,
            'description', COALESCE(NEW.description, ''),
            'building', NEW.building
        )
    );

    IF NEW.reporter_phone IS NOT NULL THEN
        INSERT INTO notification_outbox (event_type, payload)
        VALUES (
            'alert.sms',
            jsonb_build_object(
                'toPhone', NEW.reporter_phone,
                'alertType', NEW.type
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER emergency_alert_notification_outbox
AFTER INSERT ON emergency_alerts
FOR EACH ROW EXECUTE FUNCTION enqueue_alert_notifications();
