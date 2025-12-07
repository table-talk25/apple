const User = require('../models/User');

/**
 * Servizio per la gestione delle preferenze di notifica
 * Controlla e gestisce le preferenze granulari per le notifiche push
 */
class NotificationPreferencesService {
    constructor() {
        // Definizione dei tipi di notifica supportati
        this.NOTIFICATION_TYPES = {
            // Notifiche per pasti
            MEAL_INVITATION: 'meals.invitations',
            MEAL_JOIN_REQUEST: 'meals.joinRequests',
            MEAL_UPDATE: 'meals.mealUpdates',
            MEAL_REMINDER: 'meals.mealReminders',
            MEAL_CANCELLATION: 'meals.mealCancellations',
            
            // Notifiche per chat
            CHAT_NEW_MESSAGE: 'chat.newMessages',
            CHAT_TYPING_INDICATOR: 'chat.typingIndicators',
            CHAT_READ_RECEIPT: 'chat.readReceipts',
            
            // Notifiche per social
            SOCIAL_NEW_FOLLOWER: 'social.newFollowers',
            SOCIAL_PROFILE_VIEW: 'social.profileViews',
            SOCIAL_FRIEND_REQUEST: 'social.friendRequests',
            
            // Notifiche per sistema
            SYSTEM_ACCOUNT_UPDATE: 'system.accountUpdates',
            SYSTEM_SECURITY_ALERT: 'system.securityAlerts',
            SYSTEM_MAINTENANCE: 'system.maintenance',
            SYSTEM_UPDATE: 'system.updates',
            
            // Notifiche per moderazione
            MODERATION_REPORT_UPDATE: 'moderation.reportUpdates',
            MODERATION_CONTENT_APPROVAL: 'moderation.contentApprovals',
            MODERATION_POLICY_CHANGE: 'moderation.policyChanges',
            
            // Notifiche geolocalizzate
            GEOLOCATION_NEARBY_MEAL: 'geolocation.nearbyMeal'
        };

        // Mappatura dei tipi di notifica per compatibilità
        this.TYPE_MAPPING = {
            'invitation': this.NOTIFICATION_TYPES.MEAL_INVITATION,
            'join_request': this.NOTIFICATION_TYPES.MEAL_JOIN_REQUEST,
            'meal_update': this.NOTIFICATION_TYPES.MEAL_UPDATE,
            'meal_reminder': this.NOTIFICATION_TYPES.MEAL_REMINDER,
            'meal_cancellation': this.NOTIFICATION_TYPES.MEAL_CANCELLATION,
            'new_message': this.NOTIFICATION_TYPES.CHAT_NEW_MESSAGE,
            'typing_indicator': this.NOTIFICATION_TYPES.CHAT_TYPING_INDICATOR,
            'read_receipt': this.NOTIFICATION_TYPES.CHAT_READ_RECEIPT,
            'new_follower': this.NOTIFICATION_TYPES.SOCIAL_NEW_FOLLOWER,
            'profile_view': this.NOTIFICATION_TYPES.SOCIAL_PROFILE_VIEW,
            'friend_request': this.NOTIFICATION_TYPES.SOCIAL_FRIEND_REQUEST,
            'account_update': this.NOTIFICATION_TYPES.SYSTEM_ACCOUNT_UPDATE,
            'security_alert': this.NOTIFICATION_TYPES.SYSTEM_SECURITY_ALERT,
            'maintenance': this.NOTIFICATION_TYPES.SYSTEM_MAINTENANCE,
            'app_update': this.NOTIFICATION_TYPES.SYSTEM_UPDATE,
            'report_update': this.NOTIFICATION_TYPES.MODERATION_REPORT_UPDATE,
            'content_approval': this.NOTIFICATION_TYPES.MODERATION_CONTENT_APPROVAL,
            'policy_change': this.NOTIFICATION_TYPES.MODERATION_POLICY_CHANGE,
            'nearby_meal': this.NOTIFICATION_TYPES.GEOLOCATION_NEARBY_MEAL
        };
    }

