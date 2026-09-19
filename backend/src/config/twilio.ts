import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Twilio is optional in dev: if it's not configured, sendAlertConfirmationSms just no-ops
// instead of the app crashing or alert creation failing.
export const twilioClient =
  accountSid?.startsWith('AC') && authToken ? twilio(accountSid, authToken) : null;
