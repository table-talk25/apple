const admin = require('../bootstrap/firebaseAdmin');
const notificationPreferencesService = require('./notificationPreferencesService');

// Bootstrap is shared with server.js; importing this service does not create a second app.
const initializeFirebase = () => {};

const toStringData = (data) => Object.fromEntries(
  Object.entries(data).filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, typeof value === 'string' ? value :
      (typeof value === 'object' ? JSON.stringify(value) : String(value))])
);

const sendPushNotification = async (tokens, title, body, data = {}, type = 'general') => {
  if (!tokens || tokens.length === 0) return;
  if (!Array.isArray(tokens)) throw new TypeError('FCM tokens must be an array');
  const uniqueTokens = [...new Set(tokens.filter((token) => typeof token === 'string' && token.trim()))];
  if (uniqueTokens.length === 0) return;
  const interactive = Array.isArray(data.actions) && data.actions.length > 0;
  const message = {
    notification: { title, body },
    data: toStringData({ type, timestamp: Date.now().toString(), ...data }),
    android: {
      priority: 'high',
      notification: {
        channelId: interactive ? 'tabletalk-interactive' : 'tabletalk-general',
        icon: 'ic_stat_icon_config_sample',
        color: data.color || '#488AFF',
        sound: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true, sound: 'default', badge: 1,
          ...(interactive ? { category: 'tabletalk-interactive', mutableContent: true, threadId: type } : {}),
        },
        ...(interactive ? { actions: data.actions.map((action) => ({
          identifier: action.action, title: action.title, icon: action.icon,
        })) } : {}),
      },
      fcmOptions: { imageUrl: process.env.APP_LOGO_URL || 'https://tabletalk.app/logo.png' },
    },
    webpush: {
      notification: {
        icon: process.env.APP_LOGO_URL || 'https://tabletalk.app/logo.png',
        badge: process.env.APP_BADGE_URL || 'https://tabletalk.app/badge.png',
        ...(interactive ? {
          requireInteraction: true, tag: `tabletalk-${type}`,
          actions: data.actions.map((action) => ({ action: action.action, title: action.title, icon: action.icon })),
          data: { deepLink: data.deepLink || null, action: data.action || null, type },
        } : {}),
      },
    },
  };
  try {
    const result = { responses: [], successCount: 0, failureCount: 0 };
    const messaging = admin.messaging();
    for (let offset = 0; offset < uniqueTokens.length; offset += 500) {
      const batch = await messaging.sendEachForMulticast({ ...message, tokens: uniqueTokens.slice(offset, offset + 500) });
      result.responses.push(...batch.responses);
      result.successCount += batch.successCount;
      result.failureCount += batch.failureCount;
    }
    console.log(`[Push] Esito: ${result.successCount} riuscite, ${result.failureCount} fallite`);
    return result;
  } catch (error) {
    console.error('[Push] Invio fallito (dettagli destinatari omessi)');
    throw error;
  }
};

const sendChatNotification = (tokens, senderName, message, chatId) =>
  sendPushNotification(tokens, `Nuovo messaggio da ${senderName}`, message, { chatId, senderName }, 'new_message');
const sendInvitationNotification = (tokens, inviterName, mealTitle) =>
  sendPushNotification(tokens, `Nuovo invito da ${inviterName}`, `Ti ha invitato a: ${mealTitle}`, { inviterName, mealTitle }, 'new_invitation');
const sendInvitationAcceptedNotification = (tokens, accepterName, mealTitle) =>
  sendPushNotification(tokens, 'Invito accettato!', `${accepterName} ha accettato l'invito a: ${mealTitle}`, { accepterName, mealTitle }, 'invitation_accepted');
const sendMealReminderNotification = (tokens, mealTitle, mealTime) =>
  sendPushNotification(tokens, 'Promemoria pasto', `${mealTitle} tra ${mealTime}`, { mealTitle, mealTime }, 'meal_reminder');
const sendMealUpdateNotification = (tokens, mealTitle, updateType) =>
  sendPushNotification(tokens, 'Aggiornamento pasto', `${mealTitle}: ${updateType}`, { mealTitle, updateType }, 'meal_update');

// These status helpers report SDK initialization, not verified FCM delivery.
const isFirebaseConfigured = () => {
  try { return admin.apps.length > 0; } catch { return false; }
};
const getFirebaseStatus = () => {
  try {
    if (!admin.apps.length) return { configured: false };
    const app = admin.app();
    return { configured: true, projectId: app.options.projectId, serviceAccount: !!app.options.credential };
  } catch { return { configured: false, error: 'Firebase status unavailable' }; }
};

const sendPushNotificationWithPreferences = async (userId, title, body, data = {}, type = 'general') => {
  try {
    const canReceive = await notificationPreferencesService.canReceiveNotification(userId, type);
    if (!canReceive) return { success: true, message: 'Notifica non inviata - preferenze utente', skipped: true, userId, type };
    const User = require('../models/User');
    const user = await User.findById(userId).select('fcmTokens');
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return { success: true, message: 'Utente senza token FCM', skipped: true, userId, type };
    }
    const result = await sendPushNotification(user.fcmTokens, title, body, data, type);
    const delivered = !!result && result.successCount > 0;
    return { success: delivered, message: delivered ? 'Notifica inviata con successo' : 'Nessun invio FCM riuscito', userId, type, tokensCount: user.fcmTokens.length, result };
  } catch {
    console.error('[Push] Errore invio con preferenze (dettagli omessi)');
    return { success: false, message: 'Errore invio notifica', error: 'Invio FCM fallito', userId, type };
  }
};

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
        if (!result.success) errorCount++;
        else if (result.skipped) skippedCount++;
        else successCount++;
      } catch {
        errorCount++;
        results.push({ success: false, message: 'Errore invio', error: 'Invio FCM fallito', userId, type });
      }
    }
    return { success: true, message: `Processamento completato: ${successCount} inviate, ${skippedCount} saltate, ${errorCount} errori`, total: notifications.length, successCount, skippedCount, errorCount, results };
  } catch {
    return { success: false, message: 'Errore invio notifiche multiple', error: 'Elaborazione fallita' };
  }
};

module.exports = {
  sendPushNotification, sendChatNotification, sendInvitationNotification,
  sendInvitationAcceptedNotification, sendMealReminderNotification, sendMealUpdateNotification,
  sendPushNotificationWithPreferences, sendMultiplePushNotificationsWithPreferences,
  isFirebaseConfigured, getFirebaseStatus, initializeFirebase,
};
