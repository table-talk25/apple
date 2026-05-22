// File: src/services/notificationService.js
// Servizio notifiche unificato: supporta nativo (Capacitor) E web (Firebase Web SDK)

import { Capacitor } from '@capacitor/core';

class NotificationService {
  constructor() {
    this.isLocalNotificationsAvailable = false;
    this.isPushNotificationsAvailable = false;
    this.initialized = false;
    this.pushToken = null;
    this.deviceId = null;
    this._webForegroundUnsubscribe = null;
  }

  /**
   * Inizializza il servizio di notifiche
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        // ── PATH NATIVO (Android/iOS con Capacitor) ──
        await this.initializeLocalNotifications();
        await this.initializePushNotifications();
      } else {
        // ── PATH WEB (browser / PWA) ──
        await this.initializeWebPushNotifications();
      }

      this.initialized = true;
      console.log('[NotificationService] Inizializzazione completata. Stato:', this.getStatus());
    } catch (error) {
      console.error('[NotificationService] Errore durante l\'inizializzazione:', error);
    }
  }

  // ─────────────────────────────────────────────
  //  WEB PUSH (browser / PWA)
  // ─────────────────────────────────────────────

  /**
   * Inizializza le notifiche push per browser/PWA tramite Firebase Web SDK
   */
  async initializeWebPushNotifications() {
    try {
      // Verifica supporto browser minimo
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.log('[NotificationService] Web Push non supportato in questo browser.');
        return;
      }

      const { requestWebPushPermission, listenWebPushForeground } = await import('./webPushService');

      const token = await requestWebPushPermission();

      if (token) {
        this.pushToken = token;
        this.isPushNotificationsAvailable = true;
        await this.sendTokenToBackend(token);

        // Ascolta notifiche foreground (app aperta)
        this._webForegroundUnsubscribe = listenWebPushForeground((payload) => {
          this._showWebForegroundNotification(payload);
        });

        console.log('[NotificationService] Web Push attivo.');
      } else {
        console.log('[NotificationService] Web Push non attivato (permesso negato o VAPID mancante).');
      }
    } catch (error) {
      console.error('[NotificationService] Errore init web push:', error);
    }
  }

  /**
   * Mostra una notifica visibile quando la pagina è aperta (foreground web)
   */
  _showWebForegroundNotification(payload) {
    try {
      const title = payload.notification?.title || payload.data?.title || 'TableTalk';
      const body = payload.notification?.body || payload.data?.body || 'Hai una nuova notifica';
      const data = payload.data || {};

      if (Notification.permission === 'granted') {
        const n = new Notification(title, {
          body,
          icon: '/android-chrome-192x192.png',
          badge: '/favicon-32x32.png',
          data
        });

        n.onclick = () => {
          window.focus();
          n.close();
          this._handleWebNotificationClick(data);
        };
      }
    } catch (err) {
      console.warn('[NotificationService] Errore notifica foreground web:', err);
    }
  }

  /**
   * Gestisce il click su notifica web (stesso comportamento del nativo)
   */
  _handleWebNotificationClick(data) {
    if (!data || !data.type) return;
    switch (data.type) {
      case 'new_message':
        if (data.chatId) window.location.href = `/chat/${String(data.chatId).trim()}`;
        break;
      case 'new_invitation':
        window.location.href = '/invitations';
        break;
      case 'meal_reminder':
        if (data.mealId) window.location.href = `/meals/${data.mealId}`;
        break;
      default:
        console.log('[NotificationService] Tipo notifica web non gestito:', data.type);
    }
  }

  // ─────────────────────────────────────────────
  //  NATIVO (Capacitor - Android / iOS)
  // ─────────────────────────────────────────────

  async initializeLocalNotifications() {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const permissionStatus = await LocalNotifications.requestPermissions();
      if (permissionStatus.display === 'granted') {
        this.isLocalNotificationsAvailable = true;
        console.log('[NotificationService] Notifiche locali abilitate');
      } else {
        console.log('[NotificationService] Permesso notifiche locali negato');
      }
    } catch (error) {
      console.warn('[NotificationService] Notifiche locali non disponibili:', error);
    }
  }

  async initializePushNotifications() {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      const permissionStatus = await PushNotifications.checkPermissions();
      if (permissionStatus.receive !== 'granted') {
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') {
          console.log('[NotificationService] Permesso notifiche push negato dall\'utente');
          this.isPushNotificationsAvailable = false;
          return;
        }
      }

      await PushNotifications.register();
      console.log('[NotificationService] Device registrato per notifiche push');
      this.setupPushListeners(PushNotifications);
      this.isPushNotificationsAvailable = true;
    } catch (error) {
      console.error('[NotificationService] Errore nell\'inizializzazione notifiche push:', error);
    }
  }

  setupPushListeners(PushNotifications) {
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[NotificationService] Notifica push ricevuta (foreground):', notification);
      this.showForegroundNotification(notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[NotificationService] Notifica push cliccata:', notification);
      this.handleNotificationAction(notification);
    });

    PushNotifications.addListener('registration', (token) => {
      try {
        console.log('[NotificationService] Token FCM nativo ricevuto:', token);
        this.pushToken = token?.value || token;
        if (this.pushToken) this.sendTokenToBackend(this.pushToken);
      } catch (e) {
        console.error('[NotificationService] Errore gestione token FCM:', e);
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[NotificationService] Errore registrazione FCM:', error);
    });
  }

  showForegroundNotification(pushNotification) {
    if (!this.isLocalNotificationsAvailable) return;
    try {
      this.sendLocalNotification({
        title: pushNotification.title || 'TableTalk',
        body: pushNotification.body || 'Nuova notifica',
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 100) },
        extra: pushNotification.data || {}
      });
    } catch (error) {
      console.error('[NotificationService] Errore nel mostrare notifica foreground:', error);
    }
  }

  handleNotificationAction(notification) {
    try {
      const data = notification.notification.data;
      if (data && data.type) {
        this._handleWebNotificationClick(data); // riusa la stessa logica
      }
    } catch (error) {
      console.error('[NotificationService] Errore nella gestione azione notifica:', error);
    }
  }

  // ─────────────────────────────────────────────
  //  TOKEN → BACKEND
  // ─────────────────────────────────────────────

  async sendTokenToBackend(token) {
    try {
      const { authPreferences } = await import('../utils/preferences');
      const userToken = await authPreferences.getToken();

      if (!userToken) {
        console.log('⚠️ [NotificationService] Utente non autenticato, token FCM salvato localmente.');
        try { localStorage.setItem('pending_fcm_token', token); } catch (e) { /* noop */ }
        return;
      }

      const { default: apiClient } = await import('./apiService');
      await apiClient.post('/profile/me/fcm-token', { token }, { suppressErrorAlert: true });
      console.log('[NotificationService] Token FCM inviato al backend con successo.');
      try { localStorage.removeItem('pending_fcm_token'); } catch (e) { /* noop */ }
    } catch (error) {
      console.error('[NotificationService] Errore invio token al backend:', error);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        try { localStorage.setItem('pending_fcm_token', token); } catch (e) { /* noop */ }
      }
    }
  }

  // ─────────────────────────────────────────────
  //  NOTIFICHE LOCALI (nativo)
  // ─────────────────────────────────────────────

  async sendLocalNotification(notification) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [{
          title: notification.title || 'TableTalk',
          body: notification.body || notification.message || 'Nuova notifica',
          id: notification.id || Date.now(),
          schedule: notification.schedule || { at: new Date(Date.now() + 1000) },
          sound: notification.sound || null,
          attachments: notification.attachments || null,
          actionTypeId: notification.actionTypeId || 'OPEN_APP',
          extra: notification.extra || {}
        }]
      });
    } catch (error) {
      console.error('[NotificationService] Errore invio notifica locale:', error);
    }
  }

  async sendNotification(notification) {
    try {
      if (this.isPushNotificationsAvailable) {
        await this.sendLocalNotification(notification);
        return;
      }
      if (this.isLocalNotificationsAvailable) {
        await this.sendLocalNotification(notification);
        return;
      }
      console.log('[NotificationService] Notifica (console fallback):', notification);
    } catch (error) {
      console.error('[NotificationService] Errore nell\'invio notifica:', error);
    }
  }

  async sendImmediateNotification(title, body, data = {}) {
    await this.sendNotification({ title, body, schedule: { at: new Date(Date.now() + 500) }, extra: data });
  }

  async sendScheduledNotification(title, body, scheduledTime, data = {}) {
    await this.sendNotification({ title, body, schedule: { at: scheduledTime }, extra: data });
  }

  async cancelAllNotifications() {
    try {
      if (this.isLocalNotificationsAvailable) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.cancel({ notifications: [] });
      }
    } catch (error) {
      console.error('[NotificationService] Errore cancellazione notifiche:', error);
    }
  }

  // ─────────────────────────────────────────────
  //  BACKEND READ
  // ─────────────────────────────────────────────

  async getNotifications(params = {}) {
    try {
      const { default: apiClient } = await import('./apiService');
      const queryParams = new URLSearchParams({ page: params.page || 1, limit: params.limit || 15, ...params }).toString();
      const response = await apiClient.get(`/notifications?${queryParams}`, { timeout: 60000, suppressErrorAlert: true });
      return response.data?.data || [];
    } catch (error) {
      console.error('[NotificationService] Errore caricamento notifiche:', error);
      throw new Error('Impossibile caricare le notifiche');
    }
  }

  async markAsRead(notificationId) {
    try {
      const { default: apiClient } = await import('./apiService');
      const response = await apiClient.post('/notifications/read', { notificationId });
      return response.data;
    } catch (error) {
      console.error('[NotificationService] Errore mark as read:', error);
      throw new Error('Impossibile segnare la notifica come letta');
    }
  }

  async markAllAsRead() {
    try {
      const { default: apiClient } = await import('./apiService');
      const response = await apiClient.post('/notifications/read');
      return response.data;
    } catch (error) {
      console.error('[NotificationService] Errore mark all as read:', error);
      throw new Error('Impossibile segnare tutte le notifiche come lette');
    }
  }

  // ─────────────────────────────────────────────
  //  UTILS
  // ─────────────────────────────────────────────

  getStatus() {
    return {
      initialized: this.initialized,
      localNotifications: this.isLocalNotificationsAvailable,
      pushNotifications: this.isPushNotificationsAvailable,
      pushToken: this.pushToken ? 'Presente' : 'Mancante',
      platform: Capacitor.isNativePlatform() ? 'native' : 'web'
    };
  }

  getPushToken() {
    return this.pushToken;
  }
}

const notificationService = new NotificationService();
export default notificationService;
