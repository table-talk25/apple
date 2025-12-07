// File: BACKEND/routes/notifications.js
// Gestione notifiche e registrazione device

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  sendPushNotification,
  sendChatNotification,
  sendInvitationNotification,
  sendInvitationAcceptedNotification,
  sendMealReminderNotification,
  sendMealUpdateNotification,
  getFirebaseStatus
} = require('../services/pushNotificationService');
const { 
  getMyNotifications, 
  markNotificationsAsRead 
} = require('../controllers/notificationsController');

// Modello per salvare i token dei device (da creare)
// const DeviceToken = require('../models/DeviceToken');

/**
 * GET /api/notifications
 * Ottieni le notifiche dell'utente loggato
 */
router.get('/', protect, getMyNotifications);

/**
 * POST /api/notifications/read
 * Segna le notifiche come lette
 */
router.post('/read', protect, markNotificationsAsRead);

/**
 * POST /api/notifications/register-device
 * Registra un nuovo token di dispositivo per un utente
 */
router.post('/register-device', protect, async (req, res) => {
  try {
    const { token, platform, deviceId } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token FCM richiesto' 
      });
    }

    console.log(`[Notifications] Registrazione device per utente ${userId}:`, {
      token: token.substring(0, 20) + '...',
      platform,
      deviceId
    });

    // TODO: Salva il token nel database
    // await DeviceToken.findOneAndUpdate(
    //   { userId, deviceId },
    //   { 
    //     userId, 
    //     token, 
    //     platform, 
    //     deviceId,
    //     lastSeen: new Date()
    //   },
    //   { upsert: true, new: true }
    // );

    // Per ora, logghiamo solo il token
    console.log(`[Notifications] Device registrato per utente ${userId}`);

    res.json({ 
      success: true, 
      message: 'Device registrato con successo' 
    });

  } catch (error) {
    console.error('[Notifications] Errore registrazione device:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server' 
    });
  }
});

/**
 * POST /api/notifications/send-test
 * Invia una notifica di test (solo per admin)
 */
router.post('/send-test', protect, async (req, res) => {
  try {
    // Verifica che l'utente sia admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accesso negato' 
      });
    }

    const { tokens, title, body, type } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Array di token richiesto' 
      });
    }

    console.log(`[Notifications] Invio notifica di test a ${tokens.length} dispositivi`);

    const result = await sendPushNotification(
      tokens, 
      title || 'Test TableTalk', 
      body || 'Questa è una notifica di test', 
      { test: true }, 
      type || 'test'
    );

    res.json({ 
      success: true, 
      message: 'Notifica di test inviata',
      result: {
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalCount: tokens.length
      }
    });

  } catch (error) {
    console.error('[Notifications] Errore invio notifica di test:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nell\'invio della notifica',
      error: error.message
    });
  }
});

/**
 * GET /api/notifications/status
 * Ottieni lo stato del servizio notifiche
 */
router.get('/status', protect, async (req, res) => {
  try {
    const status = getFirebaseStatus();
    
    res.json({ 
      success: true, 
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Notifications] Errore nel controllo status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nel controllo dello status' 
    });
  }
});

/**
 * POST /api/notifications/send-chat
 * Invia notifica per nuovo messaggio in chat
 */
router.post('/send-chat', protect, async (req, res) => {
  try {
    const { tokens, senderName, message, chatId } = req.body;

    if (!tokens || !senderName || !message || !chatId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parametri mancanti' 
      });
    }

    const result = await sendChatNotification(tokens, senderName, message, chatId);

    res.json({ 
      success: true, 
      message: 'Notifica chat inviata',
      result
    });

  } catch (error) {
    console.error('[Notifications] Errore invio notifica chat:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nell\'invio della notifica chat' 
    });
  }
});

/**
 * POST /api/notifications/send-invitation
 * Invia notifica per nuovo invito
 */
router.post('/send-invitation', protect, async (req, res) => {
  try {
    const { tokens, inviterName, mealTitle } = req.body;

    if (!tokens || !inviterName || !mealTitle) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parametri mancanti' 
      });
    }

    const result = await sendInvitationNotification(tokens, inviterName, mealTitle);

    res.json({ 
      success: true, 
      message: 'Notifica invito inviata',
      result
    });

  } catch (error) {
    console.error('[Notifications] Errore invio notifica invito:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nell\'invio della notifica invito' 
    });
  }
});

/**
 * POST /api/notifications/send-meal-reminder
 * Invia notifica promemoria pasto
 */
router.post('/send-meal-reminder', protect, async (req, res) => {
  try {
    const { tokens, mealTitle, mealTime } = req.body;

    if (!tokens || !mealTitle || !mealTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parametri mancanti' 
      });
    }

    const result = await sendMealReminderNotification(tokens, mealTitle, mealTime);

    res.json({ 
      success: true, 
      message: 'Notifica promemoria inviata',
      result
    });

  } catch (error) {
    console.error('[Notifications] Errore invio notifica promemoria:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nell\'invio della notifica promemoria' 
    });
  }
});

module.exports = router;