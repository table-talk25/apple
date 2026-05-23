// File: BACKEND/services/notificationService.js

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

// Inizializza Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      try {
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(fileContent);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log('✅ Firebase Admin SDK inizializzato per push notifications');
      } catch (parseError) {
        console.error('❌ Errore nel parsing del file Firebase:', parseError.message);
      }
    } else {
      console.log('⚠️  File firebase-service-account.json non trovato - Firebase verrà inizializzato in server.js');
    }
  } catch (error) {
    console.error('❌ Errore inizializzazione Firebase Admin:', error.message);
  }
}

// Ottieni connectedUsers direttamente da socket.js (lazy require per evitare
// circular dependency al boot). La mappa è la stessa istanza usata dal server.
const getConnectedUsers = () => {
  try {
    return require('../socket').connectedUsers;
  } catch {
    return null;
  }
};

// Mantenuto per compatibilità con eventuali chiamate esistenti — ora è no-op.
const initialize = () => {};

const sendPushNotification = async (userToken, title, body, data = {}) => {
  try {
    if (!admin.apps.length) throw new Error('Firebase Admin non inizializzato');
    const message = {
      token: userToken,
      notification: { title, body },
      data: { ...data, timestamp: new Date().toISOString() },
      android: { notification: { icon: 'ic_notification', color: '#FF6B35', sound: 'default' } },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };
    const response = await admin.messaging().send(message);
    console.log('📱 Push notification sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Push notification error:', error);
    throw error;
  }
};

const sendNotification = (recipientIds, type, message, data = {}) => {
  const connectedUsers = getConnectedUsers();
  if (!connectedUsers) return console.error('NotificationService: connectedUsers non disponibile.');
  const notificationPayload = { type, message, data, date: new Date() };
  const recipients = Array.isArray(recipientIds) ? recipientIds : [recipientIds];
  recipients.forEach(userId => {
    const socketId = connectedUsers.get(userId.toString());
    if (socketId) {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        io.to(socketId).emit('new_notification', notificationPayload);
        console.log(`[Notification] Inviata notifica di tipo '${type}' a utente ${userId}`);
      }
    }
  });
};

const sendCombinedNotification = async (userId, fcmToken, type, title, message, data = {}) => {
  try {
    sendNotification([userId], type, message, data);
    if (fcmToken) {
      await sendPushNotification(fcmToken, title, message, { type, userId, ...data });
    }
  } catch (error) {
    console.error(`❌ Errore notifica combinata per utente ${userId}:`, error);
  }
};

/**
 * Notifica nuovo messaggio in chat.
 * - Nella room → niente
 * - Online ma altrove → socket in-app + push
 * - Offline → solo push
 */
const handleChatNotification = async (chat, sender, content, newMessage) => {
  try {
    const User = require('../models/User');
    const { getIO } = require('../socket');
    const connectedUsers = getConnectedUsers();

    const recipientIds = chat.participants
      .map(p => (p._id || p).toString())
      .filter(id => id !== sender._id.toString());
    if (recipientIds.length === 0) return;

    const recipients = await User.find({ _id: { $in: recipientIds } }, 'nickname fcmToken');
    const senderName = sender.nickname || 'Qualcuno';
    const preview = content.length > 60 ? content.substring(0, 60) + '...' : content;
    const chatId = chat._id.toString();
    const io = getIO();

    for (const recipient of recipients) {
      const recipientIdStr = recipient._id.toString();
      const socketId = connectedUsers ? connectedUsers.get(recipientIdStr) : null;
      const isOnline = !!socketId;

      let isInChatRoom = false;
      if (isOnline && io && socketId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.rooms.has(chatId)) isInChatRoom = true;
      }

      console.log(`[ChatNotification] ${recipient.nickname} — online: ${isOnline}, inRoom: ${isInChatRoom}`);

      if (isInChatRoom) {
        console.log(`👁️ [ChatNotification] ${recipient.nickname} è nella chat, nessuna notifica`);
      } else if (isOnline && socketId) {
        if (io) {
          io.to(socketId).emit('new_chat_message_alert', {
            chatId,
            senderId: sender._id.toString(),
            senderName,
            senderAvatar: sender.profileImage || null,
            preview,
            timestamp: new Date().toISOString(),
          });
          console.log(`🔔 [ChatNotification] In-app alert → ${recipient.nickname}`);
        }
        if (recipient.fcmToken && admin.apps.length) {
          await sendPushNotification(
            recipient.fcmToken,
            `💬 ${senderName}`,
            preview,
            { type: 'new_message', chatId, senderId: sender._id.toString(), senderName }
          ).catch(e => console.warn('[ChatNotification] Push fallita:', e.message));
        }
      } else {
        if (recipient.fcmToken && admin.apps.length) {
          await sendPushNotification(
            recipient.fcmToken,
            `💬 ${senderName}`,
            preview,
            { type: 'new_message', chatId, senderId: sender._id.toString(), senderName }
          ).catch(e => console.warn('[ChatNotification] Push fallita (offline):', e.message));
          console.log(`📱 [ChatNotification] Push → ${recipient.nickname} (offline)`);
        }
      }
    }
  } catch (error) {
    console.error('❌ [ChatNotification] Errore:', error.message);
  }
};

