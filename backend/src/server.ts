import app from './app';
import { pool } from './db';
import { log } from './observability';
import { startOutboxWorker } from './services/outbox';
import { validateEnvironment } from './config/environment';

const PORT = Number(process.env.PORT || 5000);
validateEnvironment();

const server = app.listen(PORT, () => {
  log('info', 'server_started', { port: PORT });
});
const stopOutboxWorker = startOutboxWorker();

const shutdown = (signal: string) => {
  log('info', 'server_shutdown_started', { signal });
  stopOutboxWorker();
  server.close(async () => {
    await pool.end();
    log('info', 'server_shutdown_complete');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
