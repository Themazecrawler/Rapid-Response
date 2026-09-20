import { log } from './observability';

export const registerProcessHandlers = (
  shutdown: (reason: string, exitCode: number) => void,
  target: NodeJS.EventEmitter = process
): void => {
  target.on('unhandledRejection', (reason) => {
    log('error', 'unhandled_rejection', {
      error: reason instanceof Error ? (reason.stack ?? reason.message) : String(reason),
    });
    shutdown('unhandledRejection', 1);
  });
  target.on('uncaughtException', (error: Error) => {
    log('error', 'uncaught_exception', { error: error.stack ?? error.message });
    shutdown('uncaughtException', 1);
  });
  target.on('SIGTERM', () => shutdown('SIGTERM', 0));
  target.on('SIGINT', () => shutdown('SIGINT', 0));
};