/**
 * Notifica reminder 30 minuti prima del pasto.
 */
const handleMealReminder = async (meal) => {
  try {
    const User = require('../models/User');
    const { getIO } = require('../socket');
    const connectedUsers = getConnectedUsers();
    const io = getIO();

    const participantIds = meal.participants.map(p => (p._id || p).toString());
    const participants = await User.find({ _id: { $in: participantIds } }, 'nickname fcmToken');
    const mealTitle = meal.title || 'Il tuo pasto';
    const mealId = meal._id.toString();

    for (const participant of participants) {
      const socketId = connectedUsers ? connectedUsers.get(participant._id.toString()) : null;

      if (socketId && io) {
        io.to(socketId).emit('meal_reminder', { mealId, mealTitle });
        console.log(`⏰ [MealReminder] Socket → ${participant.nickname}`);
      }

      if (participant.fcmToken && admin.apps.length) {
        await sendPushNotification(
          participant.fcmToken,
          `⏰ ${mealTitle}`,
          'Il tuo pasto inizia tra 30 minuti!',
          { type: 'meal_reminder', mealId }
        ).catch(e => console.warn('[MealReminder] Push fallita:', e.message));
      }
    }
  } catch (error) {
    console.error('❌ [MealReminder] Errore:', error.message);
  }
};

/**
 * Notifica quando la video chat diventa disponibile.
 */
const handleVideoCallAvailable = async (meal) => {
  try {
    const User = require('../models/User');
    const { getIO } = require('../socket');
    const connectedUsers = getConnectedUsers();
    const io = getIO();

    const participantIds = meal.participants.map(p => (p._id || p).toString());
    const hostId = (meal.host?._id || meal.host || '').toString();
    const recipientIds = participantIds.filter(id => id !== hostId);

    const recipients = await User.find({ _id: { $in: recipientIds } }, 'nickname fcmToken');
    const mealTitle = meal.title || 'Il tuo pasto';
    const mealId = meal._id.toString();

    for (const recipient of recipients) {
      const socketId = connectedUsers ? connectedUsers.get(recipient._id.toString()) : null;

      if (socketId && io) {
        io.to(socketId).emit('video_call_available', { mealId, mealTitle });
        console.log(`🎥 [VideoCall] Socket → ${recipient.nickname}`);
      }

      if (recipient.fcmToken && admin.apps.length) {
        await sendPushNotification(
          recipient.fcmToken,
          `🎥 ${mealTitle}`,
          'La video chat è disponibile! Unisciti ora.',
          { type: 'video_call_available', mealId }
        ).catch(e => console.warn('[VideoCall] Push fallita:', e.message));
      }
    }
  } catch (error) {
    console.error('❌ [VideoCall] Errore:', error.message);
  }
};

module.exports = {
  initialize,
  sendNotification,
  sendPushNotification,
  sendCombinedNotification,
  handleChatNotification,
  handleMealReminder,
  handleVideoCallAvailable,
};
