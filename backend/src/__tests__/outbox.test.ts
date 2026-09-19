const poolQuery = jest.fn();
jest.mock('../db', () => ({ pool: { query: (...args: unknown[]) => poolQuery(...args) } }));

const sendAlertConfirmationSms = jest.fn();
jest.mock('../services/sms', () => ({
  sendAlertConfirmationSms: (...args: unknown[]) => sendAlertConfirmationSms(...args),
}));

const notifyStaffOfNewAlert = jest.fn();
jest.mock('../services/push', () => ({
  notifyStaffOfNewAlert: (...args: unknown[]) => notifyStaffOfNewAlert(...args),
}));

import { processNextOutboxEvent } from '../services/outbox';

describe('notification outbox', () => {
  beforeEach(() => {
    poolQuery.mockReset();
    sendAlertConfirmationSms.mockReset();
    notifyStaffOfNewAlert.mockReset();
  });

  it('delivers and marks an SMS event processed', async () => {
    poolQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            event_type: 'alert.sms',
            payload: { toPhone: '+15555550100', alertType: 'Medical' },
            attempts: 1,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    sendAlertConfirmationSms.mockResolvedValue(undefined);

    expect(await processNextOutboxEvent()).toBe(true);
    expect(sendAlertConfirmationSms).toHaveBeenCalledWith('+15555550100', 'Medical');
    expect(poolQuery.mock.calls[1][0]).toContain('processed_at = NOW()');
  });

  it('backs off a failed event without blocking the request path', async () => {
    poolQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: '2',
            event_type: 'alert.push',
            payload: {
              reporterUserId: 7,
              alertId: 10,
              type: 'Fire',
              priority: 'high',
              description: 'Smoke',
              building: 'Library',
            },
            attempts: 2,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    notifyStaffOfNewAlert.mockRejectedValue(new Error('FCM unavailable'));

    expect(await processNextOutboxEvent()).toBe(true);
    expect(poolQuery.mock.calls[1][0]).toContain('available_at');
    expect(poolQuery.mock.calls[1][1]).toEqual(['2', 'FCM unavailable', false, 4]);
  });
});
