import { twilioClient } from '../config/twilio';

// Sent server-side, not from the Android app, so the Twilio account SID/auth token never
// ship inside the APK.
export const sendAlertConfirmationSms = async (toPhone: string, alertType: string): Promise<void> => {
  if (!twilioClient) {
    console.warn('Twilio is not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN missing); skipping SMS.');
    return;
  }

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    console.warn('TWILIO_PHONE_NUMBER is not set; skipping SMS.');
    return;
  }

  await twilioClient.messages.create({
    from,
    to: toPhone,
    body:
      `Rapid Response: we've received your ${alertType} alert and campus security has been ` +
      `notified. Stay safe and keep your phone nearby.`,
  });
};
