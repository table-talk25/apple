// File: src/services/webPushService.js
// Helper per notifiche push su browser/PWA tramite Firebase Web SDK

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyD_PLACEHOLDER_REPLACE_WITH_REAL_KEY",
  authDomain: "tabletalk-social.firebaseapp.com",
  projectId: "tabletalk-social",
  storageBucket: "tabletalk-social.appspot.com",
  messagingSenderId: "925236799140",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:925236799140:web:PLACEHOLDER_REPLACE_WITH_REAL_WEB_APP_ID"
};

// VAPID key dalla Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || null;

let messagingInstance = null;

function getFirebaseApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(firebaseConfig);
}

/**
 * Inizializza Firebase Messaging per il web.
 * Restituisce null se il browser non supporta i Service Worker.
 */
export function getFirebaseMessaging() {
  if (messagingInstance) return messagingInstance;
  try {
    if (!('serviceWorker' in navigator)) {
      console.warn('[webPushService] Service Worker non supportato in questo browser.');
      return null;
    }
    const app = getFirebaseApp();
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.error('[webPushService] Errore init Firebase Messaging:', err);
    return null;
  }
}

/**
 * Chiede il permesso all'utente e ottiene il token FCM web.
 * @returns {Promise<string|null>} token FCM oppure null
 */
export async function requestWebPushPermission() {
  try {
    // 1. Verifica supporto browser
    if (!('Notification' in window)) {
      console.warn('[webPushService] Notifiche non supportate in questo browser.');
      return null;
    }

    // 2. Chiedi permesso se non già concesso
    if (Notification.permission === 'denied') {
      console.warn('[webPushService] Permesso notifiche negato dall\'utente.');
      return null;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[webPushService] Utente ha rifiutato le notifiche.');
        return null;
      }
    }

    // 3. Registra il Service Worker
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[webPushService] Service Worker registrato:', swReg);

    // 4. Ottieni il token FCM
    const messaging = getFirebaseMessaging();
    if (!messaging) return null;

    if (!VAPID_KEY) {
      console.error('[webPushService] REACT_APP_FIREBASE_VAPID_KEY non configurata. Imposta la variabile d\'ambiente.');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg
    });

    if (token) {
      console.log('[webPushService] Token FCM web ottenuto:', token);
      return token;
    } else {
      console.warn('[webPushService] Nessun token FCM ottenuto (permessi o VAPID errati?).');
      return null;
    }
  } catch (err) {
    console.error('[webPushService] Errore nel richiedere permesso web push:', err);
    return null;
  }
}

/**
 * Ascolta le notifiche in FOREGROUND (app aperta nel browser).
 * @param {function} onMessageCallback - callback(payload)
 * @returns {function} unsubscribe function
 */
export function listenWebPushForeground(onMessageCallback) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('[webPushService] Notifica foreground ricevuta:', payload);
    if (typeof onMessageCallback === 'function') {
      onMessageCallback(payload);
    }
  });

  return unsubscribe;
}
