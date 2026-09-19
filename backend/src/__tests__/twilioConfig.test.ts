const twilioFactory = jest.fn(() => ({ messages: { create: jest.fn() } }));
jest.mock('twilio', () => ({ __esModule: true, default: twilioFactory }));

const load = async (): Promise<unknown> => {
  jest.resetModules();
  return (await import('../config/twilio')).twilioClient;
};

describe('twilio config', () => {
  const original = { ...process.env };

  beforeEach(() => twilioFactory.mockClear());
  afterEach(() => {
    process.env = { ...original };
  });

  it('leaves SMS disabled instead of crashing on the placeholder values from env.example', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'your-twilio-account-sid';
    process.env.TWILIO_AUTH_TOKEN = 'your-twilio-auth-token';

    expect(await load()).toBeNull();
    expect(twilioFactory).not.toHaveBeenCalled();
  });

  it('is disabled when credentials are missing', async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    expect(await load()).toBeNull();
  });

  it('creates a client for a real-looking account SID', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC0123456789abcdef0123456789abcdef';
    process.env.TWILIO_AUTH_TOKEN = 'token';

    expect(await load()).not.toBeNull();
    expect(twilioFactory).toHaveBeenCalledWith('AC0123456789abcdef0123456789abcdef', 'token');
  });
});
