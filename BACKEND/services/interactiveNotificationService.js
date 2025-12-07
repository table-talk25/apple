const pushNotificationService = require('./pushNotificationService');
const notificationPreferencesService = require('./notificationPreferencesService');

/**
 * Servizio per notifiche interattive con deep link e azioni rapide
 * Gestisce la creazione di notifiche intelligenti che portano l'utente direttamente
 * alla pagina rilevante con possibilità di azioni immediate
 */
class InteractiveNotificationService {
    constructor() {
        // Definizione dei tipi di notifica interattiva supportati
        this.INTERACTIVE_TYPES = {
            // Notifiche per pasti
            MEAL_INVITATION: 'meal_invitation',
            MEAL_JOIN_REQUEST: 'meal_join_request',
            MEAL_UPDATE: 'meal_update',
            MEAL_REMINDER: 'meal_reminder',
            MEAL_CANCELLATION: 'meal_cancellation',
            
            // Notifiche per chat
            NEW_MESSAGE: 'new_message',
            CHAT_INVITATION: 'chat_invitation',
            
            // Notifiche per social
            NEW_FOLLOWER: 'new_follower',
            FRIEND_REQUEST: 'friend_request',
            PROFILE_VIEW: 'profile_view',
            
            // Notifiche per sistema
            ACCOUNT_UPDATE: 'account_update',
            SECURITY_ALERT: 'security_alert',
            MAINTENANCE: 'maintenance',
            
            // Notifiche per moderazione
            REPORT_UPDATE: 'report_update',
            CONTENT_APPROVAL: 'content_approval',
            
            // Notifiche geolocalizzate
            NEARBY_MEAL: 'nearby_meal'
        };

        // Configurazione deep link per ogni tipo di notifica
        this.DEEP_LINK_CONFIG = {
            [this.INTERACTIVE_TYPES.MEAL_INVITATION]: {
                path: '/meals/:mealId/invitations',
                action: 'view_invitation',
                title: 'Nuovo Invito Pasto',
                body: 'Hai ricevuto un invito per {{mealTitle}}',
                icon: '🍽️',
                color: '#28a745',
                priority: 'high',
                actions: [
                    {
                        id: 'accept',
                        title: 'Accetta',
                        icon: '✅',
                        action: 'accept_invitation'
                    },
                    {
                        id: 'decline',
                        title: 'Rifiuta',
                        icon: '❌',
                        action: 'decline_invitation'
                    },
                    {
                        id: 'view',
                        title: 'Visualizza',
                        icon: '👁️',
                        action: 'view_meal'
                    }
                ]
            },
            
            [this.INTERACTIVE_TYPES.MEAL_JOIN_REQUEST]: {
                path: '/meals/:mealId/join-requests',
                action: 'view_join_request',
                title: 'Nuova Richiesta Partecipazione',
                body: '{{userName}} vuole partecipare a {{mealTitle}}',
                icon: '🙋‍♂️',
                color: '#17a2b8',
                priority: 'high',
                actions: [
                    {
                        id: 'accept',
                        title: 'Accetta',
                        icon: '✅',
                        action: 'accept_join_request'
                    },
                    {
                        id: 'decline',
                        title: 'Rifiuta',
                        icon: '❌',
                        action: 'decline_join_request'
                    },
                    {
                        id: 'view_profile',
                        title: 'Profilo',
                        icon: '👤',
                        action: 'view_user_profile'
                    }
                ]
            },
            
            [this.INTERACTIVE_TYPES.MEAL_UPDATE]: {
                path: '/meals/:mealId',
                action: 'view_meal_update',
                title: 'Aggiornamento Pasto',
                body: '{{mealTitle}} è stato aggiornato',
                icon: '📝',
                color: '#ffc107',
                priority: 'normal',
                actions: [
                    {
                        id: 'view',
                        title: 'Visualizza',
                        icon: '👁️',
                        action: 'view_meal'
                    },
                    {
                        id: 'dismiss',
                        title: 'Ignora',
                        icon: '🚫',
                        action: 'dismiss_notification'
                    }
                ]
            },
            
            [this.INTERACTIVE_TYPES.MEAL_REMINDER]: {
                path: '/meals/:mealId',
                action: 'view_meal_reminder',
                title: 'Promemoria Pasto',
                body: '{{mealTitle}} tra {{timeUntil}}',
                icon: '⏰',
                color: '#dc3545',
                priority: 'high',
                actions: [
                    {
                        id: 'view',
                        title: 'Visualizza',
                        icon: '👁️',
                        action: 'view_meal'
                    },
                    {
                        id: 'snooze',
                        title: 'Rimanda',
                        icon: '⏸️',
                        action: 'snooze_reminder'
                    }
                ]
            },
            
            [this.INTERACTIVE_TYPES.MEAL_CANCELLATION]: {
                path: '/meals',
                action: 'view_cancelled_meal',
                title: 'Pasto Cancellato',
                body: '{{mealTitle}} è stato cancellato',
                icon: '🚫',
                color: '#6c757d',
                priority: 'high',
                actions: [
                    {
                        id: 'view_details',
                        title: 'Dettagli',
                        icon: 'ℹ️',
                        action: 'view_cancellation_details'
                    },
                    {
                        id: 'dismiss',
                        title: 'Ignora',
                        icon: '🚫',
                        action: 'dismiss_notification'
                    }
                ]
            },
            
            [this.INTERACTIVE_TYPES.NEW_MESSAGE]: {
                path: '/chat/:chatId',
                action: 'view_chat',
                title: 'Nuovo Messaggio',
                body: '{{userName}}: {{messagePreview}}',
                icon: '💬',
                color: '#007bff',
                priority: 'normal',
                actions: [
                    {
                        id: 'reply',
                        title: 'Rispondi',
                        icon: '↩️',
                        action: 'reply_message'
                    },
                    {
                        id: 'view',
                        title: 'Visualizza',
                        icon: '👁️',
                        action: 'view_chat'
                    }
                ]
            },
            
            [this.INTERACTIVE_TYPES.NEW_FOLLOWER]: {
                path: '/profile/:userId',
                action: 'view_new_follower',
                title: 'Nuovo Follower',
                body: '{{userName}} ha iniziato a seguirti',
                icon: '👥',
                color: '#6f42c1',
                priority: 'normal',
                actions: [
                    {
                        id: 'follow_back',
                        title: 'Segui',
                        icon: '👥',
                        action: 'follow_user'
                    },
                    {
                        id: 'view_profile',
                        title: 'Profilo',
                        icon: '👤',
                        action: 'view_user_profile'
                    }
                ]
            },
            
            [this.INTERACTIVE_TYPES.FRIEND_REQUEST]: {
                path: '/friends/requests',
                action: 'view_friend_request',
                title: 'Nuova Richiesta Amicizia',
                body: '{{userName}} vuole essere tuo amico',
                icon: '🤝',
                color: '#fd7e14',
                priority: 'normal',
                actions: [
                    {
                        id: 'accept',
                        title: 'Accetta',
                        icon: '✅',
                        action: 'accept_friend_request'
                    },
                    {
                        id: 'decline',
                        title: 'Rifiuta',
                        icon: '❌',
                        action: 'decline_friend_request'
                    },
                    {
                        id: 'view_profile',
                        title: 'Profilo',
                        icon: '👤',
                        action: 'view_user_profile'
                    }
                ]
            },
            
            [this.INTERACTIVE_TYPES.NEARBY_MEAL]: {
                path: '/meals/:mealId',
                action: 'view_nearby_meal',
                title: 'Nuovo TableTalk® nelle vicinanze!',
                body: '{{mealTitle}} a soli {{distance}} km da te',
                icon: '📍',
                color: '#20c997',
                priority: 'normal',
                actions: [
                    {
                        id: 'view',
                        title: 'Visualizza',
                        icon: '👁️',
                        action: 'view_meal'
                    },
                    {
                        id: 'join',
                        title: 'Partecipa',
                        icon: '🎯',
                        action: 'join_meal'
                    },
                    {
                        id: 'dismiss',
                        title: 'Ignora',
                        icon: '🚫',
                        action: 'dismiss_notification'
                    }
                ]
            }
        };

        // Configurazione per piattaforme specifiche
        this.PLATFORM_CONFIG = {
            android: {
                priority: 'high',
                channel_id: 'tabletalk-interactive',
                sound: 'default',
                vibrate: [0, 250, 250, 250],
                lights: [0, 1, 3000, 6000]
            },
            ios: {
                priority: 10,
                sound: 'default',
                badge: 1,
                category: 'tabletalk-interactive'
            },
            web: {
                requireInteraction: true,
                silent: false,
                tag: 'tabletalk-interactive'
            }
        };
    }

