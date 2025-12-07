const asyncHandler = require('express-async-handler');
const interactiveNotificationService = require('../services/interactiveNotificationService');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Controller per la gestione delle azioni delle notifiche interattive
 */

// @desc    Gestisce l'azione di una notifica interattiva
// @route   POST /api/interactive-notifications/action
// @access  Private
exports.handleNotificationAction = asyncHandler(async (req, res, next) => {
    try {
        const { notificationType, action, data } = req.body;
        const userId = req.user.id;

        if (!notificationType || !action) {
            return next(new ErrorResponse('Tipo notifica e azione richiesti', 400));
        }

        console.log(`🎯 [InteractiveNotification] Utente ${userId} esegue azione ${action} per notifica ${notificationType}`);

        let result;

        // Gestisci diverse azioni in base al tipo di notifica
        switch (notificationType) {
            case 'meal_invitation':
                result = await handleMealInvitationAction(userId, action, data);
                break;
            
            case 'meal_join_request':
                result = await handleMealJoinRequestAction(userId, action, data);
                break;
            
            case 'new_message':
                result = await handleNewMessageAction(userId, action, data);
                break;
            
            case 'nearby_meal':
                result = await handleNearbyMealAction(userId, action, data);
                break;
            
            case 'meal_reminder':
                result = await handleMealReminderAction(userId, action, data);
                break;
            
            case 'friend_request':
                result = await handleFriendRequestAction(userId, action, data);
                break;
            
            case 'new_follower':
                result = await handleNewFollowerAction(userId, action, data);
                break;
            
            default:
                return next(new ErrorResponse(`Tipo di notifica non supportato: ${notificationType}`, 400));
        }

        res.status(200).json({
            success: true,
            message: 'Azione eseguita con successo',
            data: result
        });

    } catch (error) {
        console.error(`❌ [InteractiveNotification] Errore nell'esecuzione azione per utente ${req.user.id}:`, error);
        return next(new ErrorResponse('Errore nell\'esecuzione dell\'azione', 500));
    }
});

// @desc    Testa una notifica interattiva
// @route   POST /api/interactive-notifications/test
// @access  Private
exports.testInteractiveNotification = asyncHandler(async (req, res, next) => {
    try {
        const { type, data = {}, options = {} } = req.body;
        const userId = req.user.id;

        if (!type) {
            return next(new ErrorResponse('Tipo di notifica richiesto', 400));
        }

        // Verifica se il tipo è supportato
        if (!interactiveNotificationService.isTypeSupported(type)) {
            return next(new ErrorResponse(`Tipo di notifica non supportato: ${type}`, 400));
        }

        console.log(`🧪 [InteractiveNotification] Test notifica interattiva per utente ${userId}, tipo ${type}`);

        // Invia notifica di test
        const result = await interactiveNotificationService.sendInteractiveNotification(
            userId,
            type,
            data,
            options
        );

        res.status(200).json({
            success: true,
            message: 'Notifica interattiva di test inviata',
            data: result
        });

    } catch (error) {
        console.error(`❌ [InteractiveNotification] Errore nel test notifica per utente ${req.user.id}:`, error);
        return next(new ErrorResponse('Errore nell\'invio notifica di test', 500));
    }
});

// @desc    Ottiene la configurazione per un tipo di notifica
// @route   GET /api/interactive-notifications/config/:type
// @access  Private
exports.getNotificationConfig = asyncHandler(async (req, res, next) => {
    try {
        const { type } = req.params;

        const config = interactiveNotificationService.getNotificationConfig(type);
        
        if (!config) {
            return next(new ErrorResponse(`Configurazione non trovata per tipo: ${type}`, 404));
        }

        res.status(200).json({
            success: true,
            data: config
        });

    } catch (error) {
        console.error('❌ [InteractiveNotification] Errore nel recupero configurazione:', error);
        return next(new ErrorResponse('Errore nel recupero configurazione', 500));
    }
});

// @desc    Ottiene tutti i tipi di notifica supportati
// @route   GET /api/interactive-notifications/types
// @access  Private
exports.getSupportedTypes = asyncHandler(async (req, res, next) => {
    try {
        const types = interactiveNotificationService.getSupportedTypes();

        res.status(200).json({
            success: true,
            data: {
                types,
                count: types.length
            }
        });

    } catch (error) {
        console.error('❌ [InteractiveNotification] Errore nel recupero tipi supportati:', error);
        return next(new ErrorResponse('Errore nel recupero tipi supportati', 500));
    }
});

