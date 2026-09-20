import app from './app';
import { pool } from './db';
import { log } from './observability';
import { registerProcessHandlers } from './lifecycle';
import { startOutboxWorker } from './services/outbox';
import { realtimeEnabled, startAlertListener } from './services/realtime';
import { validateEnvironment } from './config/environment';

const PORT = Number(process.env.PORT || 5000);
validateEnvironment();

const server = app.listen(PORT, () => {
  log('info', 'server_started', { port: PORT });
});
const stopOutboxWorker = startOutboxWorker();
const stopAlertListener = realtimeEnabled() ? startAlertListener() : () => undefined;

let shuttingDown = false;

const shutdown = (reason: string, exitCode: number) => {
  if (shuttingDown) return;
  shuttingDown = true;
  log('info', 'server_shutdown_started', { reason });
  stopOutboxWorker();
  stopAlertListener();
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    await pool.end();
    log('info', 'server_shutdown_complete');
    process.exit(exitCode);
  });
};

registerProcessHandlers(shutdown);
