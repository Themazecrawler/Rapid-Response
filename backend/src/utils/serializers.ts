// Alert rows come back from `pg` with raw Postgres column names (snake_case). The Kotlin
// client's Gson setup matches JSON keys to field names exactly (no naming-policy conversion),
// so every alert response needs to go through this mapping — without it, fields like
// created_at/reporter_name/reporter_phone silently deserialize to null on the client.
export const mapAlertRow = (row: any) => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  description: row.description,
  latitude: row.latitude !== null ? Number(row.latitude) : null,
  longitude: row.longitude !== null ? Number(row.longitude) : null,
  building: row.building,
  floor: row.floor,
  status: row.status,
  priority: row.priority,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  resolvedAt: row.resolved_at,
  reporterName: row.reporter_name ?? null,
  reporterPhone: row.reporter_phone ?? null,
});
