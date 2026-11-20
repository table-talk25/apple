// File: BACKEND/controllers/notificationsController.js

const asyncHandler = require('express-async-handler');
const Meal = require('../models/Meal');
const Chat = require('../models/Chat');
const User = require('../models/User');
const admin = require('firebase-admin');

/**
 * @desc    Ottenere le notifiche per l'utente loggato (pasti + messaggi chat)
 * @route   GET /api/notifications
 */
exports.getMyNotifications = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;
  const userId = req.user.id;

  // 1. Notifiche dei pasti
  const mealsWithNotifications = await Meal.find({
    'notifications.recipient': userId,
  }).select('notifications title _id');

  const mealNotifications = mealsWithNotifications.flatMap((meal) =>
    meal.notifications
      .filter((notif) => notif.recipient.toString() === userId)
      .map((notif) => ({
        ...notif.toObject(),
        mealId: meal._id,
        mealTitle: meal.title,
      }))
  );

  // 2. Notifiche dei messaggi recenti nelle chat attive dell'utente (inviati da altri)
  const userChats = await Chat.find({
    participants: userId,
    status: { $ne: 'closed' },
  })
    .populate('mealId', 'title status')
    .lean();

  const chatNotifications = [];
  for (const chat of userChats) {
    const msgs = Array.isArray(chat.messages) ? chat.messages : [];
    const incoming = msgs.filter((m) => {
      const sid = m.sender && m.sender._id ? m.sender._id.toString() : (m.sender ? m.sender.toString() : '');
      return sid && sid !== userId;
    });
    if (incoming.length === 0) continue;

    const latest = incoming[incoming.length - 1];
    const readArr = Array.isArray(latest.read) ? latest.read : [];
    const isInRead = readArr.some((r) => (r && r._id ? r._id.toString() : String(r)) === userId);
    const readByArr = Array.isArray(latest.readBy) ? latest.readBy : [];
    const isInReadBy = readByArr.some((r) => {
      const uid = r && r.user ? (r.user._id ? r.user._id.toString() : r.user.toString()) : (r ? r.toString() : '');
      return uid === userId;
    });
    const isRead = isInRead || isInReadBy;
    const senderName = (latest.sender && latest.sender.nickname) || 'Partecipante';
    const rawContent = typeof latest.content === 'string' ? latest.content : '';
    const preview = rawContent.length > 60 ? `${rawContent.substring(0, 60)}...` : rawContent;

    chatNotifications.push({
      _id: `chat_${chat._id}_${latest._id}`,
      type: 'new_message',
      chatId: chat._id.toString(),
      senderName,
      preview,
      message: `💬 ${senderName}: ${preview}`,
      read: isRead,
      isRead,
      createdAt: latest.timestamp || latest.createdAt || chat.updatedAt,
    });
  }

  // Uniamo e ordiniamo strettamente dalla più recente alla più vecchia
  let userNotifications = [...mealNotifications, ...chatNotifications].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

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
  await Promise.all([
    Meal.updateMany(
      { 'notifications.recipient': req.user.id, 'notifications.read': false },
      { $set: { 'notifications.$[].read': true } }
    ),
    Chat.updateMany(
      { participants: req.user.id, status: { $ne: 'closed' } },
      { $addToSet: { 'messages.$[].read': req.user.id } }
    ),
  ]);

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