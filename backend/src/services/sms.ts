import { twilioClient } from '../config/twilio';
import { log } from '../observability';

// Sent server-side, not from the Android app, so the Twilio account SID/auth token never
// ship inside the APK.
export const sendAlertConfirmationSms = async (
  toPhone: string,
  alertType: string
): Promise<void> => {
  if (!twilioClient) {
    log('warn', 'sms_skipped', { reason: 'twilio_not_configured' });
    return;
  }

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    log('warn', 'sms_skipped', { reason: 'twilio_phone_number_missing' });
    return;
  }

  const publicBaseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');

  await twilioClient.messages.create({
    from,
    to: toPhone,
    ...(publicBaseUrl && { statusCallback: `${publicBaseUrl}/api/v1/webhooks/twilio/status` }),
    body:
      `Rapid Response: we've received your ${alertType} alert and campus security has been ` +
      `notified. Stay safe and keep your phone nearby.`,
  });
};
