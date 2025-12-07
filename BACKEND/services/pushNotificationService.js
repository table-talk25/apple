// File: BACKEND/services/pushNotificationService.js (VERSIONE AGGIORNATA)

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
const notificationPreferencesService = require('./notificationPreferencesService');

/**
 * Inizializza Firebase Admin se non è già inizializzato
 * Nota: Firebase viene già inizializzato in server.js, quindi questo serve
 * solo come fallback se il servizio viene usato indipendentemente
 */
const initializeFirebase = () => {
  if (!admin.apps.length) {
    try {
      const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        try {
          // Usa readFileSync invece di require per evitare errori
          const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
          const serviceAccount = JSON.parse(fileContent);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || 'tabletalk-social'
      });
      console.log('✅ Firebase Admin inizializzato con successo');
        } catch (parseError) {
          console.error('❌ Errore nel parsing del file Firebase:', parseError.message);
          // Continua con modalità limitata
          admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID || 'tabletalk-social'
          });
          console.log('✅ Firebase Admin inizializzato in modalità limitata (errore parsing)');
        }
      } else {
        // File non trovato - Firebase sarà inizializzato in modalità limitata in server.js
        console.log('⚠️  File firebase-service-account.json non trovato - Firebase verrà inizializzato in server.js');
        // Inizializza in modalità limitata per evitare errori
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'tabletalk-social'
        });
        console.log('✅ Firebase Admin inizializzato in modalità limitata (senza credenziali)');
      }
    } catch (error) {
      console.error('❌ Errore nell\'inizializzazione Firebase Admin:', error);
      // Non lanciare errore - Firebase potrebbe essere già inizializzato in server.js
      // o funzionare in modalità limitata
      console.log('⚠️  Firebase Admin non può essere inizializzato qui - potrebbe essere già inizializzato in server.js');
    }
  }
};

/**
 * Invia notifiche push a un elenco di token di dispositivo tramite FCM.
 * @param {Array<string>} tokens - Array di token di registrazione FCM.
 * @param {string} title - Il titolo della notifica.
 * @param {string} body - Il corpo del messaggio della notifica.
 * @param {object} [data={}] - Dati aggiuntivi da inviare nel payload (es. per il deep linking).
 * @param {string} [type='general'] - Tipo di notifica per gestire azioni specifiche.
 */
