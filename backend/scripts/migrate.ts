import fs from 'fs/promises';
import path from 'path';
import { pool } from '../src/db';

const migrationsDirectory = path.resolve(process.cwd(), 'migrations');

const ensureVersionTable = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const baselineLegacySchema = async (): Promise<void> => {
  const { rows } = await pool.query<{
    has_users: boolean;
    has_tokens: boolean;
    required_columns: number;
  }>(`
    SELECT
      to_regclass('public.users') IS NOT NULL AS has_users,
      to_regclass('public.device_tokens') IS NOT NULL AS has_tokens,
      (
        SELECT COUNT(*)::int
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'emergency_alerts'
          AND column_name IN ('reporter_phone', 'client_alert_id')
      ) AS required_columns
  `);
  const state = rows[0];
  if (!state?.has_users) return;
  if (!state.has_tokens || state.required_columns !== 2) {
    throw new Error(
      'Existing database is only partially migrated. Apply migrations 001-004 manually before running db:migrate.'
    );
  }

  for (const version of [
    '001_initial_schema.sql',
    '002_add_reporter_phone.sql',
    '003_add_client_alert_id.sql',
    '004_add_device_tokens.sql',
  ]) {
    await pool.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING', [
      version,
    ]);
  }
};

const migrate = async (): Promise<void> => {
  await ensureVersionTable();
  await baselineLegacySchema();

  const files = (await fs.readdir(migrationsDirectory))
    .filter((file) => /^\d+.*\.sql$/.test(file))
    .sort();
  const applied = new Set(
    (await pool.query<{ version: string }>('SELECT version FROM schema_migrations')).rows.map(
      (row) => row.version
    )
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDirectory, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied migration ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

migrate()
  .catch((error) => {
    console.error('Migration failed', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