    /**
     * Crea una notifica interattiva con deep link e azioni
     * @param {string} userId - ID dell'utente destinatario
     * @param {string} type - Tipo di notifica interattiva
     * @param {Object} data - Dati per personalizzare la notifica
     * @param {Object} options - Opzioni aggiuntive
     * @returns {Promise<Object>} Risultato dell'invio
     */
    async sendInteractiveNotification(userId, type, data = {}, options = {}) {
        try {
            // Verifica se l'utente può ricevere questo tipo di notifica
            const canReceive = await notificationPreferencesService.canReceiveNotification(userId, type);
            
            if (!canReceive) {
                console.log(`ℹ️ [InteractiveNotification] Utente ${userId} ha disabilitato notifiche di tipo ${type}`);
                return {
                    success: true,
                    message: 'Notifica non inviata - preferenze utente',
                    skipped: true,
                    userId,
                    type
                };
            }

            // Ottieni la configurazione per questo tipo di notifica
            const config = this.DEEP_LINK_CONFIG[type];
            if (!config) {
                throw new Error(`Tipo di notifica non supportato: ${type}`);
            }

            // Prepara i dati per la notifica
            const notificationData = this.prepareNotificationData(type, config, data, options);
            
            // Invia la notifica con controllo preferenze
            const result = await pushNotificationService.sendPushNotificationWithPreferences(
                userId,
                notificationData.title,
                notificationData.body,
                notificationData.payload,
                type
            );

            console.log(`✅ [InteractiveNotification] Notifica interattiva inviata per utente ${userId}, tipo ${type}`);
            
            return {
                success: true,
                message: 'Notifica interattiva inviata con successo',
                userId,
                type,
                deepLink: notificationData.deepLink,
                actions: config.actions,
                result
            };

        } catch (error) {
            console.error(`❌ [InteractiveNotification] Errore nell'invio notifica interattiva per utente ${userId}:`, error);
            return {
                success: false,
                message: 'Errore nell\'invio notifica interattiva',
                error: error.message,
                userId,
                type
            };
        }
    }