const sendPushNotification = async (tokens, title, body, data = {}, type = 'general') => {
  try {
    // Inizializza Firebase se necessario
    initializeFirebase();
    
    if (!tokens || tokens.length === 0) {
      console.log('[Push Notification] Nessun token a cui inviare');
      return;
    }

    // Rimuovi eventuali token duplicati per efficienza
    const uniqueTokens = [...new Set(tokens)];

    // Prepara i dati per il deep linking
    const notificationData = {
      type: type,
      timestamp: Date.now().toString(),
      ...data
    };

    // Prepara configurazione per notifiche interattive
    const isInteractive = data.actions && Array.isArray(data.actions) && data.actions.length > 0;
    const deepLink = data.deepLink || null;
    const action = data.action || null;

    const message = {
      notification: {
        title,
        body,
      },
      tokens: uniqueTokens,
      data: notificationData,
      android: {
        priority: 'high',
        notification: {
          channel_id: isInteractive ? 'tabletalk-interactive' : 'tabletalk-general',
          icon: 'ic_stat_icon_config_sample',
          color: data.color || '#488AFF',
          sound: 'default',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          // Configurazione per notifiche interattive
          ...(isInteractive && {
            actions: data.actions.map(action => ({
              title: action.title,
              icon: action.icon,
              action: action.action
            })),
            intent_filter: deepLink ? {
              action: 'VIEW',
              data: {
                scheme: 'tabletalk',
                host: 'app',
                path: deepLink
              }
            } : undefined
          })
        }
      },
      apns: {
        payload: {
          aps: {
            'content-available': 1,
            sound: 'default',
            badge: 1,
            // Configurazione per notifiche interattive
            ...(isInteractive && {
              category: 'tabletalk-interactive',
              'mutable-content': 1,
              'thread-id': type
            })
          },
          // Azioni personalizzate per iOS
          ...(isInteractive && {
            actions: data.actions.map(action => ({
              identifier: action.action,
              title: action.title,
              icon: action.icon
            }))
          })
        },
        fcm_options: {
          image: process.env.APP_LOGO_URL || 'https://tabletalk.app/logo.png'
        }
      },
      webpush: {
        notification: {
                  icon: process.env.APP_LOGO_URL || 'https://tabletalk.app/logo.png',
        badge: process.env.APP_BADGE_URL || 'https://tabletalk.app/badge.png',
          // Configurazione per notifiche interattive
          ...(isInteractive && {
            requireInteraction: true,
            tag: `tabletalk-${type}`,
            actions: data.actions.map(action => ({
              action: action.action,
              title: action.title,
              icon: action.icon
            })),
            data: {
              deepLink: deepLink,
              action: action,
              type: type
            }
          })
        }
      }
    };

    console.log(`[Push Notification] Invio notifica "${type}" a ${uniqueTokens.length} dispositivi${isInteractive ? ' (INTERATTIVA)' : ''}`);
    
    const response = await admin.messaging().sendMulticast(message);
    
    console.log(`✅ [Push Notification] Inviate con successo: ${response.successCount}/${uniqueTokens.length}${isInteractive ? ' - Notifica interattiva con ${data.actions.length} azioni' : ''}`);
    
    if (response.failureCount > 0) {
      console.log(`⚠️ [Push Notification] Invii falliti: ${response.failureCount}`);
      
      // Log dei token falliti per debug
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`❌ Token fallito ${idx}:`, resp.error);
        }
      });
    }
    
    return response;
    
  } catch (error) {
    console.error('❌ Errore durante l\'invio delle notifiche push:', error);
    throw error;
  }
};

/**
 * Invia notifica per nuovo messaggio in chat
 */
const sendChatNotification = async (tokens, senderName, message, chatId) => {
  return sendPushNotification(
    tokens,
    `Nuovo messaggio da ${senderName}`,
    message,
    { chatId, senderName },
    'new_message'
  );
};

/**
 * Invia notifica per nuovo invito
 */
const sendInvitationNotification = async (tokens, inviterName, mealTitle) => {
  return sendPushNotification(
    tokens,
    `Nuovo invito da ${inviterName}`,
    `Ti ha invitato a: ${mealTitle}`,
    { inviterName, mealTitle },
    'new_invitation'
  );
};

/**
 * Invia notifica per accettazione invito
 */
const sendInvitationAcceptedNotification = async (tokens, accepterName, mealTitle) => {
  return sendPushNotification(
    tokens,
    `Invito accettato!`,
    `${accepterName} ha accettato l'invito a: ${mealTitle}`,
    { accepterName, mealTitle },
    'invitation_accepted'
  );
};

/**
 * Invia notifica per promemoria pasto
 */
const sendMealReminderNotification = async (tokens, mealTitle, mealTime) => {
  return sendPushNotification(
    tokens,
    `Promemoria pasto`,
    `${mealTitle} tra ${mealTime}`,
    { mealTitle, mealTime },
    'meal_reminder'
  );
};

/**
 * Invia notifica per aggiornamento pasto
 */
const sendMealUpdateNotification = async (tokens, mealTitle, updateType) => {
  return sendPushNotification(
    tokens,
    `Aggiornamento pasto`,
    `${mealTitle}: ${updateType}`,
    { mealTitle, updateType },
    'meal_update'
  );
};

/**
 * Verifica se Firebase è configurato correttamente
 */
const isFirebaseConfigured = () => {
  try {
    return admin.apps.length > 0;
  } catch {
    return false;
  }
};

/**
 * Ottieni informazioni sulla configurazione Firebase
 */
