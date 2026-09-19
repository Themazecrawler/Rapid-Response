import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

type LogLevel = 'info' | 'warn' | 'error';
type LogFields = Record<string, unknown>;

export const log = (level: LogLevel, event: string, fields: LogFields = {}): void => {
  if (process.env.NODE_ENV === 'test') return;
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields });
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.log(entry);
};

interface Metric {
  count: number;
  durationSeconds: number;
}

const httpMetrics = new Map<string, Metric>();

const metricKey = (method: string, route: string, status: number): string =>
  JSON.stringify([method, route, String(status)]);

export const requestTelemetry = (req: Request, res: Response, next: NextFunction): void => {
  const started = process.hrtime.bigint();
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - started) / 1_000_000_000;
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : 'unmatched';
    const key = metricKey(req.method, route, res.statusCode);
    const metric = httpMetrics.get(key) ?? { count: 0, durationSeconds: 0 };
    metric.count += 1;
    metric.durationSeconds += durationSeconds;
    httpMetrics.set(key, metric);

    log('info', 'http_request', {
      requestId: req.requestId,
      method: req.method,
      route,
      status: res.statusCode,
      durationMs: Math.round(durationSeconds * 1000),
    });
  });

  next();
};

const escapeLabel = (value: string): string => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export const renderMetrics = (): string => {
  const lines = [
    '# HELP rapid_response_http_requests_total Total HTTP requests.',
    '# TYPE rapid_response_http_requests_total counter',
  ];
  const durationLines = [
    '# HELP rapid_response_http_request_duration_seconds Request duration in seconds.',
    '# TYPE rapid_response_http_request_duration_seconds summary',
  ];

  for (const [key, metric] of httpMetrics) {
    const [method, route, status] = JSON.parse(key) as string[];
    const labels = `method="${escapeLabel(method)}",route="${escapeLabel(route)}",status="${status}"`;
    lines.push(`rapid_response_http_requests_total{${labels}} ${metric.count}`);
    durationLines.push(
      `rapid_response_http_request_duration_seconds_sum{${labels}} ${metric.durationSeconds}`,
      `rapid_response_http_request_duration_seconds_count{${labels}} ${metric.count}`
    );
  }

  return [
    ...lines,
    ...durationLines,
    `rapid_response_process_uptime_seconds ${process.uptime()}`,
    '',
  ].join('\n');
};
