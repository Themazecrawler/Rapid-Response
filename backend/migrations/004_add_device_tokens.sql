-- FCM registration tokens, one row per device. A user can have more than one (phone +
-- tablet), so this is a separate table rather than a column on users. A token is unique
-- across the table: if it moves to a different logged-in user on the same device, upserting
-- reassigns ownership rather than creating a stale duplicate.
CREATE TABLE device_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
