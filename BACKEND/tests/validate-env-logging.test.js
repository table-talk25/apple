const { validateEnvironmentVariables } = require('../config/validateEnv');

describe('environment validation logging', () => {
  const names = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_API_KEY', 'TWILIO_API_SECRET', 'SENDGRID_API_KEY'];
  let originalEnv;
  let log;
  let warn;
  let error;
  let exit;

  beforeEach(() => {
    originalEnv = { ...process.env };
    names.forEach((name) => { delete process.env[name]; });
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
    exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  const output = () => JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls]);

  it('blocks placeholder credentials in production without leaking values', () => {
    process.env.NODE_ENV = 'production';
    process.env.TWILIO_API_SECRET = 'test-sensitive-placeholder-937';
    validateEnvironmentVariables();
    expect(exit).toHaveBeenCalledWith(1);
    expect(output()).toContain('TWILIO_API_SECRET');
    expect(output()).not.toContain(process.env.TWILIO_API_SECRET);
  });

  it('allows placeholders in development without leaking values', () => {
    process.env.NODE_ENV = 'development';
    process.env.SENDGRID_API_KEY = 'dummy-sensitive-placeholder-582';
    validateEnvironmentVariables();
    expect(exit).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    expect(output()).not.toContain(process.env.SENDGRID_API_KEY);
  });

  it('does not log even fragments of non-placeholder credentials', () => {
    process.env.NODE_ENV = 'production';
    process.env.TWILIO_AUTH_TOKEN = 'ABCD-sensitive-credential-WXYZ';
    validateEnvironmentVariables();
    expect(exit).not.toHaveBeenCalled();
    expect(output()).toContain('TWILIO_AUTH_TOKEN');
    expect(output()).not.toContain(process.env.TWILIO_AUTH_TOKEN);
    expect(output()).not.toContain('ABCD');
    expect(output()).not.toContain('WXYZ');
  });
});