    /**
     * Verifica se un utente può ricevere una notifica di un tipo specifico
     * @param {string} userId - ID dell'utente
     * @param {string} notificationType - Tipo di notifica (può essere sia chiave che path)
     * @returns {Promise<boolean>} True se l'utente può ricevere la notifica
     */
    async canReceiveNotification(userId, notificationType) {
        try {
            // Trova l'utente e le sue preferenze
            const user = await User.findById(userId).select('settings.notifications');
            
            if (!user) {
                console.log(`⚠️ [NotificationPreferences] Utente ${userId} non trovato`);
                return false;
            }

            // Verifica se le notifiche push sono completamente disabilitate
            if (!user.settings?.notifications?.push) {
                return false;
            }

            // Normalizza il tipo di notifica
            const normalizedType = this.normalizeNotificationType(notificationType);
            
            if (!normalizedType) {
                console.log(`⚠️ [NotificationPreferences] Tipo notifica non riconosciuto: ${notificationType}`);
                return false;
            }

            // Verifica la preferenza specifica
            const canReceive = this.checkNotificationPreference(user.settings.notifications, normalizedType);
            
            if (canReceive) {
                console.log(`✅ [NotificationPreferences] Utente ${userId} può ricevere notifica ${normalizedType}`);
            } else {
                console.log(`❌ [NotificationPreferences] Utente ${userId} ha disabilitato notifica ${normalizedType}`);
            }

            return canReceive;

        } catch (error) {
            console.error(`❌ [NotificationPreferences] Errore nel verificare preferenze per utente ${userId}:`, error);
            // In caso di errore, permette la notifica per sicurezza
            return true;
        }
    }

    /**
     * Normalizza il tipo di notifica per la verifica delle preferenze
     * @param {string} notificationType - Tipo di notifica (può essere chiave o path)
     * @returns {string|null} Tipo normalizzato o null se non riconosciuto
     */
    normalizeNotificationType(notificationType) {
        // Se è già un path completo (es. 'meals.invitations')
        if (notificationType.includes('.')) {
            return notificationType;
        }

        // Se è una chiave del mapping (es. 'invitation')
        if (this.TYPE_MAPPING[notificationType]) {
            return this.TYPE_MAPPING[notificationType];
        }

        // Se è una chiave diretta dei NOTIFICATION_TYPES (es. 'MEAL_INVITATION')
        if (this.NOTIFICATION_TYPES[notificationType]) {
            return this.NOTIFICATION_TYPES[notificationType];
        }

        return null;
    }

    /**
     * Verifica la preferenza specifica per un tipo di notifica
     * @param {Object} notificationSettings - Impostazioni notifiche dell'utente
     * @param {string} notificationPath - Path della notifica (es. 'meals.invitations')
     * @returns {boolean} True se la notifica è abilitata
     */
    checkNotificationPreference(notificationSettings, notificationPath) {
        try {
            // Divide il path in parti (es. 'meals.invitations' -> ['meals', 'invitations'])
            const pathParts = notificationPath.split('.');
            
            if (pathParts.length !== 2) {
                console.log(`⚠️ [NotificationPreferences] Path notifica non valido: ${notificationPath}`);
                return true; // Default per sicurezza
            }

            const [category, type] = pathParts;
            
            // Verifica se la categoria esiste nelle preferenze
            if (!notificationSettings.pushPreferences || !notificationSettings.pushPreferences[category]) {
                console.log(`⚠️ [NotificationPreferences] Categoria ${category} non trovata nelle preferenze`);
                return true; // Default per sicurezza
            }

            // Verifica se il tipo specifico è abilitato
            const isEnabled = notificationSettings.pushPreferences[category][type];
            
            // Se la preferenza non è definita, usa il default (true)
            return isEnabled !== undefined ? isEnabled : true;

        } catch (error) {
            console.error(`❌ [NotificationPreferences] Errore nel verificare preferenza ${notificationPath}:`, error);
            return true; // Default per sicurezza
        }
    }

