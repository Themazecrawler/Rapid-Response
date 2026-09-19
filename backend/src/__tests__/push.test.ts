const sendEachForMulticast = jest.fn();
jest.mock('../config/firebaseAdmin', () => ({
  firebaseMessaging: { sendEachForMulticast },
}));

const poolQuery = jest.fn();
jest.mock('../db', () => ({ pool: { query: (...args: unknown[]) => poolQuery(...args) } }));

import { notifyStaffOfNewAlert } from '../services/push';

const alert = {
  id: 1,
  type: 'fire',
  priority: 'high',
  description: 'Smoke in the library',
  building: 'Library',
};

describe('notifyStaffOfNewAlert', () => {
  beforeEach(() => {
    poolQuery.mockReset();
    sendEachForMulticast.mockReset();
  });

  it('does nothing when no staff device tokens are registered', async () => {
    poolQuery.mockResolvedValueOnce({ rows: [] });

    await notifyStaffOfNewAlert(alert, 42);

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('sends a data-only multicast to every registered staff token', async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [{ fcm_token: 'token-1' }, { fcm_token: 'token-2' }],
    });
    sendEachForMulticast.mockResolvedValue({
      responses: [{ success: true }, { success: true }],
    });

    await notifyStaffOfNewAlert(alert, 42);

    expect(sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['token-1', 'token-2'],
        data: expect.objectContaining({ alertId: '1', alertType: 'fire' }),
      })
    );
    expect(poolQuery).toHaveBeenCalledTimes(1);
  });

  it('prunes tokens that come back with a stale-token error code', async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [{ fcm_token: 'good-token' }, { fcm_token: 'stale-token' }],
    });
    sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
    });
    poolQuery.mockResolvedValueOnce({ rows: [] });

    await notifyStaffOfNewAlert(alert, 42);

    expect(poolQuery).toHaveBeenCalledTimes(2);
    expect(poolQuery).toHaveBeenLastCalledWith(expect.any(String), ['stale-token']);
  });
});
