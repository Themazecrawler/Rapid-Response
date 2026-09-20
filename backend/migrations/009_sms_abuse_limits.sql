CREATE INDEX IF NOT EXISTS idx_notification_outbox_sms_phone
    ON notification_outbox ((payload->>'toPhone'), created_at)
    WHERE event_type = 'alert.sms';

CREATE OR REPLACE FUNCTION enqueue_alert_notifications()
RETURNS TRIGGER AS $$
DECLARE
    recent_user_sms INTEGER;
    recent_phone_sms INTEGER;
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
        SELECT COUNT(*) INTO recent_user_sms
        FROM emergency_alerts
        WHERE user_id = NEW.user_id
          AND reporter_phone IS NOT NULL
          AND id <> NEW.id
          AND created_at > NOW() - INTERVAL '24 hours';

        SELECT COUNT(*) INTO recent_phone_sms
        FROM notification_outbox
        WHERE event_type = 'alert.sms'
          AND payload->>'toPhone' = NEW.reporter_phone
          AND created_at > NOW() - INTERVAL '24 hours';

        IF recent_user_sms < 5 AND recent_phone_sms < 3 THEN
            INSERT INTO notification_outbox (event_type, payload)
            VALUES (
                'alert.sms',
                jsonb_build_object(
                    'toPhone', NEW.reporter_phone,
                    'alertType', NEW.type
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
