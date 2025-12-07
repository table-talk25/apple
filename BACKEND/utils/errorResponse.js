/**
 * Classe personalizzata per gestire gli errori dell'applicazione
 * Estende la classe Error nativa di JavaScript
 */
class ErrorResponse extends Error {
  /**
   * @param {string} message - Messaggio di errore
   * @param {number} statusCode - Codice di stato HTTP
   * @param {string} [code] - Codice errore personalizzato
   * @param {Object} [details] - Dettagli aggiuntivi dell'errore
   * @param {string} [stack] - Stack trace dell'errore
   */
  constructor(message, statusCode, code = 'GENERIC_ERROR', details = null, stack = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.success = false;

    // Se viene fornito uno stack, usalo, altrimenti cattura lo stack corrente
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }

    // Imposta il nome della classe
    this.name = this.constructor.name;
  }

  /**
   * Crea un errore di validazione
   * @param {string} message - Messaggio di errore
   * @param {Object} details - Dettagli degli errori di validazione
   * @returns {ErrorResponse}
   */
  static validationError(message, details) {
    return new ErrorResponse(
      message,
      400,
      'VALIDATION_ERROR',
      details
    );
  }

  /**
   * Crea un errore di autenticazione
   * @param {string} message - Messaggio di errore
   * @returns {ErrorResponse}
   */
  static authenticationError(message = 'Non autorizzato') {
    return new ErrorResponse(
      message,
      401,
      'AUTHENTICATION_ERROR'
    );
  }

  /**
   * Crea un errore di autorizzazione
   * @param {string} message - Messaggio di errore
   * @returns {ErrorResponse}
   */
  static authorizationError(message = 'Accesso negato') {
    return new ErrorResponse(
      message,
      403,
      'AUTHORIZATION_ERROR'
    );
  }

  /**
   * Crea un errore di risorsa non trovata
   * @param {string} message - Messaggio di errore
   * @returns {ErrorResponse}
   */
  static notFoundError(message = 'Risorsa non trovata') {
    return new ErrorResponse(
      message,
      404,
      'NOT_FOUND_ERROR'
    );
  }

  /**
   * Crea un errore di conflitto
   * @param {string} message - Messaggio di errore
   * @returns {ErrorResponse}
   */
  static conflictError(message = 'Conflitto di risorse') {
    return new ErrorResponse(
      message,
      409,
      'CONFLICT_ERROR'
    );
  }

  /**
   * Crea un errore di limite rate
   * @param {string} message - Messaggio di errore
   * @returns {ErrorResponse}
   */
  static rateLimitError(message = 'Troppe richieste') {
    return new ErrorResponse(
      message,
      429,
      'RATE_LIMIT_ERROR'
    );
  }

  /**
   * Crea un errore del server
   * @param {string} message - Messaggio di errore
   * @param {Error} [error] - Errore originale
   * @returns {ErrorResponse}
   */
  static serverError(message = 'Errore interno del server', error = null) {
    return new ErrorResponse(
      message,
      500,
      'SERVER_ERROR',
      error ? { originalError: error.message } : null,
      error ? error.stack : null
    );
  }

  /**
   * Converte l'errore in un oggetto JSON
   * @returns {Object} Rappresentazione JSON dell'errore
   */
  toJSON() {
    return {
      success: this.success,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }

  /**
   * Converte l'errore in un oggetto per il logging
   * @returns {Object} Oggetto per il logging
   */
  toLog() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

module.exports = ErrorResponse;