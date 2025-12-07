const User = require('../models/User');
const Meal = require('../models/Meal');
const pushNotificationService = require('./pushNotificationService');
const notificationService = require('./notificationService');
const interactiveNotificationService = require('./interactiveNotificationService');

/**
 * Servizio per le notifiche geolocalizzate
 * Invia notifiche agli utenti quando vengono creati pasti nelle loro vicinanze
 */
class GeolocationNotificationService {
    constructor() {
        this.EARTH_RADIUS_KM = 6371; // Raggio della Terra in km
    }

    /**
     * Calcola la distanza tra due punti geografici usando la formula di Haversine
     * @param {number} lat1 - Latitudine del primo punto
     * @param {number} lon1 - Longitudine del primo punto
     * @param {number} lat2 - Latitudine del secondo punto
     * @param {number} lon2 - Longitudine del secondo punto
     * @returns {number} Distanza in chilometri
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = this.EARTH_RADIUS_KM * c;
        
        return Math.round(distance * 100) / 100; // Arrotonda a 2 decimali
    }

    /**
     * Converte i gradi in radianti
     * @param {number} deg - Gradi
     * @returns {number} Radianti
     */
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    /**
     * Trova utenti nelle vicinanze di una posizione
     * @param {Object} mealLocation - Posizione del pasto
     * @param {number} maxDistance - Distanza massima in km
     * @returns {Array} Array di utenti nelle vicinanze
     */
    async findNearbyUsers(mealLocation, maxDistance = 10) {
        try {
            // Verifica che la posizione del pasto abbia coordinate
            if (!mealLocation || !mealLocation.coordinates || !Array.isArray(mealLocation.coordinates)) {
                console.log('⚠️ [GeolocationNotification] Posizione pasto non valida o senza coordinate');
                return [];
            }

            const [mealLng, mealLat] = mealLocation.coordinates;

            // Trova tutti gli utenti con notifiche geolocalizzate abilitate
            const users = await User.find({
                'settings.notifications.geolocation.enabled': true,
                'location.coordinates': { $exists: true, $ne: null },
                'location.coordinates.0': { $exists: true },
                'location.coordinates.1': { $exists: true }
            }).select('_id nickname location settings fcmTokens');

            const nearbyUsers = [];

            for (const user of users) {
                if (!user.location || !user.location.coordinates || user.location.coordinates.length < 2) {
                    continue;
                }

                const [userLng, userLat] = user.location.coordinates;
                const distance = this.calculateDistance(mealLat, mealLng, userLat, userLng);

                // Verifica che la distanza sia entro il raggio personalizzato dell'utente
                const userMaxDistance = user.settings?.notifications?.geolocation?.maxDistance || 10;
                
                if (distance <= userMaxDistance) {
                    nearbyUsers.push({
                        user,
                        distance,
                        mealLocation: mealLocation.address || 'Posizione non specificata'
                    });
                }
            }

            // Ordina per distanza (più vicini prima)
            nearbyUsers.sort((a, b) => a.distance - b.distance);

            console.log(`📍 [GeolocationNotification] Trovati ${nearbyUsers.length} utenti nelle vicinanze (max ${maxDistance}km)`);
            return nearbyUsers;

        } catch (error) {
            console.error('❌ [GeolocationNotification] Errore nel trovare utenti nelle vicinanze:', error);
            return [];
        }
    }

