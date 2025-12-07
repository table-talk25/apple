const asyncHandler = require('express-async-handler');
const notificationPreferencesService = require('../services/notificationPreferencesService');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Controller per la gestione delle preferenze di notifica
 */

// @desc    Ottiene le preferenze di notifica dell'utente corrente
// @route   GET /api/notification-preferences
// @access  Private
exports.getNotificationPreferences = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const preferences = await notificationPreferencesService.getUserNotificationPreferences(userId);
        
        res.status(200).json({
            success: true,
            data: preferences
        });

    } catch (error) {
        console.error(`❌ [NotificationPreferencesController] Errore nel recupero preferenze per utente ${req.user.id}:`, error);
        return next(new ErrorResponse('Errore nel recupero delle preferenze di notifica', 500));
    }
});

// @desc    Aggiorna le preferenze di notifica dell'utente corrente
// @route   PUT /api/notification-preferences
// @access  Private
exports.updateNotificationPreferences = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { push, email, pushPreferences, geolocation } = req.body;

        // Validazione dei dati in ingresso
        if (push !== undefined && typeof push !== 'boolean') {
            return next(new ErrorResponse('Il campo push deve essere un booleano', 400));
        }

        if (email !== undefined && typeof email !== 'boolean') {
            return next(new ErrorResponse('Il campo email deve essere un booleano', 400));
        }

        // Validazione preferenze push granulari
        if (pushPreferences) {
            const validCategories = ['meals', 'chat', 'social', 'system', 'moderation'];
            const validMealTypes = ['breakfast', 'lunch', 'dinner', 'aperitif'];

            for (const category of Object.keys(pushPreferences)) {
                if (!validCategories.includes(category)) {
                    return next(new ErrorResponse(`Categoria preferenze non valida: ${category}`, 400));
                }

                if (pushPreferences[category]) {
                    for (const type of Object.keys(pushPreferences[category])) {
                        if (typeof pushPreferences[category][type] !== 'boolean') {
                            return next(new ErrorResponse(`Preferenza ${category}.${type} deve essere un booleano`, 400));
                        }
                    }
                }
            }
        }

        // Validazione preferenze geolocalizzate
        if (geolocation) {
            if (geolocation.enabled !== undefined && typeof geolocation.enabled !== 'boolean') {
                return next(new ErrorResponse('Il campo geolocation.enabled deve essere un booleano', 400));
            }

            if (geolocation.radius !== undefined && (typeof geolocation.radius !== 'number' || geolocation.radius < 1 || geolocation.radius > 50)) {
                return next(new ErrorResponse('Il raggio geolocalizzato deve essere un numero tra 1 e 50 km', 400));
            }

            if (geolocation.maxDistance !== undefined && (typeof geolocation.maxDistance !== 'number' || geolocation.maxDistance < 1 || geolocation.maxDistance > 50)) {
                return next(new ErrorResponse('La distanza massima geolocalizzata deve essere un numero tra 1 e 50 km', 400));
            }

            if (geolocation.mealTypes !== undefined && (!Array.isArray(geolocation.mealTypes) || geolocation.mealTypes.length === 0)) {
                return next(new ErrorResponse('I tipi di pasto geolocalizzati devono essere un array non vuoto', 400));
            }
        }

        const updatedPreferences = await notificationPreferencesService.updateUserNotificationPreferences(userId, {
            push,
            email,
            pushPreferences,
            geolocation
        });

        res.status(200).json({
            success: true,
            message: 'Preferenze di notifica aggiornate con successo',
            data: updatedPreferences
        });

    } catch (error) {
        console.error(`❌ [NotificationPreferencesController] Errore nell'aggiornamento preferenze per utente ${req.user.id}:`, error);
        return next(new ErrorResponse('Errore nell\'aggiornamento delle preferenze di notifica', 500));
    }
});

// @desc    Resetta le preferenze di notifica dell'utente corrente ai valori di default
// @route   POST /api/notification-preferences/reset
// @access  Private
exports.resetNotificationPreferences = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const resetPreferences = await notificationPreferencesService.resetUserNotificationPreferences(userId);
        
        res.status(200).json({
            success: true,
            message: 'Preferenze di notifica resettate ai valori di default',
            data: resetPreferences
        });

    } catch (error) {
        console.error(`❌ [NotificationPreferencesController] Errore nel reset preferenze per utente ${req.user.id}:`, error);
        return next(new ErrorResponse('Errore nel reset delle preferenze di notifica', 500));
    }
});

// @desc    Ottiene le statistiche sulle preferenze di notifica (solo admin)
// @route   GET /api/notification-preferences/stats
// @access  Private/Admin
exports.getNotificationPreferencesStats = asyncHandler(async (req, res, next) => {
    // Verifica che l'utente sia admin
    if (req.user.role !== 'admin') {
        return next(new ErrorResponse('Accesso negato: richiesti privilegi di amministratore', 403));
    }

    try {
        const stats = await notificationPreferencesService.getNotificationPreferencesStats();
        
        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ [NotificationPreferencesController] Errore nel recupero statistiche preferenze:', error);
        return next(new ErrorResponse('Errore nel recupero delle statistiche preferenze', 500));
    }
});

