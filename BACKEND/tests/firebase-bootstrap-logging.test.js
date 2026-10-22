const fs = require('fs');

describe('Firebase bootstrap credential logging', () => {
  let originalEnv;
  let logs;
  beforeEach(() => {
    originalEnv = { ...process.env };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('FIREBASE_')) delete process.env[key];
    }
    logs = [];
    for (const method of ['log', 'warn', 'error']) {
      jest.spyOn(console, method).mockImplementation((...args) => logs.push(args));
    }
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
  });
  afterEach(() => { process.env = originalEnv; jest.restoreAllMocks(); });

  it('does not print malformed credential JSON or parser excerpts', () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = '{SECRET_SENTINEL_PRIVATE_KEY: invalid json}';
    jest.isolateModules(() => {
      const admin = require('firebase-admin');
      admin.apps.splice(0);
      admin.initializeApp.mockClear();
      require('../bootstrap/firebaseAdmin');
      expect(admin.initializeApp).toHaveBeenCalled();
    });
    expect(JSON.stringify(logs)).not.toContain('SECRET_SENTINEL_PRIVATE_KEY');
    expect(JSON.stringify(logs)).toContain('JSON delle credenziali non valido');
  });
  it('does not print credentials embedded in SDK errors', () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({ project_id: 'project', private_key: 'SECRET_CERT_SENTINEL', client_email: 'private@example.invalid' });
    jest.isolateModules(() => {
      const admin = require('firebase-admin');
      admin.apps.splice(0);
      admin.credential.cert.mockImplementationOnce(() => { throw new Error('SECRET_CERT_SENTINEL'); });
      require('../bootstrap/firebaseAdmin');
    });
    const output = JSON.stringify(logs);
    expect(output).not.toContain('SECRET_CERT_SENTINEL');
    expect(output).not.toContain('private@example.invalid');
    expect(output).toContain('Inizializzazione fallita');
  });
});
