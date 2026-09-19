const requiredProductionVariables = [
  'DB_USER',
  'DB_HOST',
  'DB_NAME',
  'DB_PASSWORD',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'CORS_ALLOWED_ORIGINS',
  'METRICS_BEARER_TOKEN',
] as const;

export const validateEnvironment = (): void => {
  if (process.env.NODE_ENV !== 'production') return;

  const missing: string[] = requiredProductionVariables.filter((name) => !process.env[name]);
  if (process.env.ENABLE_SMS !== 'false') {
    for (const name of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']) {
      if (!process.env[name]) missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
};