// ===== FUNZIONI HELPER PER GESTIONE AZIONI =====

/**
 * Gestisce le azioni per le notifiche di invito pasto
 */
async function handleMealInvitationAction(userId, action, data) {
    const { mealId, inviterId } = data;
    
    switch (action) {
        case 'accept_invitation':
            // Logica per accettare invito
            console.log(`✅ [InteractiveNotification] Utente ${userId} accetta invito per pasto ${mealId}`);
            return { action: 'invitation_accepted', mealId, inviterId };
        
        case 'decline_invitation':
            // Logica per rifiutare invito
            console.log(`❌ [InteractiveNotification] Utente ${userId} rifiuta invito per pasto ${mealId}`);
            return { action: 'invitation_declined', mealId, inviterId };
        
        case 'view_meal':
            // Logica per visualizzare pasto
            console.log(`👁️ [InteractiveNotification] Utente ${userId} visualizza pasto ${mealId}`);
            return { action: 'meal_viewed', mealId };
        
        default:
            throw new Error(`Azione non supportata: ${action}`);
    }
}

/**
 * Gestisce le azioni per le notifiche di richiesta partecipazione
 */
async function handleMealJoinRequestAction(userId, action, data) {
    const { mealId, requesterId } = data;
    
    switch (action) {
        case 'accept_join_request':
            // Logica per accettare richiesta
            console.log(`✅ [InteractiveNotification] Host ${userId} accetta richiesta partecipazione per pasto ${mealId} da utente ${requesterId}`);
            return { action: 'join_request_accepted', mealId, requesterId };
        
        case 'decline_join_request':
            // Logica per rifiutare richiesta
            console.log(`❌ [InteractiveNotification] Host ${userId} rifiuta richiesta partecipazione per pasto ${mealId} da utente ${requesterId}`);
            return { action: 'join_request_declined', mealId, requesterId };
        
        case 'view_user_profile':
            // Logica per visualizzare profilo utente
            console.log(`👤 [InteractiveNotification] Host ${userId} visualizza profilo utente ${requesterId}`);
            return { action: 'user_profile_viewed', requesterId };
        
        default:
            throw new Error(`Azione non supportata: ${action}`);
    }
}

/**
 * Gestisce le azioni per le notifiche di nuovo messaggio
 */
async function handleNewMessageAction(userId, action, data) {
    const { chatId, senderId, messageId } = data;
    
    switch (action) {
        case 'reply_message':
            // Logica per rispondere al messaggio
            console.log(`↩️ [InteractiveNotification] Utente ${userId} risponde al messaggio ${messageId} in chat ${chatId}`);
            return { action: 'message_replied', chatId, messageId, senderId };
        
        case 'view_chat':
            // Logica per visualizzare chat
            console.log(`👁️ [InteractiveNotification] Utente ${userId} visualizza chat ${chatId}`);
            return { action: 'chat_viewed', chatId, senderId };
        
        default:
            throw new Error(`Azione non supportata: ${action}`);
    }
}

/**
 * Gestisce le azioni per le notifiche di pasti nelle vicinanze
 */
async function handleNearbyMealAction(userId, action, data) {
    const { mealId, hostId } = data;
    
    switch (action) {
        case 'view_meal':
            // Logica per visualizzare pasto
            console.log(`👁️ [InteractiveNotification] Utente ${userId} visualizza pasto nelle vicinanze ${mealId}`);
            return { action: 'nearby_meal_viewed', mealId, hostId };
        
        case 'join_meal':
            // Logica per partecipare al pasto
            console.log(`🎯 [InteractiveNotification] Utente ${userId} partecipa al pasto nelle vicinanze ${mealId}`);
            return { action: 'nearby_meal_joined', mealId, hostId };
        
        case 'dismiss_notification':
            // Logica per ignorare notifica
            console.log(`🚫 [InteractiveNotification] Utente ${userId} ignora notifica pasto nelle vicinanze ${mealId}`);
            return { action: 'nearby_meal_dismissed', mealId };
        
        default:
            throw new Error(`Azione non supportata: ${action}`);
    }
}

/**
 * Gestisce le azioni per le notifiche di promemoria pasto
 */