    /**
     * Prepara i dati per la notifica interattiva
     * @param {string} type - Tipo di notifica
     * @param {Object} config - Configurazione notifica
     * @param {Object} data - Dati personalizzati
     * @param {Object} options - Opzioni aggiuntive
     * @returns {Object} Dati notifica preparati
     */
    prepareNotificationData(type, config, data, options) {
        // Sostituisci i placeholder nel titolo e nel corpo
        let title = config.title;
        let body = config.body;

        // Sostituisci i placeholder con i dati reali
        Object.keys(data).forEach(key => {
            const placeholder = `{{${key}}}`;
            const value = data[key];
            
            if (typeof value === 'string') {
                title = title.replace(placeholder, value);
                body = body.replace(placeholder, value);
            }
        });

        // Genera il deep link
        const deepLink = this.generateDeepLink(config.path, data);
        
        // Prepara il payload per la notifica
        const payload = {
            type: type,
            deepLink: deepLink,
            action: config.action,
            actions: config.actions,
            icon: config.icon,
            color: config.color,
            priority: config.priority,
            timestamp: Date.now(),
            ...data
        };

        // Aggiungi opzioni specifiche per piattaforma
        if (options.platform) {
            payload.platformConfig = this.PLATFORM_CONFIG[options.platform];
        }

        return {
            title,
            body,
            deepLink,
            payload,
            config
        };
    }

