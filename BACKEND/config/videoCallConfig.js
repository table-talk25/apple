/**
 * Configurazione per i controlli temporali delle videochiamate
 * Questi valori possono essere modificati per adattarsi alle esigenze dell'app
 */

const VIDEO_CALL_CONFIG = {
    // Controlli temporali
    TIMING: {
        // Minuti prima dell'inizio del pasto in cui la videochiamata diventa accessibile
        MINUTES_BEFORE_START: 10,
        
        // Minuti dopo la fine del pasto in cui la videochiamata rimane accessibile
        MINUTES_AFTER_END: 15,
        
        // Intervallo di controllo per la validazione (in millisecondi)
        VALIDATION_INTERVAL: 60000, // 1 minuto
    },
    
    // Messaggi di errore personalizzabili
    MESSAGES: {
        NOT_VIRTUAL_MEAL: 'Questa non è una videochiamata virtuale',
        NOT_AUTHORIZED: 'Non sei autorizzato a partecipare a questa videochiamata',
        CALL_ENDED: 'Questa videochiamata è terminata.',
        CALL_NOT_AVAILABLE: 'La videochiamata non è ancora disponibile.',
        TOO_EARLY: 'La videochiamata può essere accessibile solo {{minutes}} minuti prima dell\'orario di inizio.',
        TOO_LATE: 'La videochiamata non è più disponibile.',
        MEAL_NOT_FOUND: 'Pasto non trovato con id {{mealId}}',
        TOKEN_GENERATED: 'Token generato con successo per utente {{user}} nel pasto {{mealId}}',
        CALL_ENDED_SUCCESS: 'Videochiamata terminata con successo.',
        HOST_ONLY_END: 'Solo l\'host può terminare la chiamata.',
        MEAL_NOT_FOUND_END: 'Pasto non trovato'
    },
    
    // Configurazione per il logging
    LOGGING: {
        ENABLED: true,
        LEVELS: {
            INFO: 'ℹ️',
            SUCCESS: '✅',
            WARNING: '⚠️',
            ERROR: '🚨',
            BLOCKED: '🚫'
        },
        PREFIX: '[VideoCall]'
    },
    
    // Configurazione per Twilio
    TWILIO: {
        // Nome della stanza (usa l'ID del pasto)
        ROOM_NAME_PREFIX: '',
        ROOM_NAME_SUFFIX: '',
        
        // Configurazione token
        TOKEN_EXPIRY: 3600, // 1 ora in secondi
        IDENTITY_FALLBACK: 'anonymous' // Identità di fallback se nickname non disponibile
    },
    
    // Configurazione per la sicurezza
    SECURITY: {
        // Verifica che l'utente sia un partecipante
        CHECK_PARTICIPANT: true,
        
        // Verifica che il pasto sia virtuale
        CHECK_MEAL_TYPE: true,
        
        // Verifica lo stato della videochiamata
        CHECK_CALL_STATUS: true,
        
        // Verifica temporale
        CHECK_TIMING: true,
        
        // Verifica che solo l'host possa terminare
        HOST_ONLY_END: true
    }
};

module.exports = VIDEO_CALL_CONFIG;
