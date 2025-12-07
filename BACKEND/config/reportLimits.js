/**
 * Configurazione dei limiti per le segnalazioni
 * Questi valori possono essere modificati per adattarsi alle esigenze dell'app
 */

const REPORT_LIMITS = {
    // Limite giornaliero di segnalazioni per utente
    DAILY_LIMIT: 5,
    
    // Limite settimanale di segnalazioni per utente
    WEEKLY_LIMIT: 20,
    
    // Numero massimo di segnalazioni pendenti per utente segnalato
    // (oltre questo numero, le nuove segnalazioni vengono loggate per attenzione)
    MAX_PENDING_PER_USER: 10,
    
    // Intervalli di tempo per i controlli (in millisecondi)
    INTERVALS: {
        DAY: 24 * 60 * 60 * 1000,        // 24 ore
        WEEK: 7 * 24 * 60 * 60 * 1000,   // 7 giorni
        MONTH: 30 * 24 * 60 * 60 * 1000  // 30 giorni
    },
    
    // Messaggi di errore personalizzabili
    MESSAGES: {
        DAILY_LIMIT_EXCEEDED: 'Hai raggiunto il limite giornaliero di segnalazioni ({{limit}}). Riprova domani.',
        WEEKLY_LIMIT_EXCEEDED: 'Hai raggiunto il limite settimanale di segnalazioni ({{limit}}). Se hai bisogno di assistenza, contatta il supporto.',
        ALREADY_REPORTED_PENDING: 'Hai già una segnalazione aperta per questo utente. Il nostro team la esaminerà al più presto.',
        ALREADY_REPORTED_RECENT: 'Hai già segnalato questo utente nelle ultime 24 ore. Se hai nuove informazioni, contatta il supporto.',
        SELF_REPORT: 'Non puoi segnalare te stesso.',
        USER_NOT_FOUND: 'Utente segnalato non trovato.',
        SUCCESS: 'Segnalazione inviata con successo. Il nostro team la esaminerà al più presto.'
    },
    
    // Configurazione per il logging
    LOGGING: {
        ENABLED: true,
        LEVELS: {
            INFO: '✅',
            WARNING: '⚠️',
            ERROR: '🚨',
            BLOCKED: '🚫'
        }
    }
};

module.exports = REPORT_LIMITS;
