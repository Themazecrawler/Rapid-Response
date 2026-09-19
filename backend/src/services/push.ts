import admin from '../config/firebaseAdmin';
import { pool } from '../db';
import { queries } from '../db/queries';

interface AlertPushPayload {
  id: number | string;
  type: string;
  priority: string;
  description: string;
  building: string | null;
}

const STALE_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

// Notifies security/admin staff (minus the reporter) that a new alert came in. Sent as a
// data-only message (no `notification` payload) so the client's FirebaseMessagingService
// always gets to build the notification itself, consistently across foreground/background.
export const notifyStaffOfNewAlert = async (
  alert: AlertPushPayload,
  reporterUserId: number
): Promise<void> => {
  const { rows } = await pool.query(queries.getStaffDeviceTokens, [reporterUserId]);
  const tokens: string[] = rows.map((row) => row.fcm_token);

  if (tokens.length === 0) {
    return;
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    data: {
      type: 'new_alert',
      alertId: String(alert.id),
      alertType: alert.type,
      priority: alert.priority,
      building: alert.building ?? '',
      description: alert.description.slice(0, 200),
    },
    android: { priority: 'high' },
  });

  const staleTokens: string[] = [];
  response.responses.forEach((result, index) => {
    const errorCode = result.error?.code;
    if (errorCode && STALE_TOKEN_ERROR_CODES.has(errorCode)) {
      staleTokens.push(tokens[index]);
    }
  });

  if (staleTokens.length > 0) {
    await Promise.all(staleTokens.map((token) => pool.query(queries.deleteDeviceToken, [token])));
  }
};
