-- Supports bounded, newest-first history queries without changing existing data.
CREATE INDEX IF NOT EXISTS idx_alerts_user_created_at
    ON emergency_alerts(user_id, created_at DESC);

-- Supports stable pagination when multiple alerts share the same timestamp.
CREATE INDEX IF NOT EXISTS idx_alerts_created_at_id
    ON emergency_alerts(created_at DESC, id DESC);