    /**
     * Ottiene le preferenze di notifica di un utente
     * @param {string} userId - ID dell'utente
     * @returns {Promise<Object>} Preferenze di notifica
     */
    async getUserNotificationPreferences(userId) {
        try {
            const user = await User.findById(userId).select('settings.notifications');
            
            if (!user) {
                throw new Error('Utente non trovato');
            }

            // Restituisce le preferenze con valori di default se non definiti
            const preferences = user.settings?.notifications || {};
            
            return {
                push: preferences.push !== undefined ? preferences.push : true,
                email: preferences.email !== undefined ? preferences.email : true,
                pushPreferences: this.getDefaultPushPreferences(preferences.pushPreferences),
                geolocation: preferences.geolocation || {
                    enabled: false,
                    radius: 10,
                    maxDistance: 10,
                    mealTypes: ['breakfast', 'lunch', 'dinner', 'aperitif']
                }
            };

        } catch (error) {
            console.error(`❌ [NotificationPreferences] Errore nel recuperare preferenze per utente ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Aggiorna le preferenze di notifica di un utente
     * @param {string} userId - ID dell'utente
     * @param {Object} preferences - Nuove preferenze
     * @returns {Promise<Object>} Preferenze aggiornate
     */
    async updateUserNotificationPreferences(userId, preferences) {
        try {
            const updateData = {};
            
            // Aggiorna le preferenze generali
            if (preferences.push !== undefined) {
                updateData['settings.notifications.push'] = preferences.push;
            }
            
            if (preferences.email !== undefined) {
                updateData['settings.notifications.email'] = preferences.email;
            }

            // Aggiorna le preferenze geolocalizzate
            if (preferences.geolocation) {
                if (preferences.geolocation.enabled !== undefined) {
                    updateData['settings.notifications.geolocation.enabled'] = preferences.geolocation.enabled;
                }
                if (preferences.geolocation.radius !== undefined) {
                    updateData['settings.notifications.geolocation.radius'] = Math.max(1, Math.min(50, preferences.geolocation.radius));
                }
                if (preferences.geolocation.maxDistance !== undefined) {
                    updateData['settings.notifications.geolocation.maxDistance'] = Math.max(1, Math.min(50, preferences.geolocation.maxDistance));
                }
                if (preferences.geolocation.mealTypes !== undefined) {
                    updateData['settings.notifications.geolocation.mealTypes'] = preferences.geolocation.mealTypes;
                }
            }

            // Aggiorna le preferenze push granulari
            if (preferences.pushPreferences) {
                Object.keys(preferences.pushPreferences).forEach(category => {
                    Object.keys(preferences.pushPreferences[category]).forEach(type => {
                        const path = `settings.notifications.pushPreferences.${category}.${type}`;
                        updateData[path] = preferences.pushPreferences[category][type];
                    });
                });
            }

            // Aggiorna l'utente
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('settings.notifications');

            if (!updatedUser) {
                throw new Error('Utente non trovato');
            }

            console.log(`✅ [NotificationPreferences] Preferenze aggiornate per utente ${userId}`);
            
            return {
                push: updatedUser.settings.notifications.push,
                email: updatedUser.settings.notifications.email,
                pushPreferences: this.getDefaultPushPreferences(updatedUser.settings.notifications.pushPreferences),
                geolocation: updatedUser.settings.notifications.geolocation
            };

        } catch (error) {
            console.error(`❌ [NotificationPreferences] Errore nell'aggiornamento preferenze per utente ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Ottiene le preferenze push di default
     * @param {Object} userPreferences - Preferenze dell'utente
     * @returns {Object} Preferenze con valori di default
     */
    getDefaultPushPreferences(userPreferences) {
        const defaults = {
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
        };

        // Se l'utente ha preferenze, le unisce con i default
        if (userPreferences) {
            Object.keys(defaults).forEach(category => {
                if (userPreferences[category]) {
                    Object.keys(defaults[category]).forEach(type => {
                        if (userPreferences[category][type] !== undefined) {
                            defaults[category][type] = userPreferences[category][type];
                        }
                    });
                }
            });
        }

        return defaults;
    }

    /**
     * Resetta le preferenze di notifica di un utente ai valori di default
     * @param {string} userId - ID dell'utente
     * @returns {Promise<Object>} Preferenze resettate
     */
    async resetUserNotificationPreferences(userId) {
        try {
            const defaultPreferences = {
                push: true,
                email: true,
                pushPreferences: this.getDefaultPushPreferences({}),
                geolocation: {
                    enabled: false,
                    radius: 10,
                    maxDistance: 10,
                    mealTypes: ['breakfast', 'lunch', 'dinner', 'aperitif']
                }
            };

            const updatedPreferences = await this.updateUserNotificationPreferences(userId, defaultPreferences);
            
            console.log(`✅ [NotificationPreferences] Preferenze resettate per utente ${userId}`);
            return updatedPreferences;

        } catch (error) {
            console.error(`❌ [NotificationPreferences] Errore nel reset preferenze per utente ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Ottiene statistiche sulle preferenze di notifica
     * @returns {Promise<Object>} Statistiche aggregate
     */
    async getNotificationPreferencesStats() {
        try {
            const stats = await User.aggregate([
                {
                    $group: {
                        _id: null,
                        totalUsers: { $sum: 1 },
                        pushEnabled: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$settings.notifications.push', true] },
                                    1,
                                    0
                                ]
                            }
                        },
                        emailEnabled: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$settings.notifications.email', true] },
                                    1,
                                    0
                                ]
                            }
                        },
                        geolocationEnabled: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$settings.notifications.geolocation.enabled', true] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            const result = stats[0] || {
                totalUsers: 0,
                pushEnabled: 0,
                emailEnabled: 0,
                geolocationEnabled: 0
            };

            // Calcola percentuali
            result.pushPercentage = result.totalUsers > 0 ? Math.round((result.pushEnabled / result.totalUsers) * 100) : 0;
            result.emailPercentage = result.totalUsers > 0 ? Math.round((result.emailEnabled / result.totalUsers) * 100) : 0;
            result.geolocationPercentage = result.totalUsers > 0 ? Math.round((result.geolocationEnabled / result.totalUsers) * 100) : 0;

            return result;

        } catch (error) {
            console.error('❌ [NotificationPreferences] Errore nel recupero statistiche preferenze:', error);
            throw error;
        }
    }

    /**
     * Verifica se un utente ha preferenze personalizzate
     * @param {string} userId - ID dell'utente
     * @returns {Promise<boolean>} True se ha preferenze personalizzate
     */
    async hasCustomPreferences(userId) {
        try {
            const user = await User.findById(userId).select('settings.notifications.pushPreferences');
            
            if (!user || !user.settings?.notifications?.pushPreferences) {
                return false;
            }

            // Verifica se almeno una preferenza è diversa dal default
            const defaults = this.getDefaultPushPreferences({});
            const userPrefs = user.settings.notifications.pushPreferences;

            for (const category in defaults) {
                for (const type in defaults[category]) {
                    if (userPrefs[category] && userPrefs[category][type] !== undefined) {
                        if (userPrefs[category][type] !== defaults[category][type]) {
                            return true;
                        }
                    }
                }
            }

            return false;

        } catch (error) {
            console.error(`❌ [NotificationPreferences] Errore nel verificare preferenze personalizzate per utente ${userId}:`, error);
            return false;
        }
    }
}

module.exports = new NotificationPreferencesService();
