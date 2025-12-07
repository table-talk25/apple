const asyncHandler = require('express-async-handler');
const geolocationNotificationService = require('../services/geolocationNotificationService');
const geolocationNotificationJob = require('../jobs/geolocationNotificationJob');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Controller per le notifiche geolocalizzate
 */

// @desc    Aggiorna le impostazioni geolocalizzate dell'utente
// @route   PUT /api/geolocation/settings
// @access  Private
exports.updateGeolocationSettings = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const { enabled, radius, maxDistance, mealTypes } = req.body;

    // Validazione dei dati in ingresso
    if (enabled !== undefined && typeof enabled !== 'boolean') {
        return next(new ErrorResponse('Il campo enabled deve essere un booleano', 400));
    }

    if (radius !== undefined && (typeof radius !== 'number' || radius < 1 || radius > 50)) {
        return next(new ErrorResponse('Il raggio deve essere un numero tra 1 e 50 km', 400));
    }

    if (maxDistance !== undefined && (typeof maxDistance !== 'number' || maxDistance < 1 || maxDistance > 50)) {
        return next(new ErrorResponse('La distanza massima deve essere un numero tra 1 e 50 km', 400));
    }

    if (mealTypes !== undefined && (!Array.isArray(mealTypes) || mealTypes.length === 0)) {
        return next(new ErrorResponse('I tipi di pasto devono essere un array non vuoto', 400));
    }

    // Validazione dei tipi di pasto
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'aperitif'];
    if (mealTypes && mealTypes.some(type => !validMealTypes.includes(type))) {
        return next(new ErrorResponse(`Tipi di pasto non validi. Valori consentiti: ${validMealTypes.join(', ')}`, 400));
    }

    try {
        const result = await geolocationNotificationService.updateUserGeolocationSettings(userId, {
            enabled,
            radius,
            maxDistance,
            mealTypes
        });

        if (!result.success) {
            return next(new ErrorResponse(result.message, 400));
        }

        res.status(200).json({
            success: true,
            message: 'Impostazioni geolocalizzate aggiornate con successo',
            data: result.settings
        });

    } catch (error) {
        console.error(`❌ [GeolocationController] Errore nell'aggiornamento impostazioni per utente ${userId}:`, error);
        return next(new ErrorResponse('Errore nell\'aggiornamento delle impostazioni', 500));
    }
});

// @desc    Ottiene le impostazioni geolocalizzate dell'utente
// @route   GET /api/geolocation/settings
// @access  Private
exports.getGeolocationSettings = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;

    try {
        const user = await require('../models/User').findById(userId)
            .select('settings.notifications.geolocation location');

        if (!user) {
            return next(new ErrorResponse('Utente non trovato', 404));
        }

        const settings = user.settings?.notifications?.geolocation || {
            enabled: false,
            radius: 10,
            maxDistance: 10,
            mealTypes: ['breakfast', 'lunch', 'dinner', 'aperitif']
        };

        const hasLocation = user.location && 
                           user.location.coordinates && 
                           user.location.coordinates.length === 2;

        res.status(200).json({
            success: true,
            data: {
                settings,
                hasLocation,
                location: user.location
            }
        });

    } catch (error) {
        console.error(`❌ [GeolocationController] Errore nel recupero impostazioni per utente ${userId}:`, error);
        return next(new ErrorResponse('Errore nel recupero delle impostazioni', 500));
    }
});

// @desc    Testa le notifiche geolocalizzate per l'utente corrente
// @route   POST /api/geolocation/test
// @access  Private
exports.testGeolocationNotifications = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;

    try {
        // Verifica che l'utente abbia le notifiche geolocalizzate abilitate
        const user = await require('../models/User').findById(userId)
            .select('settings.notifications.geolocation location');

        if (!user) {
            return next(new ErrorResponse('Utente non trovato', 404));
        }

        if (!user.settings?.notifications?.geolocation?.enabled) {
            return next(new ErrorResponse('Le notifiche geolocalizzate non sono abilitate', 400));
        }

        if (!user.location || !user.location.coordinates) {
            return next(new ErrorResponse('Posizione utente non configurata', 400));
        }

        // Trova pasti recenti nelle vicinanze per testare
        const nearbyUsers = await geolocationNotificationService.findNearbyUsers(
            user.location,
            user.settings.notifications.geolocation.maxDistance
        );

        // Filtra per includere solo l'utente corrente
        const currentUserNearby = nearbyUsers.filter(item => item.user._id.toString() === userId);

        if (currentUserNearby.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Test completato: nessun pasto nelle vicinanze trovato',
                data: {
                    hasNearbyMeals: false,
                    userLocation: user.location,
                    maxDistance: user.settings.notifications.geolocation.maxDistance
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Test completato: pasti nelle vicinanze trovati',
            data: {
                hasNearbyMeals: true,
                userLocation: user.location,
                maxDistance: user.settings.notifications.geolocation.maxDistance,
                nearbyMeals: currentUserNearby.length
            }
        });

    } catch (error) {
        console.error(`❌ [GeolocationController] Errore nel test notifiche per utente ${userId}:`, error);
        return next(new ErrorResponse('Errore durante il test delle notifiche', 500));
    }
});