    /**
     * Genera un deep link basato sul path e sui dati
     * @param {string} path - Path template (es. '/meals/:mealId')
     * @param {Object} data - Dati per sostituire i parametri
     * @returns {string} Deep link generato
     */
    generateDeepLink(path, data) {
        let deepLink = path;
        
        // Sostituisci i parametri nel path
        Object.keys(data).forEach(key => {
            const param = `:${key}`;
            if (deepLink.includes(param)) {
                deepLink = deepLink.replace(param, data[key]);
            }
        });

        // Aggiungi il protocollo e il dominio
        const baseUrl = process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'https://tabletalk.app';
        return `${baseUrl}${deepLink}`;
    }

    /**
     * Invia notifiche interattive multiple
     * @param {Array<Object>} notifications - Array di notifiche da inviare
     * @returns {Promise<Object>} Risultato dell'invio
     */
    async sendMultipleInteractiveNotifications(notifications) {
        try {
            const results = [];
            let successCount = 0;
            let skippedCount = 0;
            let errorCount = 0;

            for (const notification of notifications) {
                const { userId, type, data = {}, options = {} } = notification;
                
                try {
                    const result = await this.sendInteractiveNotification(userId, type, data, options);
                    results.push(result);
                    
                    if (result.success) {
                        if (result.skipped) {
                            skippedCount++;
                        } else {
                            successCount++;
                        }
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`❌ [InteractiveNotification] Errore nell'invio notifica per utente ${userId}:`, error);
                    results.push({
                        success: false,
                        message: 'Errore nell\'invio',
                        error: error.message,
                        userId,
                        type
                    });
                    errorCount++;
                }
            }

            return {
                success: true,
                message: `Processamento completato: ${successCount} inviate, ${skippedCount} saltate, ${errorCount} errori`,
                total: notifications.length,
                successCount,
                skippedCount,
                errorCount,
                results
            };

        } catch (error) {
            console.error('❌ [InteractiveNotification] Errore nell\'invio notifiche multiple:', error);
            return {
                success: false,
                message: 'Errore nell\'invio notifiche multiple',
                error: error.message
            };
        }
    }

    /**
     * Crea una notifica di invito pasto interattiva
     * @param {string} userId - ID dell'utente destinatario
     * @param {Object} mealData - Dati del pasto
     * @param {Object} inviterData - Dati dell'utente che invita
     * @returns {Promise<Object>} Risultato dell'invio
     */
    async sendMealInvitationNotification(userId, mealData, inviterData) {
        const data = {
            mealId: mealData._id || mealData.id,
            mealTitle: mealData.title,
            inviterId: inviterData._id || inviterData.id,
            inviterName: inviterData.nickname || inviterData.name,
            mealDate: mealData.date,
            mealLocation: mealData.location?.address || 'Posizione non specificata'
        };

        return this.sendInteractiveNotification(
            userId,
            this.INTERACTIVE_TYPES.MEAL_INVITATION,
            data
        );
    }

    /**
     * Crea una notifica di richiesta partecipazione interattiva
     * @param {string} userId - ID dell'utente destinatario (host del pasto)
     * @param {Object} mealData - Dati del pasto
     * @param {Object} requesterData - Dati dell'utente che richiede
     * @returns {Promise<Object>} Risultato dell'invio
     */
    async sendMealJoinRequestNotification(userId, mealData, requesterData) {
        const data = {
            mealId: mealData._id || mealData.id,
            mealTitle: mealData.title,
            requesterId: requesterData._id || requesterData.id,
            userName: requesterData.nickname || requesterData.name,
            mealDate: mealData.date,
            mealLocation: mealData.location?.address || 'Posizione non specificata'
        };

        return this.sendInteractiveNotification(
            userId,
            this.INTERACTIVE_TYPES.MEAL_JOIN_REQUEST,
            data
        );
    }

