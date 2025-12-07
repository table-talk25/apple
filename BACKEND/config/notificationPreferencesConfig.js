/**
 * Configurazione per le preferenze di notifica
 */

const NOTIFICATION_PREFERENCES_CONFIG = {
    // 📱 Configurazione Preferenze Push
    PUSH_PREFERENCES: {
        // Categorie supportate
        CATEGORIES: {
            MEALS: 'meals',
            CHAT: 'chat',
            SOCIAL: 'social',
            SYSTEM: 'system',
            MODERATION: 'moderation'
        },

        // Tipi di notifica per categoria
        TYPES: {
            MEALS: {
                INVITATIONS: 'invitations',
                JOIN_REQUESTS: 'joinRequests',
                MEAL_UPDATES: 'mealUpdates',
                MEAL_REMINDERS: 'mealReminders',
                MEAL_CANCELLATIONS: 'mealCancellations'
            },
            CHAT: {
                NEW_MESSAGES: 'newMessages',
                TYPING_INDICATORS: 'typingIndicators',
                READ_RECEIPTS: 'readReceipts'
            },
            SOCIAL: {
                NEW_FOLLOWERS: 'newFollowers',
                PROFILE_VIEWS: 'profileViews',
                FRIEND_REQUESTS: 'friendRequests'
            },
            SYSTEM: {
                ACCOUNT_UPDATES: 'accountUpdates',
                SECURITY_ALERTS: 'securityAlerts',
                MAINTENANCE: 'maintenance',
                UPDATES: 'updates'
            },
            MODERATION: {
                REPORT_UPDATES: 'reportUpdates',
                CONTENT_APPROVALS: 'contentApprovals',
                POLICY_CHANGES: 'policyChanges'
            }
        },

        // Valori di default per ogni tipo
        DEFAULTS: {
            meals: {
                invitations: true,
                joinRequests: true,
                mealUpdates: true,
                mealReminders: true,
                mealCancellations: true
            },
            chat: {
                newMessages: true,
                typingIndicators: false,
                readReceipts: false
            },
            social: {
                newFollowers: true,
                profileViews: false,
                friendRequests: true
            },
            system: {
                accountUpdates: true,
                securityAlerts: true,
                maintenance: true,
                updates: true
            },
            moderation: {
                reportUpdates: true,
                contentApprovals: true,
                policyChanges: true
            }
        }
    },

    // 🌍 Configurazione Preferenze Geolocalizzate
    GEOLOCATION_PREFERENCES: {
        // Raggio massimo in km
        MAX_RADIUS_KM: 50,
        
        // Raggio predefinito in km
        DEFAULT_RADIUS_KM: 10,
        
        // Raggio minimo in km
        MIN_RADIUS_KM: 1,
        
        // Distanza massima predefinita in km
        DEFAULT_MAX_DISTANCE_KM: 10,
        
        // Tipi di pasto supportati
        SUPPORTED_MEAL_TYPES: ['breakfast', 'lunch', 'dinner', 'aperitif']
    },

    // 📧 Configurazione Preferenze Email
    EMAIL_PREFERENCES: {
        // Abilitato di default
        DEFAULT_ENABLED: true,
        
        // Tipi di email supportati
        SUPPORTED_TYPES: [
            'account_updates',
            'security_alerts',
            'meal_invitations',
            'meal_reminders',
            'system_maintenance',
            'policy_changes'
        ]
    },

    // 🔧 Configurazione Tecnica
    TECHNICAL: {
        // Abilita logging dettagliato
        LOGGING_ENABLED: true,
        
        // Livelli di logging
        LOG_LEVELS: {
            INFO: '📱',
            SUCCESS: '✅',
            WARNING: '⚠️',
            ERROR: '❌'
        },
        
        // Abilita validazione preferenze
        VALIDATION_ENABLED: true,
        
        // Timeout per operazioni asincrone (in ms)
        ASYNC_TIMEOUT_MS: 30000,
        
        // Numero massimo di preferenze personalizzate per utente
        MAX_CUSTOM_PREFERENCES: 100
    },

    // 🚨 Configurazione Sicurezza
    SECURITY: {
        // Abilita validazione input
        INPUT_VALIDATION_ENABLED: true,
        
        // Abilita sanitizzazione dati
        SANITIZATION_ENABLED: true,
        
        // Limiti per valori numerici
        NUMERIC_LIMITS: {
            MIN_RADIUS: 1,
            MAX_RADIUS: 50,
            MIN_DISTANCE: 1,
            MAX_DISTANCE: 50
        },
        
        // Abilita rate limiting
        RATE_LIMITING_ENABLED: true,
        
        // Numero massimo di richieste per utente al minuto
        MAX_REQUESTS_PER_MINUTE: 60
    },

    // 📊 Configurazione Analytics
    ANALYTICS: {
        // Abilita raccolta metriche
        ENABLED: true,
        
        // Metriche da tracciare
        TRACKED_METRICS: [
            'preferences_updated',
            'preferences_reset',
            'notification_tests',
            'permission_checks',
            'custom_preferences_count',
            'default_preferences_usage'
        ],
        
        // Intervallo di aggregazione in minuti
        AGGREGATION_INTERVAL_MINUTES: 60
    },

    // 🌐 Configurazione Internazionalizzazione
    I18N: {
        // Lingua predefinita
        DEFAULT_LANGUAGE: 'it',
        
        // Lingue supportate
        SUPPORTED_LANGUAGES: ['it', 'en', 'de', 'fr', 'es'],
        
        // Traduzioni per categorie
        CATEGORY_TRANSLATIONS: {
            it: {
                meals: 'Pasti',
                chat: 'Chat',
                social: 'Social',
                system: 'Sistema',
                moderation: 'Moderazione'
            },
            en: {
                meals: 'Meals',
                chat: 'Chat',
                social: 'Social',
                system: 'System',
                moderation: 'Moderation'
            },
            de: {
                meals: 'Mahlzeiten',
                chat: 'Chat',
                social: 'Sozial',
                system: 'System',
                moderation: 'Moderation'
            },
            fr: {
                meals: 'Repas',
                chat: 'Chat',
                social: 'Social',
                system: 'Système',
                moderation: 'Modération'
            },
            es: {
                meals: 'Comidas',
                chat: 'Chat',
                social: 'Social',
                system: 'Sistema',
                moderation: 'Moderación'
            }
        },

        // Traduzioni per tipi di notifica
        TYPE_TRANSLATIONS: {
            it: {
                invitations: 'Inviti',
                joinRequests: 'Richieste di partecipazione',
                mealUpdates: 'Aggiornamenti pasti',
                mealReminders: 'Promemoria pasti',
                mealCancellations: 'Cancellazioni pasti',
                newMessages: 'Nuovi messaggi',
                typingIndicators: 'Indicatori "sta scrivendo"',
                readReceipts: 'Conferme di lettura',
                newFollowers: 'Nuovi follower',
                profileViews: 'Visualizzazioni profilo',
                friendRequests: 'Richieste di amicizia',
                accountUpdates: 'Aggiornamenti account',
                securityAlerts: 'Allerte di sicurezza',
                maintenance: 'Manutenzione sistema',
                updates: 'Aggiornamenti app',
                reportUpdates: 'Aggiornamenti segnalazioni',
                contentApprovals: 'Approvazioni contenuti',
                policyChanges: 'Cambiamenti policy'
            },
            en: {
                invitations: 'Invitations',
                joinRequests: 'Join requests',
                mealUpdates: 'Meal updates',
                mealReminders: 'Meal reminders',
                mealCancellations: 'Meal cancellations',
                newMessages: 'New messages',
                typingIndicators: 'Typing indicators',
                readReceipts: 'Read receipts',
                newFollowers: 'New followers',
                profileViews: 'Profile views',
                friendRequests: 'Friend requests',
                accountUpdates: 'Account updates',
                securityAlerts: 'Security alerts',
                maintenance: 'System maintenance',
                updates: 'App updates',
                reportUpdates: 'Report updates',
                contentApprovals: 'Content approvals',
                policyChanges: 'Policy changes'
            }
        }
    },

    // 📱 Configurazione Frontend
    FRONTEND: {
        // Abilita interfaccia utente per preferenze
        UI_ENABLED: true,
        
        // Componenti UI disponibili
        AVAILABLE_COMPONENTS: [
            'NotificationPreferencesPanel',
            'GeolocationSettings',
            'PushPreferencesGrid',
            'EmailPreferencesSection',
            'PreferencesResetButton',
            'TestNotificationButton'
        ],
        
        // Layout predefinito
        DEFAULT_LAYOUT: 'grid',
        
        // Temi supportati
        SUPPORTED_THEMES: ['light', 'dark', 'auto'],
        
        // Responsive breakpoints
        BREAKPOINTS: {
            mobile: 768,
            tablet: 1024,
            desktop: 1200
        }
    },

    // 🔄 Configurazione Migrazione
    MIGRATION: {
        // Abilita migrazione automatica preferenze
        AUTO_MIGRATION_ENABLED: true,
        
        // Versione schema corrente
        CURRENT_SCHEMA_VERSION: '2.0.0',
        
        // Script di migrazione disponibili
        AVAILABLE_MIGRATIONS: [
            'v1_to_v2_preferences',
            'add_geolocation_preferences',
            'add_social_preferences',
            'add_moderation_preferences'
        ],
        
        // Backup automatico prima della migrazione
        AUTO_BACKUP_ENABLED: true,
        
        // Rollback automatico in caso di errore
        AUTO_ROLLBACK_ENABLED: true
    }
};

module.exports = NOTIFICATION_PREFERENCES_CONFIG;
