import { validateEnvironment } from '../config/environment';

const productionEnv = {
  NODE_ENV: 'production',
  DB_USER: 'u',
  DB_HOST: 'h',
  DB_NAME: 'n',
  DB_PASSWORD: 'p',
  FIREBASE_PROJECT_ID: 'id',
  FIREBASE_CLIENT_EMAIL: 'e',
  FIREBASE_PRIVATE_KEY: 'k',
  CORS_ALLOWED_ORIGINS: 'https://a.example',
  METRICS_BEARER_TOKEN: 't',
  TWILIO_ACCOUNT_SID: 'ACx',
  TWILIO_AUTH_TOKEN: 'a',
  TWILIO_PHONE_NUMBER: '+15555550100',
};

describe('validateEnvironment', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  const useEnv = (values: Record<string, string | undefined>) => {
    process.env = { ...values } as NodeJS.ProcessEnv;
  };

  it('does nothing outside production', () => {
    useEnv({ NODE_ENV: 'development' });
    expect(() => validateEnvironment()).not.toThrow();
  });

  it('accepts a complete production configuration', () => {
    useEnv(productionEnv);
    expect(() => validateEnvironment()).not.toThrow();
  });

  it('names every missing required variable', () => {
    useEnv({ ...productionEnv, DB_PASSWORD: undefined, METRICS_BEARER_TOKEN: undefined });
    expect(() => validateEnvironment()).toThrow(/DB_PASSWORD.*METRICS_BEARER_TOKEN/);
  });

  it('requires Twilio settings while SMS is enabled', () => {
    useEnv({ ...productionEnv, TWILIO_AUTH_TOKEN: undefined });
    expect(() => validateEnvironment()).toThrow(/TWILIO_AUTH_TOKEN/);
  });

  it('does not require Twilio settings when SMS is switched off', () => {
    useEnv({
      ...productionEnv,
      ENABLE_SMS: 'false',
      TWILIO_ACCOUNT_SID: undefined,
      TWILIO_AUTH_TOKEN: undefined,
      TWILIO_PHONE_NUMBER: undefined,
    });
    expect(() => validateEnvironment()).not.toThrow();
  });
});