    /**
     * Invia notifiche per un nuovo pasto nelle vicinanze
     * @param {Object} meal - Il pasto appena creato
     * @returns {Promise<Object>} Risultato dell'invio notifiche
     */
    async sendNearbyMealNotifications(meal) {
        try {
            // Verifica che sia un pasto fisico e pubblico
            if (meal.mealType !== 'physical' || !meal.isPublic) {
                console.log(`ℹ️ [GeolocationNotification] Pasto ${meal._id} non richiede notifiche geolocalizzate (virtuale o privato)`);
                return { success: true, message: 'Pasto non richiede notifiche geolocalizzate' };
            }

            // Verifica che abbia una posizione valida
            if (!meal.location || !meal.location.coordinates) {
                console.log(`⚠️ [GeolocationNotification] Pasto ${meal._id} non ha coordinate valide`);
                return { success: false, message: 'Pasto senza coordinate valide' };
            }

            console.log(`🚀 [GeolocationNotification] Invio notifiche per pasto ${meal._id} - ${meal.title}`);

            // Trova utenti nelle vicinanze
            const nearbyUsers = await this.findNearbyUsers(meal.location);

            if (nearbyUsers.length === 0) {
                console.log(`ℹ️ [GeolocationNotification] Nessun utente nelle vicinanze per pasto ${meal._id}`);
                return { success: true, message: 'Nessun utente nelle vicinanze' };
            }

            let notificationsSent = 0;
            let pushNotificationsSent = 0;
            let socketNotificationsSent = 0;

            // Invia notifiche a ogni utente nelle vicinanze
            for (const { user, distance, mealLocation } of nearbyUsers) {
                try {
                    // Verifica preferenze utente per tipo di pasto
                    const userMealTypes = user.settings?.notifications?.geolocation?.mealTypes || ['breakfast', 'lunch', 'dinner', 'aperitif'];
                    if (!userMealTypes.includes(meal.type)) {
                        console.log(`ℹ️ [GeolocationNotification] Utente ${user._id} non interessato al tipo ${meal.type}`);
                        continue;
                    }

                    // Prepara il messaggio della notifica
                    const notificationMessage = this.createNotificationMessage(meal, distance, mealLocation);
                    
                               // Invia notifica push interattiva se abilitata
           if (user.fcmTokens && user.fcmTokens.length > 0) {
               await this.sendInteractivePushNotification(user, meal, distance, mealLocation);
               pushNotificationsSent++;
           }

                    // Invia notifica socket se l'utente è online
                    await this.sendSocketNotification(user._id, meal, distance, mealLocation);
                    socketNotificationsSent++;

                    notificationsSent++;

                    console.log(`✅ [GeolocationNotification] Notifica inviata a ${user.nickname} (${distance}km)`);

                } catch (error) {
                    console.error(`❌ [GeolocationNotification] Errore nell'invio notifica a utente ${user._id}:`, error);
                }
            }

            const result = {
                success: true,
                message: `Notifiche geolocalizzate inviate per pasto ${meal._id}`,
                totalUsers: nearbyUsers.length,
                notificationsSent,
                pushNotificationsSent,
                socketNotificationsSent
            };

            console.log(`🎯 [GeolocationNotification] Riepilogo: ${JSON.stringify(result)}`);
            return result;

        } catch (error) {
            console.error('❌ [GeolocationNotification] Errore nell\'invio notifiche geolocalizzate:', error);
            return { success: false, message: 'Errore nell\'invio notifiche', error: error.message };
        }
    }

    /**
     * Crea il messaggio della notifica
     * @param {Object} meal - Il pasto
     * @param {number} distance - Distanza in km
     * @param {string} mealLocation - Posizione del pasto
     * @returns {string} Messaggio formattato
     */
    createNotificationMessage(meal, distance, mealLocation) {
        const mealTypeLabels = {
            'breakfast': 'colazione',
            'lunch': 'pranzo',
            'dinner': 'cena',
            'aperitif': 'aperitivo'
        };

        const mealTypeLabel = mealTypeLabels[meal.type] || meal.type;
        const distanceText = distance < 1 ? 'meno di 1 km' : `${distance} km`;

        return `Nuovo ${mealTypeLabel} vicino a te! Dai un'occhiata a "${meal.title}" a soli ${distanceText} da casa tua.`;
    }

        /**
     * Invia notifica push
     * @param {Object} user - Utente destinatario
     * @param {Object} meal - Il pasto
     * @param {number} distance - Distanza in km
     * @param {string} mealLocation - Posizione del pasto
     */
    async sendPushNotification(user, meal, distance, mealLocation) {
        try {
            const title = '🍽️ Nuovo TableTalk® nelle vicinanze!';
            const body = this.createNotificationMessage(meal, distance, mealLocation);

            const data = {
                mealId: meal._id.toString(),
                type: 'nearby_meal',
                distance: distance.toString(),
                mealType: meal.type,
                hostId: meal.host.toString()
            };

            await pushNotificationService.sendPushNotification(
                user.fcmTokens,
                title,
                body,
                data,
                'nearby_meal'
            );

        } catch (error) {
            console.error(`❌ [GeolocationNotification] Errore nell'invio notifica push a ${user._id}:`, error);
        }
    }

    /**
     * Invia notifica push interattiva con azioni rapide
     * @param {Object} user - Utente destinatario
     * @param {Object} meal - Il pasto
     * @param {number} distance - Distanza in km
     * @param {string} mealLocation - Posizione del pasto
     */
    async sendInteractivePushNotification(user, meal, distance, mealLocation) {
        try {
            // Utilizza il servizio di notifiche interattive
            await interactiveNotificationService.sendNearbyMealNotification(
                user._id,
                meal,
                distance
            );

            console.log(`✅ [GeolocationNotification] Notifica push interattiva inviata a ${user._id} per pasto ${meal._id}`);

        } catch (error) {
            console.error(`❌ [GeolocationNotification] Errore nell'invio notifica push interattiva a ${user._id}:`, error);
            
            // Fallback alla notifica push standard
            console.log(`🔄 [GeolocationNotification] Fallback a notifica push standard per utente ${user._id}`);
            await this.sendPushNotification(user, meal, distance, mealLocation);
        }
    }

