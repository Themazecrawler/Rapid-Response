import { Pool } from 'pg';
import dotenv from 'dotenv';
import { log } from './observability';

dotenv.config();

export const connectionConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: true,
          ...(process.env.DB_SSL_CA && {
            ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'),
          }),
        }
      : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 5000,
  query_timeout: 6000,
  lock_timeout: 2000,
  idle_in_transaction_session_timeout: 10000,
};

export const pool = new Pool(connectionConfig);

pool.on('error', (error) => {
  log('error', 'postgres_idle_client_error', { error: error.message });
});

export default pool;
