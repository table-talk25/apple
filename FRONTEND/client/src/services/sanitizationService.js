import DOMPurify from 'dompurify';

/**
 * 🛡️ SERVIZIO SANITIZZAZIONE FRONTEND
 * Protegge da attacchi XSS sanitizzando tutti gli input utente
 */

// Configurazione DOMPurify per massima sicurezza
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [], // Nessun tag HTML permesso
  ALLOWED_ATTR: [], // Nessun attributo permesso
  ALLOW_DATA_ATTR: false, // Non permettere data attributes
  ALLOW_UNKNOWN_PROTOCOLS: false, // Non permettere protocolli sconosciuti
  RETURN_DOM: false, // Ritorna stringa, non DOM
  RETURN_DOM_FRAGMENT: false, // Non ritornare frammenti DOM
  RETURN_TRUSTED_TYPE: false, // Non ritornare trusted types
  KEEP_CONTENT: false, // Non mantenere contenuto non permesso
  IN_PLACE: false, // Non modificare l'originale
  SANITIZE_DOM: true, // Sanitizza il DOM se necessario
  WHOLE_DOCUMENT: false, // Non sanitizzare tutto il documento
  RETURN_DOM_IMPORT: false, // Non importare DOM
  FORCE_BODY: false, // Non forzare body tag
  SANITIZE_NAMED_PROPS: false, // Non sanitizzare named properties
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i, // Solo protocolli sicuri
};

/**
 * 🧹 Sanitizza una stringa rimuovendo HTML e JavaScript pericoloso
 * @param {string} input - Stringa da sanitizzare
 * @param {boolean} allowBasicFormatting - Permette formattazione base (false per massima sicurezza)
 * @returns {string} - Stringa sanitizzata
 */
export const sanitizeString = (input, allowBasicFormatting = false) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  try {
    // Configurazione personalizzata per formattazione base se richiesto
    const config = allowBasicFormatting 
      ? {
          ...PURIFY_CONFIG,
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u'], // Solo formattazione base
          ALLOWED_ATTR: [], // Nessun attributo
        }
      : PURIFY_CONFIG;

    // Sanitizza la stringa
    const sanitized = DOMPurify.sanitize(input, config);
    
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
 * @param {boolean} allowBasicFormatting - Permette formattazione base
 * @returns {Object} - Oggetto sanitizzato
 */
export const sanitizeObject = (obj, textFields = [], allowBasicFormatting = false) => {
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
      sanitized[field] = sanitizeString(sanitized[field], allowBasicFormatting);
    }
  });

  return sanitized;
};

/**
 * 🧹 Sanitizza un array di stringhe
 * @param {Array} array - Array di stringhe da sanitizzare
 * @param {boolean} allowBasicFormatting - Permette formattazione base
 * @returns {Array} - Array sanitizzato
 */
export const sanitizeArray = (array, allowBasicFormatting = false) => {
  if (!Array.isArray(array)) {
    return [];
  }

  return array.map(item => {
    if (typeof item === 'string') {
      return sanitizeString(item, allowBasicFormatting);
    }
    return item;
  });
};

/**
 * 🔍 Valida se una stringa contiene HTML o JavaScript pericoloso
 * @param {string} input - Stringa da validare
 * @returns {boolean} - true se contiene contenuto pericoloso
 */
export const containsDangerousContent = (input) => {
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
 * 
 * Nota: I campi numerici (es. estimatedCost, duration, maxParticipants) non vengono sanitizzati
 * perché non sono stringhe, ma vengono mantenuti nell'oggetto risultante.
 */
export const sanitizeMealData = (mealData) => {
  const textFields = ['title', 'description', 'language', 'topics'];
  
  return sanitizeObject(mealData, textFields, false);
};

/**
 * 🛡️ Sanitizza input per profilo utente
 * @param {Object} profileData - Dati del profilo da sanitizzare
 * @returns {Object} - Dati sanitizzati
 */
export const sanitizeProfileData = (profileData) => {
  const textFields = ['nickname', 'bio', 'interests', 'languages', 'preferredCuisine'];
  
  return sanitizeObject(profileData, textFields, false);
};

/**
 * 🛡️ Sanitizza input per messaggi chat
 * @param {Object} messageData - Dati del messaggio da sanitizzare
 * @returns {Object} - Dati sanitizzati
 */
export const sanitizeMessageData = (messageData) => {
  const textFields = ['content'];
  
  return sanitizeObject(messageData, textFields, false);
};

// Esporta tutte le funzioni
export default {
  sanitizeString,
  sanitizeObject,
  sanitizeArray,
  containsDangerousContent,
  sanitizeMealData,
  sanitizeProfileData,
  sanitizeMessageData,
};
