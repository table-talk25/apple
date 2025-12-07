/**
 * Configurazione per le notifiche interattive con deep link e azioni rapide
 */

const INTERACTIVE_NOTIFICATION_CONFIG = {
    // 🎯 Configurazione Generale
    GENERAL: {
        // Abilita notifiche interattive
        ENABLED: true,
        
        // Versione del sistema
        VERSION: '1.0.0',
        
        // Nome del sistema
        SYSTEM_NAME: 'TableTalk Interactive Notifications',
        
        // Descrizione
        DESCRIPTION: 'Sistema di notifiche interattive con deep link e azioni rapide'
    },

    // 📱 Configurazione Piattaforme
    PLATFORMS: {
        // Android
        ANDROID: {
            // Canali di notifica
            CHANNELS: {
                INTERACTIVE: {
                    id: 'tabletalk-interactive',
                    name: 'Notifiche Interattive',
                    description: 'Notifiche con azioni rapide e deep link',
                    importance: 'high',
                    sound: 'default',
                    vibrate: [0, 250, 250, 250],
                    lights: [0, 1, 3000, 6000],
                    showBadge: true
                },
                GENERAL: {
                    id: 'tabletalk-general',
                    name: 'Notifiche Generali',
                    description: 'Notifiche standard senza azioni',
                    importance: 'default',
                    sound: 'default',
                    vibrate: false,
                    lights: false,
                    showBadge: true
                }
            },
            
            // Configurazione intent
            INTENT: {
                scheme: 'tabletalk',
                host: 'app',
                action: 'VIEW'
            },
            
            // Configurazione azioni
            ACTIONS: {
                maxActions: 3,
                actionTimeout: 30000, // 30 secondi
                requireUserInteraction: true
            }
        },

        // iOS
        IOS: {
            // Categorie di notifica
            CATEGORIES: {
                INTERACTIVE: {
                    identifier: 'tabletalk-interactive',
                    actions: [
                        {
                            identifier: 'accept',
                            title: 'Accetta',
                            options: ['foreground']
                        },
                        {
                            identifier: 'decline',
                            title: 'Rifiuta',
                            options: ['destructive']
                        },
                        {
                            identifier: 'view',
                            title: 'Visualizza',
                            options: ['foreground']
                        }
                    ]
                }
            },
            
            // Configurazione badge
            BADGE: {
                enabled: true,
                autoIncrement: true,
                maxCount: 99
            },
            
            // Configurazione suoni
            SOUND: {
                default: 'default',
                custom: 'tabletalk-notification.wav'
            }
        },

        // Web
        WEB: {
            // Configurazione Service Worker
            SERVICE_WORKER: {
                scope: '/',
                updateViaCache: 'none'
            },
            
            // Configurazione notifiche
            NOTIFICATIONS: {
                requireInteraction: true,
                silent: false,
                tag: 'tabletalk-interactive',
                renotify: true,
                actions: {
                    maxActions: 3,
                    actionTimeout: 30000
                }
            },
            
            // Configurazione deep link
            DEEP_LINK: {
                baseUrl: process.env.APP_BASE_URL || 'https://tabletalk.app',
                scheme: 'tabletalk://',
                fallback: true
            }
        }
    },

    // 🔗 Configurazione Deep Link
    DEEP_LINKS: {
        // URL base per deep link
        BASE_URL: process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'https://tabletalk.app',
        
        // Protocollo personalizzato
        CUSTOM_SCHEME: 'tabletalk://',
        
        // Fallback per dispositivi senza app
        FALLBACK_ENABLED: true,
        
        // Timeout per deep link
        TIMEOUT: 5000,
        
        // Retry per deep link falliti
        RETRY: {
            enabled: true,
            maxAttempts: 3,
            delay: 1000
        }
    },

    // ⚡ Configurazione Azioni
    ACTIONS: {
        // Azioni supportate per ogni tipo di notifica
        SUPPORTED_ACTIONS: {
            // Azioni generali
            GENERAL: [
                'view',
                'dismiss',
                'snooze'
            ],
            
            // Azioni per pasti
            MEALS: [
                'accept',
                'decline',
                'view',
                'join',
                'leave',
                'update'
            ],
            
            // Azioni per chat
            CHAT: [
                'reply',
                'view',
                'mute',
                'unmute'
            ],
            
            // Azioni per social
            SOCIAL: [
                'follow',
                'unfollow',
                'accept',
                'decline',
                'view_profile'
            ]
        },

        // Timeout per azioni
        TIMEOUT: {
            DEFAULT: 30000,        // 30 secondi
            URGENT: 15000,         // 15 secondi
            REMINDER: 60000        // 1 minuto
        },

        // Configurazione azioni rapide
        QUICK_ACTIONS: {
            enabled: true,
            maxActions: 3,
            showIcons: true,
            showText: true,
            requireConfirmation: false
        }
    },

    // 🎨 Configurazione UI
    UI: {
        // Icone per azioni
        ACTION_ICONS: {
            accept: '✅',
            decline: '❌',
            view: '👁️',
            reply: '↩️',
            join: '🎯',
            leave: '🚪',
            follow: '👥',
            unfollow: '🚫',
            mute: '🔇',
            unmute: '🔊',
            snooze: '⏸️',
            dismiss: '🚫',
            update: '📝',
            profile: '👤'
        },

        // Colori per tipi di notifica
        NOTIFICATION_COLORS: {
            meal_invitation: '#28a745',      // Verde per inviti
            meal_join_request: '#17a2b8',    // Azzurro per richieste
            meal_update: '#ffc107',          // Giallo per aggiornamenti
            meal_reminder: '#dc3545',        // Rosso per promemoria
            meal_cancellation: '#6c757d',    // Grigio per cancellazioni
            new_message: '#007bff',          // Blu per messaggi
            new_follower: '#6f42c1',         // Viola per follower
            friend_request: '#fd7e14',       // Arancione per amicizie
            nearby_meal: '#20c997',          // Verde acqua per vicinanze
            system: '#6c757d',               // Grigio per sistema
            security: '#dc3545',             // Rosso per sicurezza
            maintenance: '#ffc107'           // Giallo per manutenzione
        },

        // Emoji per tipi di notifica
        NOTIFICATION_EMOJIS: {
            meal_invitation: '🍽️',
            meal_join_request: '🙋‍♂️',
            meal_update: '📝',
            meal_reminder: '⏰',
            meal_cancellation: '🚫',
            new_message: '💬',
            new_follower: '👥',
            friend_request: '🤝',
            nearby_meal: '📍',
            system: '⚙️',
            security: '🛡️',
            maintenance: '🔧'
        }
    },

    // 📊 Configurazione Analytics
    ANALYTICS: {
        // Abilita tracking delle azioni
        TRACKING_ENABLED: true,
        
        // Eventi da tracciare
        TRACKED_EVENTS: [
            'notification_received',
            'notification_opened',
            'action_clicked',
            'deep_link_followed',
            'action_completed',
            'action_failed',
            'fallback_used'
        ],
        
        // Metriche di performance
        PERFORMANCE_METRICS: [
            'notification_delivery_time',
            'action_response_time',
            'deep_link_success_rate',
            'user_engagement_rate'
        ]
    },

    // 🔧 Configurazione Tecnica
    TECHNICAL: {
        // Logging
        LOGGING: {
            enabled: true,
            level: 'info',
            includePayload: false,
            includeUserData: false
        },

        // Caching
        CACHING: {
            enabled: true,
            ttl: 300000, // 5 minuti
            maxSize: 1000
        },

        // Rate Limiting
        RATE_LIMITING: {
            enabled: true,
            maxRequestsPerMinute: 60,
            maxNotificationsPerUser: 10
        },

        // Retry Logic
        RETRY: {
            enabled: true,
            maxAttempts: 3,
            backoffMultiplier: 2,
            initialDelay: 1000
        }
    },

    // 🌐 Configurazione Internazionalizzazione
    I18N: {
        // Lingua predefinita
        DEFAULT_LANGUAGE: 'it',
        
        // Lingue supportate
        SUPPORTED_LANGUAGES: ['it', 'en', 'de', 'fr', 'es'],
        
        // Traduzioni per azioni
        ACTION_TRANSLATIONS: {
            it: {
                accept: 'Accetta',
                decline: 'Rifiuta',
                view: 'Visualizza',
                reply: 'Rispondi',
                join: 'Partecipa',
                leave: 'Lascia',
                follow: 'Segui',
                unfollow: 'Non seguire',
                mute: 'Silenzia',
                unmute: 'Riattiva',
                snooze: 'Rimanda',
                dismiss: 'Ignora',
                update: 'Aggiorna',
                profile: 'Profilo'
            },
            en: {
                accept: 'Accept',
                decline: 'Decline',
                view: 'View',
                reply: 'Reply',
                join: 'Join',
                leave: 'Leave',
                follow: 'Follow',
                unfollow: 'Unfollow',
                mute: 'Mute',
                unmute: 'Unmute',
                snooze: 'Snooze',
                dismiss: 'Dismiss',
                update: 'Update',
                profile: 'Profile'
            }
        }
    },

    // 🚀 Configurazione Performance
    PERFORMANCE: {
        // Ottimizzazioni
        OPTIMIZATIONS: {
            batchProcessing: true,
            parallelExecution: true,
            connectionPooling: true,
            compression: true
        },

        // Timeout
        TIMEOUTS: {
            notificationSend: 10000,    // 10 secondi
            actionExecution: 15000,     // 15 secondi
            deepLinkFollow: 5000,       // 5 secondi
            userResponse: 300000        // 5 minuti
        },

        // Limiti
        LIMITS: {
            maxConcurrentNotifications: 100,
            maxActionsPerNotification: 5,
            maxDeepLinksPerUser: 50,
            maxNotificationsPerBatch: 1000
        }
    }
};

module.exports = INTERACTIVE_NOTIFICATION_CONFIG;
