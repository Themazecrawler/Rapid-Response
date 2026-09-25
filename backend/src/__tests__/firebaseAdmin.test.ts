const mockCert = jest.fn((options: unknown) => ({ options }));
const mockInitializeApp = jest.fn((_options?: unknown) => ({ name: 'app' }));
const mockGetApps = jest.fn(() => [] as unknown[]);

jest.mock('firebase-admin/app', () => ({
  cert: (options: unknown) => mockCert(options),
  initializeApp: (options: unknown) => mockInitializeApp(options),
  getApps: () => mockGetApps(),
}));
jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn(() => ({ kind: 'auth' })) }));
jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(() => ({ kind: 'messaging' })),
}));

const loadFirebaseConfig = async () => {
  jest.resetModules();
  return import('../config/firebaseAdmin');
};

describe('firebase admin config', () => {
  const original = { ...process.env };

  beforeEach(() => {
    mockCert.mockClear();
    mockInitializeApp.mockClear();
    mockGetApps.mockReturnValue([]);
    process.env.FIREBASE_PROJECT_ID = 'project';
    process.env.FIREBASE_CLIENT_EMAIL = 'svc@project.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = 'first-line\\nsecond-line\\n';
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('turns escaped newlines in the private key back into real ones', async () => {
    await loadFirebaseConfig();

    expect(mockCert).toHaveBeenCalledWith({
      projectId: 'project',
      clientEmail: 'svc@project.iam.gserviceaccount.com',
      privateKey: 'first-line\nsecond-line\n',
    });
  });

  it('reuses an already initialised app instead of creating a second one', async () => {
    mockGetApps.mockReturnValue([{ name: 'existing' }]);

    await loadFirebaseConfig();

    expect(mockInitializeApp).not.toHaveBeenCalled();
  });

  it('exposes auth and messaging clients', async () => {
    const config = await loadFirebaseConfig();

    expect(config.firebaseAuth).toEqual({ kind: 'auth' });
    expect(config.firebaseMessaging).toEqual({ kind: 'messaging' });
  });
});
