// Service Worker per Firebase Cloud Messaging (notifiche background su Web/PWA)
// IMPORTANTE: questo file DEVE stare in /public per essere servito dalla root del sito

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD_PLACEHOLDER_REPLACE_WITH_REAL_KEY",
  authDomain: "tabletalk-social.firebaseapp.com",
  projectId: "tabletalk-social",
  storageBucket: "tabletalk-social.appspot.com",
  messagingSenderId: "925236799140",
  appId: "1:925236799140:web:PLACEHOLDER_REPLACE_WITH_REAL_WEB_APP_ID"
});

const messaging = firebase.messaging();

// Gestisce notifiche ricevute quando l'app è in BACKGROUND o CHIUSA
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notifica background ricevuta:', payload);

  const notificationTitle = payload.notification?.title || 'TableTalk';
  const notificationOptions = {
    body: payload.notification?.body || 'Hai una nuova notifica',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gestisce il click sulla notifica (anche da background)
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notifica cliccata:', event);
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  if (data.type === 'new_message' && data.chatId) {
    targetUrl = `/chat/${data.chatId}`;
  } else if (data.type === 'new_invitation') {
    targetUrl = '/invitations';
  } else if (data.type === 'meal_reminder' && data.mealId) {
    targetUrl = `/meals/${data.mealId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se l'app è già aperta, portala in focus
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Altrimenti apri una nuova finestra
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
