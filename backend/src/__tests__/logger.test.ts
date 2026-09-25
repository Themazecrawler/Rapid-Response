import { createLogger } from '../observability';

const capture = (level: string) => {
  const lines: string[] = [];
  const logger = createLogger(level, { write: (line: string) => void lines.push(line) });
  return { logger, lines };
};

describe('logger', () => {
  it('writes one JSON object per event with level, timestamp and fields', () => {
    const { logger, lines } = capture('info');

    logger.warn({ requestId: 'r-1', status: 503 }, 'upstream_unavailable');

    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      level: 'warn',
      event: 'upstream_unavailable',
      requestId: 'r-1',
      status: 503,
    });
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    expect(entry).not.toHaveProperty('pid');
  });

  it('drops events below the configured level', () => {
    const { logger, lines } = capture('warn');

    logger.info({}, 'http_request');
    logger.error({}, 'unhandled_error');

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).event).toBe('unhandled_error');
  });
});
