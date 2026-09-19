import express from 'express';
import twilio from 'twilio';
import { incrementCounter, log } from '../observability';

const router = express.Router();

router.post('/twilio/status', express.urlencoded({ extended: false, limit: '8kb' }), (req, res) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const publicBaseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (!authToken || !publicBaseUrl) {
    return res.status(503).json({ success: false, error: { message: 'Webhook not configured' } });
  }

  const signature = req.header('X-Twilio-Signature');
  const url = `${publicBaseUrl}${req.originalUrl}`;
  if (!signature || !twilio.validateRequest(authToken, signature, url, req.body)) {
    return res.status(403).json({ success: false, error: { message: 'Invalid signature' } });
  }

  const status = String(req.body.MessageStatus ?? 'unknown');
  incrementCounter('rapid_response_sms_status_total', 'Twilio SMS delivery statuses.', { status });
  log(status === 'failed' || status === 'undelivered' ? 'warn' : 'info', 'sms_delivery_status', {
    messageSid: req.body.MessageSid,
    status,
    errorCode: req.body.ErrorCode,
  });
  return res.status(204).end();
});

export default router;
