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

  // Alert queries
  createAlert: `
    INSERT INTO emergency_alerts (
      user_id, type, description, latitude, longitude,
      building, floor, status, priority, reporter_phone
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `,

  getRecentAlerts: `
    SELECT ea.*, u.display_name as reporter_name
    FROM emergency_alerts ea
    JOIN users u ON ea.user_id = u.id
    WHERE ea.created_at >= NOW() - INTERVAL '24 HOURS'
    ORDER BY ea.created_at DESC
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

  getAvailableContacts: `
    SELECT * FROM emergency_contacts
    WHERE available = true
    ORDER BY name ASC
  `,
};