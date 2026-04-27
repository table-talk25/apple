// File: src/utils/logger.js
//
// Shim globale per ridurre il rumore di console in produzione.
//
// Razionale (vedi review punto "8. Rumore in produzione"):
// - L'app ha ~290 chiamate `console.log/info/debug` sparse in 40+ file.
// - In dev sono utili; in prod gonfiano la console del browser (e quella
//   nativa via WebView/logcat), peggiorano performance su mobile e creano
//   rumore inutile sulla telemetria.
// - Refactor file-by-file (sostituzione con un logger custom) sarebbe enorme
//   e rischioso. Soluzione minimal-invasive: stub `console.log/info/debug`
//   in produzione, mantenendo `console.warn` e `console.error` che Sentry
//   già cattura per le sue breadcrumb / eventi.
//
// Override:
// - In development: nessun cambiamento.
// - In production (NODE_ENV === 'production'):
//     console.log   → no-op
//     console.info  → no-op
//     console.debug → no-op
//     console.warn  → invariato (resta visibile e va a Sentry)
//     console.error → invariato (resta visibile e va a Sentry)
//
// Override forzato:
// - Se l'URL contiene `?debug=1` (anche dentro l'hash di HashRouter), lascia
//   tutto invariato anche in produzione: utile per debug "in vivo".
// - Se la variabile d'ambiente `REACT_APP_VERBOSE_LOGS` è "true" al build,
//   stesso effetto.
//
// IMPORTANTE: questo modulo deve essere importato prima possibile in
// `src/index.js` (vedi `import './utils/logger';` lì).

const isProduction = process.env.NODE_ENV === 'production';
const verboseFromEnv = process.env.REACT_APP_VERBOSE_LOGS === 'true';

function hasDebugOverride() {
  if (typeof window === 'undefined') return false;
  try {
    // Cerca ?debug=1 sia nel pathname (BrowserRouter) sia dentro l'hash
    // (HashRouter: la route reale è in window.location.hash).
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    return /[?&]debug=1\b/.test(search) || /[?&]debug=1\b/.test(hash);
  } catch (_) {
    return false;
  }
}

function applyConsoleSilencing() {
  if (typeof console === 'undefined') return;
  const noop = () => {};
  // Sostituiamo solo i livelli "rumorosi". `warn` e `error` restano: Sentry
  // li intercetta come breadcrumb / eventi e l'utente sviluppatore li vede.
  try { console.log = noop; } catch (_) {}
  try { console.info = noop; } catch (_) {}
  try { console.debug = noop; } catch (_) {}
  // Una traccia minima per sapere che lo shim è attivo, usando warn che resta:
  try {
    // eslint-disable-next-line no-console
    console.warn('[logger] Production logging level: warn/error only. Use ?debug=1 to re-enable verbose logs.');
  } catch (_) {}
}

if (isProduction && !verboseFromEnv && !hasDebugOverride()) {
  applyConsoleSilencing();
}

// Esportiamo niente di significativo: lo shim è side-effect dell'import.
export {};
