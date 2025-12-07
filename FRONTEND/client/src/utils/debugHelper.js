// File: src/utils/debugHelper.js
// Utilità per il debug e la gestione degli errori

/**
 * Logger sicuro che non causa crash
 */
export const safeLog = (level, message, data = null) => {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    switch (level.toLowerCase()) {
      case 'error':
        console.error(logMessage, data);
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'info':
        console.info(logMessage, data);
        break;
      default:
        console.log(logMessage, data);
    }
  } catch (err) {
    // Se anche il logging fallisce, non fare nulla per evitare loop infiniti
    console.error('Errore nel logging:', err);
  }
};

/**
 * Verifica se l'app è in modalità debug
 */
export const isDebugMode = () => {
  try {
    return process.env.NODE_ENV === 'development' || 
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

/**
 * Verifica se l'app è su piattaforma nativa
 */
export const isNativePlatform = () => {
  try {
    return window.Capacitor && window.Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Gestisce errori in modo sicuro
 */
export const safeErrorHandler = (error, context = 'Unknown') => {
  try {
    safeLog('error', `Errore in ${context}:`, {
      message: error?.message || 'Errore sconosciuto',
      stack: error?.stack || 'Stack trace non disponibile',
      context,
      timestamp: new Date().toISOString()
    });

    // In modalità debug, mostra l'errore completo
    if (isDebugMode()) {
      console.error('Errore completo:', error);
    }
  } catch (err) {
    // Se anche la gestione dell'errore fallisce, usa console.error di base
    console.error('Errore nella gestione dell\'errore:', err);
    console.error('Errore originale:', error);
  }
};

/**
 * Verifica la connettività di rete
 */
export const checkNetworkConnectivity = async () => {
  try {
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Verifica se le API sono raggiungibili
 */
export const checkApiConnectivity = async (apiUrl) => {
  try {
    if (!apiUrl) return false;
    
    const response = await fetch(`${apiUrl}/health`, { 
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      timeout: 5000
    });
    
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Inizializza il sistema di debug
 */
export const initializeDebugSystem = () => {
  try {
    // Intercetta errori globali non gestiti
    window.addEventListener('error', (event) => {
      safeErrorHandler(event.error, 'Global Error Handler');
    });

    // Intercetta promesse rifiutate non gestite
    window.addEventListener('unhandledrejection', (event) => {
      safeErrorHandler(event.reason, 'Unhandled Promise Rejection');
    });

    safeLog('info', 'Sistema di debug inizializzato');
  } catch (err) {
    safeErrorHandler(err, 'Debug System Initialization');
  }
};

export default {
  safeLog,
  isDebugMode,
  isNativePlatform,
  safeErrorHandler,
  checkNetworkConnectivity,
  checkApiConnectivity,
  initializeDebugSystem
};
