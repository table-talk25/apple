const xss = require('xss');

/**
 * 🛡️ SERVIZIO SANITIZZAZIONE BACKEND
 * Protegge da attacchi XSS sanitizzando tutti gli input utente
 */

// Configurazione XSS per massima sicurezza
const XSS_CONFIG = {
  whiteList: {}, // Nessun tag HTML permesso
  stripIgnoreTag: true, // Rimuovi tutti i tag non permessi
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'], // Rimuovi contenuto di tag pericolosi
  allowCommentTag: false, // Non permettere commenti HTML
  css: false, // Non permettere CSS inline
  allowList: [], // Nessun attributo permesso
  onTag: function(tag, html, options) {
    // Log per debugging (solo in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🛡️ [SanitizationService] Tag HTML rimosso: ${tag}`);
    }
    return '';
  }
};

/**
 * 🧹 Sanitizza una stringa rimuovendo HTML e JavaScript pericoloso
 * @param {string} input - Stringa da sanitizzare
 * @returns {string} - Stringa sanitizzata
 */
const sanitizeString = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  try {
    // Sanitizza la stringa
    const sanitized = xss(input, XSS_CONFIG);
    
    // Log per debugging (solo in development)
    if (process.env.NODE_ENV === 'development' && sanitized !== input) {
      console.log('🛡️ [SanitizationService] Stringa sanitizzata:', {
        original: input,
        sanitized: sanitized,
        removed: input.length - sanitized.length
      });
    }

    return sanitized;
  } catch (error) {
    console.error('❌ [SanitizationService] Errore sanitizzazione:', error);
    // In caso di errore, ritorna stringa vuota per sicurezza
    return '';
  }
};

/**
 * 🔒 Sanitizza un oggetto rimuovendo HTML da tutti i campi di testo
 * @param {Object} obj - Oggetto da sanitizzare
 * @param {Array} textFields - Array di nomi campi da sanitizzare
 * @returns {Object} - Oggetto sanitizzato
 */
const sanitizeObject = (obj, textFields = []) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  // Se non sono specificati campi, sanitizza tutti i campi stringa
  const fieldsToSanitize = textFields.length > 0 
    ? textFields 
    : Object.keys(obj).filter(key => typeof obj[key] === 'string');

  fieldsToSanitize.forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeString(sanitized[field]);
    }
  });

  return sanitized;
};

/**
 * 🧹 Sanitizza un array di stringhe
 * @param {Array} array - Array di stringhe da sanitizzare
 * @returns {Array} - Array sanitizzato
 */
const sanitizeArray = (array) => {
  if (!Array.isArray(array)) {
    return [];
  }

  return array.map(item => {
    if (typeof item === 'string') {
      return sanitizeString(item);
    }
    return item;
  });
};

/**
 * 🔍 Valida se una stringa contiene HTML o JavaScript pericoloso
 * @param {string} input - Stringa da validare
 * @returns {boolean} - true se contiene contenuto pericoloso
 */
const containsDangerousContent = (input) => {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Pattern per rilevare HTML e JavaScript pericoloso
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, // Iframe tags
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, // Object tags
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, // Embed tags
    /javascript:/gi, // JavaScript protocol
    /vbscript:/gi, // VBScript protocol
    /data:/gi, // Data protocol
    /on\w+\s*=/gi, // Event handlers
    /<.*>/g, // Qualsiasi tag HTML
  ];

  return dangerousPatterns.some(pattern => pattern.test(input));
};

/**
 * 🛡️ Sanitizza input per form di creazione pasti
 * @param {Object} mealData - Dati del pasto da sanitizzare
 * @returns {Object} - Dati sanitizzati
 */
const sanitizeMealData = (mealData) => {
  const textFields = ['title', 'description', 'language', 'topics'];
  
  return sanitizeObject(mealData, textFields);
};

/**
 * 🛡️ Sanitizza input per profilo utente
 * @param {Object} profileData - Dati del profilo da sanitizzare
 * @returns {Object} - Dati sanitizzati
 */
const sanitizeProfileData = (profileData) => {
  const textFields = ['nickname', 'bio', 'interests', 'languages', 'preferredCuisine'];
  
  return sanitizeObject(profileData, textFields);
};

/**
 * 🛡️ Sanitizza input per messaggi chat
 * @param {Object} messageData - Dati del messaggio da sanitizzare
 * @returns {Object} - Dati sanitizzati
 */
const sanitizeMessageData = (messageData) => {
  const textFields = ['content'];
  
  return sanitizeObject(messageData, textFields);
};

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeArray,
  containsDangerousContent,
  sanitizeMealData,
  sanitizeProfileData,
  sanitizeMessageData,
};
