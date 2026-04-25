// File: BACKEND/config/reportNotificationConfig.js

/**
 * Configurazione per le notifiche email delle segnalazioni
 */
const REPORT_NOTIFICATION_CONFIG = {
    // 📧 Configurazione Email
    EMAIL: {
        // Email degli amministratori che ricevono le notifiche
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'infotabletalk.app@gmail.com',
        
        // URL della dashboard amministrativa
        ADMIN_DASHBOARD_URL: process.env.ADMIN_DASHBOARD_URL || 'https://tabletalk.app/admin/reports',
        
        // Nome del mittente
        FROM_NAME: 'TableTalk - Sistema Segnalazioni',
        
        // Priorità email (high, normal, low)
        PRIORITY: 'high'
    },

    // ⏰ Configurazione Temporale
    TIMING: {
        // Invia notifica immediata per nuove segnalazioni
        IMMEDIATE_NOTIFICATION: true,
        
        // Invia notifica per aggiornamenti di stato
        STATUS_UPDATE_NOTIFICATION: true,
        
        // Invia notifica per segnalazioni urgenti
        URGENT_NOTIFICATION: true,
        
        // Invia riepilogo giornaliero
        DAILY_SUMMARY: true,
        
        // Orario per il riepilogo giornaliero (formato 24h)
        DAILY_SUMMARY_TIME: '09:00',
        
        // Fuso orario per il riepilogo
        TIMEZONE: 'Europe/Rome'
    },

    // 🚨 Configurazione Priorità
    PRIORITY: {
        // Punteggi per determinare la priorità
        SCORES: {
            HARASSMENT: 3,           // Molestie
            INAPPROPRIATE: 3,        // Contenuto inappropriato
            SPAM: 2,                 // Spam
            FAKE_PROFILE: 2,         // Profilo falso
            MEAL_ISSUE: 1,           // Problema pasto
            CHAT_ISSUE: 1,           // Problema chat
            VIDEO_CALL_ISSUE: 1,     // Problema in videochiamata
            GENERAL: 0                // Generale
        },
        
        // Soglie per le priorità
        THRESHOLDS: {
            HIGH: 5,                 // Priorità alta
            MEDIUM: 3                // Priorità media
        },
        
        // Testi per le priorità
        LABELS: {
            HIGH: 'Alta',
            MEDIUM: 'Media',
            LOW: 'Bassa'
        }
    },

    // 📊 Configurazione Segnalazioni Urgenti
    URGENT: {
        // Numero minimo di segnalazioni per considerare urgente
        MIN_REPORTS_THRESHOLD: 3,
        
        // Periodo di tempo per considerare le segnalazioni (in ore)
        TIME_WINDOW_HOURS: 24,
        
        // Invia notifica per utenti con multiple segnalazioni
        ENABLE_MULTIPLE_REPORTS_ALERT: true
    },

    // 🔔 Configurazione Notifiche
    NOTIFICATIONS: {
        // Nuove segnalazioni
        NEW_REPORT: {
            ENABLED: true,
            TEMPLATE: 'new-report-notification',
            SUBJECT_PREFIX: '🚨 Nuova Segnalazione TableTalk'
        },
        
        // Aggiornamenti di stato
        STATUS_UPDATE: {
            ENABLED: true,
            TEMPLATE: 'report-status-update',
            SUBJECT_PREFIX: '📋 Aggiornamento Segnalazione TableTalk'
        },
        
        // Segnalazioni urgenti
        URGENT: {
            ENABLED: true,
            TEMPLATE: 'urgent-reports-notification',
            SUBJECT_PREFIX: '🚨 URGENTE: Multiple Segnalazioni'
        },
        
        // Riepilogo giornaliero
        DAILY_SUMMARY: {
            ENABLED: true,
            TEMPLATE: 'daily-report-summary',
            SUBJECT_PREFIX: '📊 Riepilogo Giornaliero Segnalazioni TableTalk'
        }
    },

    // 📝 Configurazione Logging
    LOGGING: {
        ENABLED: true,
        LEVELS: {
            INFO: '📧',
            SUCCESS: '✅',
            WARNING: '⚠️',
            ERROR: '❌'
        },
        
        // Log per invio email
        EMAIL_SENT: true,
        
        // Log per errori email
        EMAIL_ERRORS: true,
        
        // Log per notifiche urgenti
        URGENT_NOTIFICATIONS: true
    },

    // 🎨 Configurazione Template
    TEMPLATES: {
        // Colori per le priorità
        COLORS: {
            HIGH: '#dc3545',         // Rosso
            MEDIUM: '#ffc107',       // Giallo
            LOW: '#28a745'           // Verde
        },
        
        // Stili per le email
        STYLES: {
            PRIMARY_COLOR: '#dc3545',
            SECONDARY_COLOR: '#17a2b8',
            SUCCESS_COLOR: '#28a745',
            WARNING_COLOR: '#ffc107',
            DANGER_COLOR: '#dc3545'
        }
    },

    // 🔧 Configurazione Tecnica
    TECHNICAL: {
        // Timeout per l'invio email (in millisecondi)
        EMAIL_TIMEOUT: 30000,
        
        // Numero massimo di tentativi per email fallite
        MAX_RETRY_ATTEMPTS: 3,
        
        // Delay tra tentativi (in millisecondi)
        RETRY_DELAY: 5000,
        
        // Abilita fallback per email fallite
        ENABLE_FALLBACK: true
    },

    // 🌐 Configurazione Internazionalizzazione
    I18N: {
        // Lingua predefinita per le email
        DEFAULT_LANGUAGE: 'it',
        
        // Lingue supportate
        SUPPORTED_LANGUAGES: ['it', 'en', 'es', 'fr', 'de', 'ar', 'zh', 'ja'],
        
        // Formato data predefinito
        DATE_FORMAT: 'it-IT',
        
        // Formato ora predefinito
        TIME_FORMAT: 'it-IT'
    }
};

module.exports = REPORT_NOTIFICATION_CONFIG;
