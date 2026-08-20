-- Optional contact number captured at report time, used to send an SMS confirmation
-- once the alert is received (see backend/src/services/sms.ts).
ALTER TABLE emergency_alerts ADD COLUMN reporter_phone VARCHAR(50);
