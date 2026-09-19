const poolQuery = jest.fn();
jest.mock('../db', () => ({ pool: { query: (...args: unknown[]) => poolQuery(...args) } }));
jest.mock('../services/sms', () => ({ sendAlertConfirmationSms: jest.fn() }));
jest.mock('../services/push', () => ({ notifyStaffOfNewAlert: jest.fn() }));

import { cleanupProcessedOutboxEvents } from '../services/outbox';

describe('outbox retention', () => {
  beforeEach(() => {
    poolQuery.mockReset();
    delete process.env.OUTBOX_RETENTION_DAYS;
  });

  it('deletes only processed rows older than the default 30 day window', async () => {
    poolQuery.mockResolvedValue({ rowCount: 12 });

    expect(await cleanupProcessedOutboxEvents()).toBe(12);

    const [sql, params] = poolQuery.mock.calls[0];
    expect(sql).toContain('processed_at IS NOT NULL');
    expect(sql).toContain('LIMIT 1000');
    expect(params).toEqual([30]);
  });

  it('honours OUTBOX_RETENTION_DAYS and ignores invalid values', async () => {
    poolQuery.mockResolvedValue({ rowCount: 0 });

    process.env.OUTBOX_RETENTION_DAYS = '7';
    await cleanupProcessedOutboxEvents();
    process.env.OUTBOX_RETENTION_DAYS = 'soon';
    await cleanupProcessedOutboxEvents();

    expect(poolQuery.mock.calls[0][1]).toEqual([7]);
    expect(poolQuery.mock.calls[1][1]).toEqual([30]);
  });
});