// @desc    Ottiene le statistiche del servizio geolocalizzato (solo admin)
// @route   GET /api/geolocation/stats
// @access  Private/Admin
exports.getServiceStats = asyncHandler(async (req, res, next) => {
    // Verifica che l'utente sia admin
    if (req.user.role !== 'admin') {
        return next(new ErrorResponse('Accesso negato: richiesti privilegi di amministratore', 403));
    }

    try {
        const stats = await geolocationNotificationJob.getServiceStats();

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ [GeolocationController] Errore nel recupero statistiche servizio:', error);
        return next(new ErrorResponse('Errore nel recupero delle statistiche', 500));
    }
});

// @desc    Esegue manualmente il job di notifiche geolocalizzate (solo admin)
// @route   POST /api/geolocation/execute-job
// @access  Private/Admin
exports.executeJobManually = asyncHandler(async (req, res, next) => {
    // Verifica che l'utente sia admin
    if (req.user.role !== 'admin') {
        return next(new ErrorResponse('Accesso negato: richiesti privilegi di amministratore', 403));
    }

    const { hoursBack = 24 } = req.body;

    try {
        const result = await geolocationNotificationJob.executeManual(hoursBack);

        res.status(200).json({
            success: true,
            message: 'Job eseguito manualmente',
            data: result
        });

    } catch (error) {
        console.error('❌ [GeolocationController] Errore nell\'esecuzione manuale del job:', error);
        return next(new ErrorResponse('Errore nell\'esecuzione del job', 500));
    }
});

// @desc    Ottiene lo stato del job di notifiche geolocalizzate (solo admin)
// @route   GET /api/geolocation/job-status
// @access  Private/Admin
exports.getJobStatus = asyncHandler(async (req, res, next) => {
    // Verifica che l'utente sia admin
    if (req.user.role !== 'admin') {
        return next(new ErrorResponse('Accesso negato: richiesti privilegi di amministratore', 403));
    }

    try {
        const status = geolocationNotificationJob.getStatus();

        res.status(200).json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('❌ [GeolocationController] Errore nel recupero stato job:', error);
        return next(new ErrorResponse('Errore nel recupero dello stato del job', 500));
    }
});

// @desc    Aggiorna la configurazione del job (solo admin)
// @route   PUT /api/geolocation/job-config
// @access  Private/Admin
exports.updateJobConfig = asyncHandler(async (req, res, next) => {
    // Verifica che l'utente sia admin
    if (req.user.role !== 'admin') {
        return next(new ErrorResponse('Accesso negato: richiesti privilegi di amministratore', 403));
    }

    const { cronExpression } = req.body;

    if (!cronExpression) {
        return next(new ErrorResponse('Espressione cron richiesta', 400));
    }

    try {
        geolocationNotificationJob.updateConfig(cronExpression);

        res.status(200).json({
            success: true,
            message: 'Configurazione job aggiornata con successo',
            data: {
                cronExpression,
                nextRun: geolocationNotificationJob.getNextRunTime(cronExpression)
            }
        });

    } catch (error) {
        console.error('❌ [GeolocationController] Errore nell\'aggiornamento configurazione job:', error);
        return next(new ErrorResponse(error.message, 400));
    }
});

// @desc    Testa la connessione ai servizi geolocalizzati (solo admin)
// @route   POST /api/geolocation/test-connection
// @access  Private/Admin
exports.testConnection = asyncHandler(async (req, res, next) => {
    // Verifica che l'utente sia admin
    if (req.user.role !== 'admin') {
        return next(new ErrorResponse('Accesso negato: richiesti privilegi di amministratore', 403));
    }

    try {
        const result = await geolocationNotificationJob.testConnection();

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('❌ [GeolocationController] Errore nel test connessione:', error);
        return next(new ErrorResponse('Errore durante il test della connessione', 500));
    }
});
