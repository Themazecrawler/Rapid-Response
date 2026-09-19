describe('sendAlertConfirmationSms', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../config/twilio');
  });

  it('no-ops without throwing when Twilio is not configured', async () => {
    jest.resetModules();
    jest.doMock('../config/twilio', () => ({ twilioClient: null }));
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { sendAlertConfirmationSms } = await import('../services/sms');
    await expect(sendAlertConfirmationSms('+15555550100', 'fire')).resolves.toBeUndefined();
  });

  it('sends a confirmation message via the configured Twilio client', async () => {
    jest.resetModules();
    const create = jest.fn().mockResolvedValue({});
    jest.doMock('../config/twilio', () => ({ twilioClient: { messages: { create } } }));
    process.env.TWILIO_PHONE_NUMBER = '+15555550199';

    const { sendAlertConfirmationSms } = await import('../services/sms');
    await sendAlertConfirmationSms('+15555550100', 'medical');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '+15555550199',
        to: '+15555550100',
        body: expect.stringContaining('medical'),
      })
    );
  });

  it('no-ops when TWILIO_PHONE_NUMBER is unset even if the client is configured', async () => {
    jest.resetModules();
    const create = jest.fn();
    jest.doMock('../config/twilio', () => ({ twilioClient: { messages: { create } } }));
    delete process.env.TWILIO_PHONE_NUMBER;
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { sendAlertConfirmationSms } = await import('../services/sms');
    await sendAlertConfirmationSms('+15555550100', 'medical');

    expect(create).not.toHaveBeenCalled();
  });
});
