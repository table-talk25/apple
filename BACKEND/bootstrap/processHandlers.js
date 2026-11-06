// Gestori globali di errori non intercettati.
// Nessun dato personale nei log: per errori del database non si registra il messaggio
// (può contenere valori come l'email di un duplicato), solo nome, codice e prime righe dello stack.

const SHUTDOWN_TIMEOUT_MS = 10000;
let registered = false;
let shuttingDown = false;

function describeError(error) {
  if (!error || typeof error !== 'object') {
    return { name: typeof error, note: 'valore non-Error' };
  }
  const name = error.name || 'Error';
  const info = { name };
  if (error.code !== undefined) info.code = String(error.code).slice(0, 50);
  if (!/Mongo|Mongoose|Validation|Cast/i.test(name) && typeof error.message === 'string') {
    info.message = error.message.slice(0, 200);
  }
  if (typeof error.stack === 'string') {
    info.stack = error.stack.split('\n').slice(1, 4).map((line) => line.trim()).join(' | ');
  }
  return info;
}

function gracefulExit(getServer, exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  const forceTimer = setTimeout(() => process.exit(exitCode), SHUTDOWN_TIMEOUT_MS);
  if (typeof forceTimer.unref === 'function') forceTimer.unref();
  let server = null;
  try { server = typeof getServer === 'function' ? getServer() : null; } catch (_) { server = null; }
  if (server && typeof server.close === 'function') {
    try {
      server.close(() => process.exit(exitCode));
      return;
    } catch (_) { /* si esce subito */ }
  }
  process.exit(exitCode);
}

/**
 * @param {{ getServer?: () => import('http').Server | null }} [options]
 */
function registerProcessHandlers(options = {}) {
  if (registered) return;
  registered = true;

  process.on('unhandledRejection', (reason) => {
    // Non termina il processo: la richiesta coinvolta fallisce, il server resta attivo.
    console.error('[Process] unhandledRejection:', JSON.stringify(describeError(reason)));
  });

  process.on('uncaughtException', (error) => {
    console.error('[Process] uncaughtException:', JSON.stringify(describeError(error)));
    gracefulExit(options.getServer, 1);
  });
}

module.exports = { registerProcessHandlers, describeError };
