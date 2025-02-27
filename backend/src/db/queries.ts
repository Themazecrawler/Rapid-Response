export const queries = {
  // User queries
  createUser: `
    INSERT INTO users (auth_id, email, display_name, role, campus)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,

  getUserById: `
    SELECT * FROM users WHERE id = $1
  `,

  // Alert queries
  createAlert: `
    INSERT INTO emergency_alerts (
      user_id, type, description, latitude, longitude,
      building, floor, status, priority
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `,

  getRecentAlerts: `
    SELECT ea.*, u.display_name as reporter_name
    FROM emergency_alerts ea
    JOIN users u ON ea.user_id = u.id
    WHERE ea.created_at >= NOW() - INTERVAL '24 HOURS'
    ORDER BY ea.created_at DESC
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