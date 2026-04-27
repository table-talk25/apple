// Import dinamici per evitare errori durante il build web
// I moduli Capacitor sono disponibili solo su piattaforme native

export async function ensureAndroidChannel() {
  try {
    console.log('🔥 Creating Android notification channel...');
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.createChannel({
      id: 'default',
      name: 'General',
      description: 'General notifications',
      importance: 5, // max
      visibility: 1,
      sound: 'default'
    });
    console.log('✅ Android notification channel created successfully');
  } catch (e) {
    console.warn('❌ Channel create error:', e);
  }
}

export async function setupPush() {
  console.log('🔥 Setting up push notifications...');
  
  try {
    // Import dinamico per evitare errori durante il build web
    const { PushNotifications } = await import('@capacitor/push-notifications');
    
    // 0. Create Android channel first
    await ensureAndroidChannel();
    
    // 1. Check availability
    console.log('🔥 Checking push notification permissions...');
    let permStatus = await PushNotifications.checkPermissions();
    console.log('🔥 Current permission status:', permStatus);

    // 2. Request if not granted
    if (permStatus.receive !== 'granted') {
      console.log('🔥 Requesting push notification permissions...');
      permStatus = await PushNotifications.requestPermissions();
      console.log('🔥 Permission request result:', permStatus);
    }

    // 3. Exit if denied
    if (permStatus.receive !== 'granted') {
      console.warn('❌ Push permission not granted');
      return false;
    }

    console.log('✅ Push permissions granted, registering...');

    // 4. Register for push
    await PushNotifications.register();
    console.log('✅ Push notifications registered');

    // 5. Listen for registration success
    PushNotifications.addListener('registration', (token) => {
      console.log('🔥 Push token received:', token.value);
      // Invia subito al backend se autenticato; altrimenti viene parcheggiato
      // in localStorage come `pending_fcm_token` e drenato da
      // flushPendingPushToken() al primo login/register/loginFromVerification.
      sendTokenToBackend(token.value);
    });

    // 6. Listen for errors
    PushNotifications.addListener('registrationError', (err) => {
      console.error('❌ Push registration error:', err);
    });

    // 7. Foreground notifications
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('🔥 Notification received in foreground:', notification);
    });

    // 8. Click on notification
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('🔥 Notification action performed:', action);
    });

    return true;
  } catch (error) {
    console.error('❌ Error setting up push notifications:', error);
    return false;
  }
}

async function sendTokenToBackend(token) {
  try {
    // Verifica se l'utente è autenticato prima di inviare il token
    const { authPreferences } = await import('../utils/preferences');
    const userToken = await authPreferences.getToken();
    
    if (!userToken) {
      console.log('⚠️ [Push] Utente non autenticato, token FCM non inviato. Verrà inviato dopo il login.');
      // Salva il token localmente per inviarlo dopo il login
      try {
        localStorage.setItem('pending_fcm_token', token);
        console.log('💾 [Push] Token FCM salvato localmente per invio dopo login');
      } catch (e) {
        console.warn('⚠️ [Push] Impossibile salvare token localmente:', e);
      }
      return;
    }
    
    console.log('🔥 Sending push token to backend:', token);
    const { default: apiClient } = await import('../services/apiService');
    await apiClient.post('/profile/me/fcm-token', { token }, { suppressErrorAlert: true });
    console.log('✅ Push token sent to backend');
    
    // Rimuovi il token pendente se presente
    try {
      localStorage.removeItem('pending_fcm_token');
    } catch (e) {
      // Ignora errori
    }
  } catch (error) {
    console.error('❌ Error sending token to backend:', error);
    // Se l'errore è 401 (non autenticato), salva il token per inviarlo dopo il login
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      try {
        localStorage.setItem('pending_fcm_token', token);
        console.log('💾 [Push] Token FCM salvato localmente (errore 401/403)');
      } catch (e) {
        console.warn('⚠️ [Push] Impossibile salvare token localmente:', e);
      }
    }
  }
}

/**
 * Drena il token push parcheggiato in localStorage al primo login utile.
 *
 * Scenario: la `register` push (Capacitor) può avvenire prima che l'utente
 * sia loggato (es. permesso concesso al primissimo avvio). In quel caso
 * `sendTokenToBackend` salva il token in `localStorage.pending_fcm_token`
 * perché POST /profile/me/fcm-token richiede auth. Senza un meccanismo che
 * lo rilegga dopo il login, il token resta lì appeso e device/utente non
 * vengono mai associati lato server.
 *
 * Va chiamato da AuthContext dopo login / register / loginFromVerification
 * e al boot quando l'utente è già autenticato.
 */
export async function flushPendingPushToken() {
  try {
    let pending = null;
    try { pending = localStorage.getItem('pending_fcm_token'); } catch (_) {}
    if (!pending) return;

    const { authPreferences } = await import('../utils/preferences');
    const userToken = await authPreferences.getToken();
    if (!userToken) {
      // Niente sessione, niente da fare: lo rilegge il prossimo login.
      return;
    }

    const { default: apiClient } = await import('../services/apiService');
    await apiClient.post('/profile/me/fcm-token', { token: pending }, { suppressErrorAlert: true });
    console.log('✅ [Push] pending_fcm_token drenato e inviato al backend');
    try { localStorage.removeItem('pending_fcm_token'); } catch (_) {}
  } catch (error) {
    // Se è 401/403 lasciamo il token in localStorage per il prossimo tentativo.
    // Per altri errori (rete, 5xx) lo lasciamo lì comunque: non perdiamo nulla.
    console.warn('⚠️ [Push] flushPendingPushToken fallito (riproveremo):', error?.response?.status || error?.message);
  }
}

export default {
  setupPush,
  ensureAndroidChannel,
  flushPendingPushToken,
};