async function handleMealReminderAction(userId, action, data) {
    const { mealId } = data;
    
    switch (action) {
        case 'view_meal':
            // Logica per visualizzare pasto
            console.log(`👁️ [InteractiveNotification] Utente ${userId} visualizza promemoria pasto ${mealId}`);
            return { action: 'reminder_viewed', mealId };
        
        case 'snooze_reminder':
            // Logica per rimandare promemoria
            console.log(`⏸️ [InteractiveNotification] Utente ${userId} rimanda promemoria pasto ${mealId}`);
            return { action: 'reminder_snoozed', mealId };
        
        default:
            throw new Error(`Azione non supportata: ${action}`);
    }
}

/**
 * Gestisce le azioni per le notifiche di richiesta amicizia
 */
async function handleFriendRequestAction(userId, action, data) {
    const { requesterId } = data;
    
    switch (action) {
        case 'accept_friend_request':
            // Logica per accettare richiesta amicizia
            console.log(`✅ [InteractiveNotification] Utente ${userId} accetta richiesta amicizia da ${requesterId}`);
            return { action: 'friend_request_accepted', requesterId };
        
        case 'decline_friend_request':
            // Logica per rifiutare richiesta amicizia
            console.log(`❌ [InteractiveNotification] Utente ${userId} rifiuta richiesta amicizia da ${requesterId}`);
            return { action: 'friend_request_declined', requesterId };
        
        case 'view_user_profile':
            // Logica per visualizzare profilo utente
            console.log(`👤 [InteractiveNotification] Utente ${userId} visualizza profilo utente ${requesterId}`);
            return { action: 'user_profile_viewed', requesterId };
        
        default:
            throw new Error(`Azione non supportata: ${action}`);
    }
}

/**
 * Gestisce le azioni per le notifiche di nuovo follower
 */
async function handleNewFollowerAction(userId, action, data) {
    const { followerId } = data;
    
    switch (action) {
        case 'follow_back':
            // Logica per seguire l'utente
            console.log(`👥 [InteractiveNotification] Utente ${userId} segue l'utente ${followerId}`);
            return { action: 'user_followed_back', followerId };
        
        case 'view_user_profile':
            // Logica per visualizzare profilo utente
            console.log(`👤 [InteractiveNotification] Utente ${userId} visualizza profilo utente ${followerId}`);
            return { action: 'user_profile_viewed', followerId };
        
        default:
            throw new Error(`Azione non supportata: ${action}`);
    }
}

// @desc    Esegue azione immediata senza notifica (per test)
// @route   POST /api/interactive-notifications/execute-action
// @access  Private
exports.executeActionImmediately = asyncHandler(async (req, res, next) => {
    try {
        const { notificationType, action, data } = req.body;
        const userId = req.user.id;

        if (!notificationType || !action) {
            return next(new ErrorResponse('Tipo notifica e azione richiesti', 400));
        }

        console.log(`⚡ [InteractiveNotification] Esecuzione immediata azione ${action} per notifica ${notificationType}`);

        // Esegui l'azione immediatamente
        let result;
        
        switch (notificationType) {
            case 'meal_invitation':
                result = await handleMealInvitationAction(userId, action, data);
                break;
            
            case 'meal_join_request':
                result = await handleMealJoinRequestAction(userId, action, data);
                break;
            
            case 'new_message':
                result = await handleNewMessageAction(userId, action, data);
                break;
            
            case 'nearby_meal':
                result = await handleNearbyMealAction(userId, action, data);
                break;
            
            case 'meal_reminder':
                result = await handleMealReminderAction(userId, action, data);
                break;
            
            case 'friend_request':
                result = await handleFriendRequestAction(userId, action, data);
                break;
            
            case 'new_follower':
                result = await handleNewFollowerAction(userId, action, data);
                break;
            
            default:
                return next(new ErrorResponse(`Tipo di notifica non supportato: ${notificationType}`, 400));
        }

        res.status(200).json({
            success: true,
            message: 'Azione eseguita immediatamente con successo',
            data: result
        });

    } catch (error) {
        console.error(`❌ [InteractiveNotification] Errore nell'esecuzione immediata azione per utente ${req.user.id}:`, error);
        return next(new ErrorResponse('Errore nell\'esecuzione immediata dell\'azione', 500));
    }
});
