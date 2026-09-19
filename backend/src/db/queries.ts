export const queries = {
  // User queries
  upsertUser: `
    INSERT INTO users (auth_id, email, display_name, role, campus)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (auth_id) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          campus = EXCLUDED.campus,
          last_login = CURRENT_TIMESTAMP
    RETURNING *
  `,

  getUserById: `
    SELECT * FROM users WHERE id = $1
  `,

  // Device token queries (push notifications)
  upsertDeviceToken: `
    INSERT INTO device_tokens (user_id, fcm_token)
    VALUES ($1, $2)
    ON CONFLICT (fcm_token) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          updated_at = CURRENT_TIMESTAMP
  `,

  deleteDeviceToken: `
    DELETE FROM device_tokens WHERE fcm_token = $1
  `,

  // Tokens for staff who should be notified about a new alert, excluding the reporter's own
  // devices (they already know they just reported it).
  getStaffDeviceTokens: `
    SELECT dt.fcm_token
    FROM device_tokens dt
    JOIN users u ON u.id = dt.user_id
    WHERE u.role IN ('security', 'admin') AND u.id != $1
  `,

  // Alert queries

  // ON CONFLICT DO NOTHING makes retried submissions (same client_alert_id) safe: a retry
  // of an alert that already landed returns zero rows instead of erroring or duplicating,
  // and the caller falls back to getAlertByClientId to fetch the original.
  createAlert: `
    INSERT INTO emergency_alerts (
      user_id, type, description, latitude, longitude,
      building, floor, status, priority, reporter_phone, client_alert_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (client_alert_id) DO NOTHING
    RETURNING *
  `,

  getAlertByClientId: `
    SELECT * FROM emergency_alerts WHERE client_alert_id = $1
  `,

  getRecentAlerts: `
    SELECT ea.*, u.display_name as reporter_name
    FROM emergency_alerts ea
    JOIN users u ON ea.user_id = u.id
    WHERE ea.created_at >= NOW() - INTERVAL '24 HOURS'
    ORDER BY ea.created_at DESC, ea.id DESC
    LIMIT $1 OFFSET $2
  `,

  statsByType: `
    SELECT type, COUNT(*)::int as count
    FROM emergency_alerts
    GROUP BY type
    ORDER BY count DESC
  `,

  statsByPriority: `
    SELECT priority, COUNT(*)::int as count
    FROM emergency_alerts
    GROUP BY priority
  `,

  statsByStatus: `
    SELECT status, COUNT(*)::int as count
    FROM emergency_alerts
    GROUP BY status
  `,

  // Postgres DOW: 0 = Sunday .. 6 = Saturday
  statsByDayOfWeek: `
    SELECT EXTRACT(DOW FROM created_at)::int as dow, COUNT(*)::int as count
    FROM emergency_alerts
    GROUP BY dow
    ORDER BY dow
  `,

  // Contact queries
  createContact: `
    INSERT INTO emergency_contacts (name, role, phone, email, department)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,

  getAllContacts: `
    SELECT * FROM emergency_contacts
    ORDER BY name ASC
  `,

  getAvailableContacts: `
    SELECT * FROM emergency_contacts
    WHERE available = true
    ORDER BY name ASC
  `,
};
