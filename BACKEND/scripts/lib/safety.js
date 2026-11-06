// Controlli di sicurezza condivisi dagli script di manutenzione (SEC-03).
// Funzioni pure: non si connettono a nessun database.

const MIN_PASSWORD_LENGTH = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Credenziali dell'admin SOLO da variabili d'ambiente (mai nel sorgente).
 * @returns {{ email: string, password: string }}
 */
function readAdminCredentials(env = process.env) {
  const email = (env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = env.ADMIN_PASSWORD || '';
  if (!email || !password) {
    throw new Error('Variabili ADMIN_EMAIL e ADMIN_PASSWORD obbligatorie: nessuna credenziale predefinita.');
  }
  if (!EMAIL_RE.test(email)) {
    throw new Error('ADMIN_EMAIL non è un indirizzo email valido.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`);
  }
  return { email, password };
}

/** Password degli utenti di test dei seed, solo da variabile d'ambiente. */
function readSeedPassword(env = process.env) {
  const password = env.SEED_USER_PASSWORD || '';
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`SEED_USER_PASSWORD obbligatoria (almeno ${MIN_PASSWORD_LENGTH} caratteri): nessuna password predefinita.`);
  }
  return password;
}

/**
 * Rifiuta l'esecuzione in produzione e senza conferma esplicita
 * (`--confirm` oppure CONFIRM_DESTRUCTIVE=yes).
 */
function assertDestructiveAllowed(scriptName, { env = process.env, argv = process.argv } = {}) {
  if (env.NODE_ENV === 'production') {
    throw new Error(`${scriptName}: esecuzione rifiutata con NODE_ENV=production.`);
  }
  const confirmed = argv.includes('--confirm') || env.CONFIRM_DESTRUCTIVE === 'yes';
  if (!confirmed) {
    throw new Error(`${scriptName}: operazione distruttiva. Aggiungi --confirm oppure CONFIRM_DESTRUCTIVE=yes per procedere.`);
  }
}

/**
 * Un solo nome di variabile per il database: MONGO_URI (usata dall'app).
 * MONGODB_URI è accettata solo se coincide con MONGO_URI o se MONGO_URI manca.
 * Senza nessuna delle due: database locale di sviluppo.
 */
function resolveMongoUri(env = process.env) {
  const a = env.MONGO_URI;
  const b = env.MONGODB_URI;
  if (a && b && a !== b) {
    throw new Error('MONGO_URI e MONGODB_URI sono entrambe definite e diverse: ne serve una sola (MONGO_URI).');
  }
  return a || b || 'mongodb://localhost:27017/TableTalk';
}

/** Maschera utente e password in un URI di connessione prima di scriverlo nei log. */
function maskMongoUri(uri) {
  return String(uri).replace(/\/\/([^@/]+)@/, '//***@');
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  readAdminCredentials,
  readSeedPassword,
  assertDestructiveAllowed,
  resolveMongoUri,
  maskMongoUri,
};
