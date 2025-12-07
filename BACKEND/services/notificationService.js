// File: BACKEND/services/notificationService.js

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

let io;
let connectedUsers;

// Inizializza Firebase Admin (SE NON FATTO)
// Nota: Firebase viene già inizializzato in server.js, quindi questo blocco
// serve solo come fallback se il servizio viene usato indipendentemente
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      try {
        // Usa readFileSync invece di require per evitare errori
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(fileContent);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK inizializzato per push notifications');
      } catch (parseError) {
        console.error('❌ Errore nel parsing del file Firebase:', parseError.message);
      }
    } else {
      // File non trovato - Firebase sarà inizializzato in modalità limitata in server.js
      console.log('⚠️  File firebase-service-account.json non trovato - Firebase verrà inizializzato in server.js');
    }
  } catch (error) {
    console.error('❌ Errore inizializzazione Firebase Admin:', error.message);
    console.log('⚠️ Push notifications non disponibili');
  }
}

// Questa funzione viene chiamata una volta in server.js per dargli gli strumenti
const initialize = (usersMap) => {
  connectedUsers = usersMap;
};

/**
 * Invia push notification tramite Firebase
 * @param {string} userToken - FCM token dell'utente
 * @param {string} title - Titolo della notifica
 * @param {string} body - Corpo della notifica
 * @param {object} [data={}] - Dati aggiuntivi
 */
const sendPushNotification = async (userToken, title, body, data = {}) => {
  try {
    if (!admin.apps.length) {
      throw new Error('Firebase Admin non inizializzato');
    }

    const message = {
      token: userToken,
      notification: {
        title: title,
        body: body
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#FF6B35',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
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

/**
 * Invia una notifica a un array di destinatari tramite Socket.IO
 * @param {Array<string>} recipientIds - Array di ID utente a cui inviare la notifica
 * @param {string} type - Il tipo di notifica (es. 'meal_join', 'new_message')
 * @param {string} message - Il testo della notifica
 * @param {object} [data={}] - Dati aggiuntivi (es. mealId, chatId)
 */
const sendNotification = (recipientIds, type, message, data = {}) => {
  if (!connectedUsers) return console.error('NotificationService non inizializzato.');

  const notificationPayload = { type, message, data, date: new Date() };

  // Ci assicuriamo che recipientIds sia sempre un array
  const recipients = Array.isArray(recipientIds) ? recipientIds : [recipientIds];

  recipients.forEach(userId => {
    const socketId = connectedUsers.get(userId.toString());
    if (socketId) {
      // Ottieni l'istanza io dal modulo socket
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        io.to(socketId).emit('new_notification', notificationPayload);
        console.log(`[Notification] Inviata notifica di tipo '${type}' a utente ${userId}`);
      }
    }
  });
};

/**
 * Invia notifica combinata (Socket.IO + Push) a un utente
 * @param {string} userId - ID dell'utente
 * @param {string} fcmToken - FCM token dell'utente (opzionale)
 * @param {string} type - Tipo di notifica
 * @param {string} title - Titolo push notification
 * @param {string} message - Messaggio notifica
 * @param {object} [data={}] - Dati aggiuntivi
 */
const sendCombinedNotification = async (userId, fcmToken, type, title, message, data = {}) => {
  try {
    // Invia notifica Socket.IO (per utenti online)
    sendNotification([userId], type, message, data);
    
    // Invia push notification (se FCM token disponibile)
    if (fcmToken) {
      await sendPushNotification(fcmToken, title, message, {
        type,
        userId,
        ...data
      });
    }
    
    console.log(`✅ Notifica combinata inviata a utente ${userId}`);
  } catch (error) {
    console.error(`❌ Errore notifica combinata per utente ${userId}:`, error);
  }
};

module.exports = { initialize, sendNotification, sendPushNotification, sendCombinedNotification }; 