    /**
     * Invia notifica socket
     * @param {string} userId - ID utente destinatario
     * @param {Object} meal - Il pasto
     * @param {number} distance - Distanza in km
     * @param {string} mealLocation - Posizione del pasto
     */
    async sendSocketNotification(userId, meal, distance, mealLocation) {
        try {
            const message = this.createNotificationMessage(meal, distance, mealLocation);
            const data = {
                mealId: meal._id,
                type: 'nearby_meal',
                distance,
                mealType: meal.type,
                hostId: meal.host
            };

            notificationService.sendNotification([userId], 'nearby_meal', message, data);

        } catch (error) {
            console.error(`❌ [GeolocationNotification] Errore nell'invio notifica socket a ${userId}:`, error);
        }
    }

    /**
     * Processa tutti i pasti recenti per inviare notifiche geolocalizzate
     * @param {number} hoursBack - Ore indietro da controllare (default: 24)
     * @returns {Promise<Object>} Risultato del processo
     */
    async processRecentMeals(hoursBack = 24) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - hoursBack);

            console.log(`🔍 [GeolocationNotification] Processamento pasti creati nelle ultime ${hoursBack} ore`);

            // Trova pasti fisici pubblici recenti
            const recentMeals = await Meal.find({
                mealType: 'physical',
                isPublic: true,
                createdAt: { $gte: cutoffDate },
                'location.coordinates': { $exists: true, $ne: null }
            }).populate('host', 'nickname');

            console.log(`📊 [GeolocationNotification] Trovati ${recentMeals.length} pasti recenti da processare`);

            let totalNotifications = 0;
            let successfulMeals = 0;

            for (const meal of recentMeals) {
                try {
                    const result = await this.sendNearbyMealNotifications(meal);
                    if (result.success) {
                        successfulMeals++;
                        totalNotifications += result.notificationsSent || 0;
                    }
                } catch (error) {
                    console.error(`❌ [GeolocationNotification] Errore nel processare pasto ${meal._id}:`, error);
                }
            }

            const summary = {
                success: true,
                message: `Processamento completato per ${recentMeals.length} pasti`,
                totalMeals: recentMeals.length,
                successfulMeals,
                totalNotifications,
                processedAt: new Date()
            };

            console.log(`✅ [GeolocationNotification] Processamento completato: ${JSON.stringify(summary)}`);
            return summary;

        } catch (error) {
            console.error('❌ [GeolocationNotification] Errore nel processamento pasti recenti:', error);
            return { success: false, message: 'Errore nel processamento', error: error.message };
        }
    }

    /**
     * Aggiorna le impostazioni geolocalizzate di un utente
     * @param {string} userId - ID utente
     * @param {Object} settings - Nuove impostazioni
     * @returns {Promise<Object>} Risultato dell'aggiornamento
     */
    async updateUserGeolocationSettings(userId, settings) {
        try {
            const updateData = {};
            
            if (settings.enabled !== undefined) {
                updateData['settings.notifications.geolocation.enabled'] = settings.enabled;
            }
            
            if (settings.radius !== undefined) {
                updateData['settings.notifications.geolocation.radius'] = Math.max(1, Math.min(50, settings.radius));
            }
            
            if (settings.maxDistance !== undefined) {
                updateData['settings.notifications.geolocation.maxDistance'] = Math.max(1, Math.min(50, settings.maxDistance));
            }
            
            if (settings.mealTypes !== undefined) {
                updateData['settings.notifications.geolocation.mealTypes'] = settings.mealTypes;
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('settings.notifications.geolocation');

            if (!updatedUser) {
                return { success: false, message: 'Utente non trovato' };
            }

            console.log(`✅ [GeolocationNotification] Impostazioni aggiornate per utente ${userId}`);
            return {
                success: true,
                message: 'Impostazioni geolocalizzate aggiornate',
                settings: updatedUser.settings.notifications.geolocation
            };

        } catch (error) {
            console.error(`❌ [GeolocationNotification] Errore nell'aggiornamento impostazioni per utente ${userId}:`, error);
            return { success: false, message: 'Errore nell\'aggiornamento', error: error.message };
        }
    }

    /**
     * Ottiene le statistiche delle notifiche geolocalizzate
     * @returns {Promise<Object>} Statistiche del servizio
     */
    async getServiceStats() {
        try {
            const totalUsers = await User.countDocuments({
                'settings.notifications.geolocation.enabled': true
            });

            const usersWithLocation = await User.countDocuments({
                'settings.notifications.geolocation.enabled': true,
                'location.coordinates': { $exists: true, $ne: null }
            });

            const recentMeals = await Meal.countDocuments({
                mealType: 'physical',
                isPublic: true,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            });

            return {
                success: true,
                stats: {
                    totalUsersEnabled: totalUsers,
                    usersWithLocation,
                    recentPhysicalMeals: recentMeals,
                    serviceStatus: 'active'
                }
            };

        } catch (error) {
            console.error('❌ [GeolocationNotification] Errore nel recupero statistiche:', error);
            return { success: false, message: 'Errore nel recupero statistiche', error: error.message };
        }
    }
}

module.exports = new GeolocationNotificationService();
