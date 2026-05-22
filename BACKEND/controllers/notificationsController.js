// File: BACKEND/controllers/notificationsController.js

const asyncHandler = require('express-async-handler');
const Meal = require('../models/Meal');
const User = require('../models/User');
const admin = require('firebase-admin');

/**
 * @desc    Ottenere le notifiche per l'utente loggato
 * @route   GET /api/notifications
 */
exports.getMyNotifications = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const skip = (page - 1) * limit;

  // Troviamo tutti i pasti dove l'utente loggato è il destinatario di una notifica
  const mealsWithNotifications = await Meal.find({ 
    'notifications.recipient': req.user.id 
  }).select('notifications title _id');

  // Estraiamo e filtriamo solo le notifiche per l'utente corrente
  let userNotifications = mealsWithNotifications.flatMap(meal => 
    meal.notifications
      .filter(notif => notif.recipient.toString() === req.user.id)
      .map(notif => ({
        ...notif.toObject(),
        mealId: meal._id, // Aggiungiamo l'ID del pasto per creare un link
        mealTitle: meal.title, // E il titolo
      }))
  ).sort((a, b) => b.createdAt - a.createdAt); // Ordiniamo dalla più recente

  const total = userNotifications.length;
  userNotifications = userNotifications.slice(skip, skip + limit);

  res.status(200).json({
    success: true,
    count: userNotifications.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: userNotifications,
  });
});

/**
 * @desc    Segnare le notifiche come lette
 * @route   POST /api/notifications/read
 */
exports.markNotificationsAsRead = asyncHandler(async (req, res, next) => {
    await Meal.updateMany(
        { 'notifications.recipient': req.user.id, 'notifications.read': false },
        { $set: { 'notifications.$[].read': true } }
    );

    res.status(200).json({ success: true, message: 'Notifiche segnate come lette' });
});

/**
 * @desc    Salvare il token FCM per l'utente
 * @route   POST /api/notifications/fcm-token
 */
exports.saveFcmToken = asyncHandler(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Token FCM richiesto'
    });
  }

  // Salva il token FCM per l'utente
  await User.findByIdAndUpdate(req.user.id, { fcmToken: token });

  res.status(200).json({
    success: true,
    message: 'Token FCM salvato con successo'
  });
});

/**
 * @desc    Inviare una notifica push a un utente specifico
 * @param   {string} userId - ID dell'utente destinatario
 * @param   {string} title - Titolo della notifica
 * @param   {string} body - Corpo della notifica
 * @param   {object} data - Dati aggiuntivi (opzionale)
 */
exports.sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    // Recupera l'utente e il suo token FCM
    const user = await User.findById(userId).select('fcmToken');
    
    if (!user || !user.fcmToken) {
      console.log(`Nessun token FCM trovato per l'utente ${userId}`);
      return false;
    }

    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      token: user.fcmToken
    };

    // Invia la notifica tramite Firebase Admin SDK
    const response = await admin.messaging().send(message);
    console.log(`Notifica inviata con successo a ${userId}:`, response);
    return true;

  } catch (error) {
    console.error(`Errore nell'invio della notifica a ${userId}:`, error);
    
    // Se il token non è più valido, rimuovilo dal database
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      await User.findByIdAndUpdate(userId, { fcmToken: null });
      console.log(`Token FCM rimosso per l'utente ${userId} (non più valido)`);
    }
    
    return false;
  }
};