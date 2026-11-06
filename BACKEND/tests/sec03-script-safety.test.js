const {
  readAdminCredentials,
  readSeedPassword,
  assertDestructiveAllowed,
  resolveMongoUri,
  maskMongoUri,
} = require('../scripts/lib/safety');

describe('SEC-03 credenziali admin', () => {
  it('senza variabili: errore, nessun valore predefinito', () => {
    expect(() => readAdminCredentials({})).toThrow(/ADMIN_EMAIL e ADMIN_PASSWORD/);
    expect(() => readAdminCredentials({ ADMIN_EMAIL: 'a@example.test' })).toThrow();
    expect(() => readAdminCredentials({ ADMIN_PASSWORD: 'x'.repeat(20) })).toThrow();
  });

  it('password sotto i 12 caratteri: errore', () => {
    expect(() => readAdminCredentials({ ADMIN_EMAIL: 'a@example.test', ADMIN_PASSWORD: '12345678901' })).toThrow(/12/);
  });

  it('email non valida: errore', () => {
    expect(() => readAdminCredentials({ ADMIN_EMAIL: 'non-una-email', ADMIN_PASSWORD: 'x'.repeat(12) })).toThrow(/email/i);
  });

  it('valori validi: restituiti normalizzati', () => {
    expect(readAdminCredentials({ ADMIN_EMAIL: ' Admin@Example.Test ', ADMIN_PASSWORD: 'x'.repeat(12) }))
      .toEqual({ email: 'admin@example.test', password: 'x'.repeat(12) });
  });

  it('password dei seed solo da variabile d\'ambiente', () => {
    expect(() => readSeedPassword({})).toThrow(/SEED_USER_PASSWORD/);
    expect(readSeedPassword({ SEED_USER_PASSWORD: 'y'.repeat(12) })).toBe('y'.repeat(12));
  });
});

describe('SEC-03 script distruttivi', () => {
  it('rifiutati in produzione anche con la conferma', () => {
    expect(() => assertDestructiveAllowed('cleanDatabase', { env: { NODE_ENV: 'production', CONFIRM_DESTRUCTIVE: 'yes' }, argv: ['node', 'x', '--confirm'] }))
      .toThrow(/production/);
  });

  it('senza conferma esplicita: rifiutati', () => {
    expect(() => assertDestructiveAllowed('seeds', { env: {}, argv: ['node', 'x'] })).toThrow(/--confirm/);
  });

  it('con --confirm oppure CONFIRM_DESTRUCTIVE=yes (fuori produzione): consentiti', () => {
    expect(() => assertDestructiveAllowed('seeds', { env: {}, argv: ['node', 'x', '--confirm'] })).not.toThrow();
    expect(() => assertDestructiveAllowed('seeds', { env: { CONFIRM_DESTRUCTIVE: 'yes' }, argv: [] })).not.toThrow();
  });
});

describe('SEC-03 variabile del database', () => {
  it('due variabili diverse: errore', () => {
    expect(() => resolveMongoUri({ MONGO_URI: 'mongodb://a/x', MONGODB_URI: 'mongodb://b/y' })).toThrow(/diverse/);
  });

  it('una sola (o uguali): usata; nessuna: database locale', () => {
    expect(resolveMongoUri({ MONGO_URI: 'mongodb://a/x' })).toBe('mongodb://a/x');
    expect(resolveMongoUri({ MONGODB_URI: 'mongodb://b/y' })).toBe('mongodb://b/y');
    expect(resolveMongoUri({ MONGO_URI: 'mongodb://a/x', MONGODB_URI: 'mongodb://a/x' })).toBe('mongodb://a/x');
    expect(resolveMongoUri({})).toMatch(/^mongodb:\/\/localhost/);
  });

  it('i log non mostrano utente e password dell\'URI', () => {
    expect(maskMongoUri('mongodb+srv://utente:segreto@cluster.example.test/db')).toBe('mongodb+srv://***@cluster.example.test/db');
  });
});
