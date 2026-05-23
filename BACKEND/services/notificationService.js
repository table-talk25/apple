// File: BACKEND/services/notificationService.js

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

let connectedUsers;

// Inizializza Firebase Admin (SE NON FATTO)
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

const initialize = (usersMap) => {
  connectedUsers = usersMap;
};

const sendPushNotification = async (userToken, title, body, data = {}) => {
  try {
    if (!admin.apps.length) throw new Error('Firebase Admin non inizializzato');

    const message = {
      token: userToken,
      notification: { title, body },
      data: { ...data, timestamp: new Date().toISOString() },
      android: {
        notification: { icon: 'ic_notification', color: '#FF6B35', sound: 'default' }
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } }
      }
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
  if (!connectedUsers) return console.error('NotificationService non inizializzato.');

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
    console.log(`✅ Notifica combinata inviata a utente ${userId}`);
  } catch (error) {
    console.error(`❌ Errore notifica combinata per utente ${userId}:`, error);
  }
};

/**
 * Gestisce le notifiche per un nuovo messaggio in chat.
 *
 * Logica:
 * - L'utente sta guardando QUELLA chat (è nella socket room della chat) → niente notifica
 * - L'utente è nell'app ma in un'altra schermata (online ma non nella room) → in-app alert via Socket
 * - L'utente è offline → push notification Firebase
 */
const handleChatNotification = async (chat, sender, content, newMessage) => {
  try {
    const User = require('../models/User');
    const { getIO } = require('../socket');

    const recipientIds = chat.participants
      .map(p => (p._id || p).toString())
      .filter(id => id !== sender._id.toString());

    if (recipientIds.length === 0) return;

    const recipients = await User.find(
      { _id: { $in: recipientIds } },
      'nickname fcmToken'
    );

    const senderName = sender.nickname || 'Qualcuno';
    const preview = content.length > 60 ? content.substring(0, 60) + '...' : content;
    const chatId = chat._id.toString();
    const io = getIO();

    for (const recipient of recipients) {
      const recipientIdStr = recipient._id.toString();
      const socketId = connectedUsers && connectedUsers.get(recipientIdStr);
      const isOnline = !!socketId;

      // Controlla se l'utente è attivamente nella room di questa chat
      let isInChatRoom = false;
      if (isOnline && io && socketId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.rooms.has(chatId)) {
          isInChatRoom = true;
        }
      }

      if (isInChatRoom) {
        // Sta guardando la chat → niente da fare, riceve già i messaggi in tempo reale
        console.log(`👁️ [ChatNotification] ${recipient.nickname} è nella chat, nessuna notifica necessaria`);

      } else if (isOnline && socketId) {
        // È nell'app ma in un'altra schermata → in-app alert via Socket
        if (io) {
          io.to(socketId).emit('new_chat_message_alert', {
            chatId,
            senderId: sender._id.toString(),
            senderName,
            senderAvatar: sender.profileImage || null,
            preview,
            timestamp: new Date().toISOString()
          });
          console.log(`🔔 [ChatNotification] In-app alert inviato a ${recipient.nickname} (online, altra schermata)`);
        }
        // Manda anche la push per chi ha l'app in background (es. schermata bloccata)
        if (recipient.fcmToken && admin.apps.length) {
          await sendPushNotification(
            recipient.fcmToken,
            `💬 ${senderName}`,
            preview,
            { type: 'new_message', chatId, senderId: sender._id.toString(), senderName }
          );
        }

      } else {
        // Offline → solo push notification
        if (recipient.fcmToken && admin.apps.length) {
          await sendPushNotification(
            recipient.fcmToken,
            `💬 ${senderName}`,
            preview,
            { type: 'new_message', chatId, senderId: sender._id.toString(), senderName }
          );
          console.log(`📱 [ChatNotification] Push inviata a ${recipient.nickname} (offline)`);
        } else {
          console.log(`⚠️ [ChatNotification] ${recipient.nickname} offline e senza FCM token`);
        }
      }
    }
  } catch (error) {
    console.error('❌ [ChatNotification] Errore:', error.message);
  }
};

module.exports = { initialize, sendNotification, sendPushNotification, sendCombinedNotification, handleChatNotification };