const getFirebaseStatus = () => {
  try {
    if (admin.apps.length > 0) {
      const app = admin.app();
      return {
        configured: true,
        projectId: app.options.projectId,
        serviceAccount: !!app.options.credential
      };
    }
    return { configured: false };
  } catch (error) {
    return { configured: false, error: error.message };
  }
};

/**
 * Invia notifica push con controllo delle preferenze utente
 * @param {string} userId - ID dell'utente destinatario
 * @param {string} title - Titolo della notifica
 * @param {string} body - Corpo della notifica
 * @param {object} data - Dati aggiuntivi
 * @param {string} type - Tipo di notifica per verificare preferenze
 * @returns {Promise<Object>} Risultato dell'invio
 */
const sendPushNotificationWithPreferences = async (userId, title, body, data = {}, type = 'general') => {
  try {
    // Verifica se l'utente può ricevere questo tipo di notifica
    const canReceive = await notificationPreferencesService.canReceiveNotification(userId, type);
    
    if (!canReceive) {
      console.log(`ℹ️ [PushNotification] Utente ${userId} ha disabilitato notifiche di tipo ${type}`);
      return {
        success: true,
        message: 'Notifica non inviata - preferenze utente',
        skipped: true,
        userId,
        type
      };
    }

    // Ottieni i token FCM dell'utente
    const User = require('../models/User');
    const user = await User.findById(userId).select('fcmTokens');
    
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      console.log(`ℹ️ [PushNotification] Utente ${userId} non ha token FCM registrati`);
      return {
        success: true,
        message: 'Utente senza token FCM',
        skipped: true,
        userId,
        type
      };
    }

    // Invia la notifica
    const result = await sendPushNotification(user.fcmTokens, title, body, data, type);
    
    return {
      success: true,
      message: 'Notifica inviata con successo',
      userId,
      type,
      tokensCount: user.fcmTokens.length,
      result
    };

  } catch (error) {
    console.error(`❌ [PushNotification] Errore nell'invio notifica con preferenze per utente ${userId}:`, error);
    return {
      success: false,
      message: 'Errore nell\'invio notifica',
      error: error.message,
      userId,
      type
    };
  }
};

/**
 * Invia notifiche multiple con controllo delle preferenze
 * @param {Array<Object>} notifications - Array di notifiche da inviare
 * @returns {Promise<Object>} Risultato dell'invio
 */
const sendMultiplePushNotificationsWithPreferences = async (notifications) => {
  try {
    const results = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const notification of notifications) {
      const { userId, title, body, data = {}, type = 'general' } = notification;
      
      try {
        const result = await sendPushNotificationWithPreferences(userId, title, body, data, type);
        results.push(result);
        
        if (result.success) {
          if (result.skipped) {
            skippedCount++;
          } else {
            successCount++;
          }
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ [PushNotification] Errore nell'invio notifica per utente ${userId}:`, error);
        results.push({
          success: false,
          message: 'Errore nell\'invio',
          error: error.message,
          userId,
          type
        });
        errorCount++;
      }
    }

    return {
      success: true,
      message: `Processamento completato: ${successCount} inviate, ${skippedCount} saltate, ${errorCount} errori`,
      total: notifications.length,
      successCount,
      skippedCount,
      errorCount,
      results
    };

  } catch (error) {
    console.error('❌ [PushNotification] Errore nell\'invio notifiche multiple:', error);
    return {
      success: false,
      message: 'Errore nell\'invio notifiche multiple',
      error: error.message
    };
  }
};

module.exports = { 
  sendPushNotification,
  sendChatNotification,
  sendInvitationNotification,
  sendInvitationAcceptedNotification,
  sendMealReminderNotification,
  sendMealUpdateNotification,
  sendPushNotificationWithPreferences,
  sendMultiplePushNotificationsWithPreferences,
  isFirebaseConfigured,
  getFirebaseStatus,
  initializeFirebase
};