// @desc    Verifica se un utente può ricevere un tipo specifico di notifica
// @route   POST /api/notification-preferences/check
// @access  Private
exports.checkNotificationPermission = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { notificationType } = req.body;

        if (!notificationType) {
            return next(new ErrorResponse('Tipo di notifica richiesto', 400));
        }

        const canReceive = await notificationPreferencesService.canReceiveNotification(userId, notificationType);
        
        res.status(200).json({
            success: true,
            data: {
                userId,
                notificationType,
                canReceive,
                message: canReceive ? 'Utente può ricevere questa notifica' : 'Utente ha disabilitato questa notifica'
            }
        });

    } catch (error) {
        console.error(`❌ [NotificationPreferencesController] Errore nel controllo permesso per utente ${req.user.id}:`, error);
        return next(new ErrorResponse('Errore nel controllo del permesso notifica', 500));
    }
});

// @desc    Ottiene le preferenze di notifica di un utente specifico (solo admin)
// @route   GET /api/notification-preferences/:userId
// @access  Private/Admin
exports.getUserNotificationPreferences = asyncHandler(async (req, res, next) => {
    // Verifica che l'utente sia admin
    if (req.user.role !== 'admin') {
        return next(new ErrorResponse('Accesso negato: richiesti privilegi di amministratore', 403));
    }

    try {
        const { userId } = req.params;
        const preferences = await notificationPreferencesService.getUserNotificationPreferences(userId);
        
        res.status(200).json({
            success: true,
            data: preferences
        });

    } catch (error) {
        console.error(`❌ [NotificationPreferencesController] Errore nel recupero preferenze per utente ${req.params.userId}:`, error);
        return next(new ErrorResponse('Errore nel recupero delle preferenze utente', 500));
    }
});

// @desc    Aggiorna le preferenze di notifica di un utente specifico (solo admin)
// @route   PUT /api/notification-preferences/:userId
// @access  Private/Admin
exports.updateUserNotificationPreferences = asyncHandler(async (req, res, next) => {
    // Verifica che l'utente sia admin
    if (req.user.role !== 'admin') {
        return next(new ErrorResponse('Accesso negato: richiesti privilegi di amministratore', 403));
    }

    try {
        const { userId } = req.params;
        const { push, email, pushPreferences, geolocation } = req.body;

        // Validazione simile a updateNotificationPreferences
        if (push !== undefined && typeof push !== 'boolean') {
            return next(new ErrorResponse('Il campo push deve essere un booleano', 400));
        }

        if (email !== undefined && typeof email !== 'boolean') {
            return next(new ErrorResponse('Il campo email deve essere un booleano', 400));
        }

        const updatedPreferences = await notificationPreferencesService.updateUserNotificationPreferences(userId, {
            push,
            email,
            pushPreferences,
            geolocation
        });

        res.status(200).json({
            success: true,
            message: 'Preferenze di notifica utente aggiornate con successo',
            data: updatedPreferences
        });

    } catch (error) {
        console.error(`❌ [NotificationPreferencesController] Errore nell'aggiornamento preferenze per utente ${req.params.userId}:`, error);
        return next(new ErrorResponse('Errore nell\'aggiornamento delle preferenze utente', 500));
    }
});

// @desc    Verifica se un utente ha preferenze personalizzate
// @route   GET /api/notification-preferences/:userId/custom
// @access  Private/Admin
exports.hasCustomPreferences = asyncHandler(async (req, res, next) => {
    // Verifica che l'utente sia admin
    if (req.user.role !== 'admin') {
        return next(new ErrorResponse('Accesso negato: richiesti privilegi di amministratore', 403));
    }

    try {
        const { userId } = req.params;
        const hasCustom = await notificationPreferencesService.hasCustomPreferences(userId);
        
        res.status(200).json({
            success: true,
            data: {
                userId,
                hasCustomPreferences: hasCustom,
                message: hasCustom ? 'Utente ha preferenze personalizzate' : 'Utente usa preferenze di default'
            }
        });

    } catch (error) {
        console.error(`❌ [NotificationPreferencesController] Errore nel verificare preferenze personalizzate per utente ${req.params.userId}:`, error);
        return next(new ErrorResponse('Errore nella verifica preferenze personalizzate', 500));
    }
});

// @desc    Testa l'invio di una notifica di prova per verificare le preferenze
// @route   POST /api/notification-preferences/test
// @access  Private
exports.testNotificationPreferences = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { notificationType = 'general' } = req.body;

        // Verifica se l'utente può ricevere questo tipo di notifica
        const canReceive = await notificationPreferencesService.canReceiveNotification(userId, notificationType);
        
        if (!canReceive) {
            return res.status(200).json({
                success: true,
                data: {
                    canReceive: false,
                    message: 'Notifica non inviata - preferenze utente disabilitano questo tipo',
                    notificationType
                }
            });
        }

        // Invia una notifica di prova
        const pushNotificationService = require('./pushNotificationService');
        const testResult = await pushNotificationService.sendPushNotificationWithPreferences(
            userId,
            '🧪 Test Preferenze Notifiche',
            'Questa è una notifica di prova per verificare le tue preferenze',
            { test: true, timestamp: Date.now() },
            notificationType
        );

        res.status(200).json({
            success: true,
            data: {
                canReceive: true,
                message: 'Notifica di prova inviata con successo',
                notificationType,
                testResult
            }
        });

    } catch (error) {
        console.error(`❌ [NotificationPreferencesController] Errore nel test preferenze per utente ${req.user.id}:`, error);
        return next(new ErrorResponse('Errore nel test delle preferenze notifica', 500));
    }
});