    /**
     * Crea una notifica di nuovo messaggio interattiva
     * @param {string} userId - ID dell'utente destinatario
     * @param {Object} chatData - Dati della chat
     * @param {Object} senderData - Dati dell'utente che invia
     * @param {string} messageText - Testo del messaggio
     * @returns {Promise<Object>} Risultato dell'invio
     */
    async sendNewMessageNotification(userId, chatData, senderData, messageText) {
        const data = {
            chatId: chatData._id || chatData.id,
            chatTitle: chatData.title || 'Chat',
            senderId: senderData._id || senderData.id,
            userName: senderData.nickname || senderData.name,
            messagePreview: messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText,
            messageId: chatData.lastMessage?._id || 'new'
        };

        return this.sendInteractiveNotification(
            userId,
            this.INTERACTIVE_TYPES.NEW_MESSAGE,
            data
        );
    }

    /**
     * Crea una notifica di pasto nelle vicinanze interattiva
     * @param {string} userId - ID dell'utente destinatario
     * @param {Object} mealData - Dati del pasto
     * @param {number} distance - Distanza in km
     * @returns {Promise<Object>} Risultato dell'invio
     */
    async sendNearbyMealNotification(userId, mealData, distance) {
        const data = {
            mealId: mealData._id || mealData.id,
            mealTitle: mealData.title,
            distance: distance < 1 ? 'meno di 1 km' : `${distance} km`,
            mealType: mealData.type,
            hostId: mealData.host?._id || mealData.host,
            hostName: mealData.host?.nickname || 'Organizzatore',
            mealDate: mealData.date,
            mealLocation: mealData.location?.address || 'Posizione non specificata'
        };

        return this.sendInteractiveNotification(
            userId,
            this.INTERACTIVE_TYPES.NEARBY_MEAL,
            data
        );
    }

    /**
     * Crea una notifica di promemoria pasto interattiva
     * @param {string} userId - ID dell'utente destinatario
     * @param {Object} mealData - Dati del pasto
     * @param {string} timeUntil - Tempo rimanente (es. "2 ore")
     * @returns {Promise<Object>} Risultato dell'invio
     */
    async sendMealReminderNotification(userId, mealData, timeUntil) {
        const data = {
            mealId: mealData._id || mealData.id,
            mealTitle: mealData.title,
            timeUntil: timeUntil,
            mealDate: mealData.date,
            mealLocation: mealData.location?.address || 'Posizione non specificata'
        };

        return this.sendInteractiveNotification(
            userId,
            this.INTERACTIVE_TYPES.MEAL_REMINDER,
            data
        );
    }

    /**
     * Ottiene la configurazione per un tipo di notifica
     * @param {string} type - Tipo di notifica
     * @returns {Object|null} Configurazione o null se non trovata
     */
    getNotificationConfig(type) {
        return this.DEEP_LINK_CONFIG[type] || null;
    }

    /**
     * Ottiene tutti i tipi di notifica supportati
     * @returns {Array<string>} Array di tipi supportati
     */
    getSupportedTypes() {
        return Object.keys(this.INTERACTIVE_TYPES);
    }

    /**
     * Verifica se un tipo di notifica è supportato
     * @param {string} type - Tipo di notifica
     * @returns {boolean} True se supportato
     */
    isTypeSupported(type) {
        return this.INTERACTIVE_TYPES.hasOwnProperty(type);
    }

    /**
     * Ottiene le azioni disponibili per un tipo di notifica
     * @param {string} type - Tipo di notifica
     * @returns {Array<Object>} Array di azioni disponibili
     */
    getAvailableActions(type) {
        const config = this.getNotificationConfig(type);
        return config ? config.actions : [];
    }
}

module.exports = new InteractiveNotificationService();
