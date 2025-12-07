// File: src/services/notificationService.js
// Servizio di notifiche completo con Firebase e fallback locale

import { Capacitor } from '@capacitor/core';

class NotificationService {
  constructor() {
    this.isLocalNotificationsAvailable = false;
    this.isPushNotificationsAvailable = false;
    this.initialized = false;
    this.pushToken = null;
    this.deviceId = null;
  }

  /**
   * Inizializza il servizio di notifiche
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const isNative = Capacitor.isNativePlatform();
      if (!isNative) {
        console.log('[NotificationService] Piattaforma non nativa, notifiche disabilitate');
        return;
      }

      // Inizializza notifiche locali PRIMA delle push
      await this.initializeLocalNotifications();
      
      // Inizializza notifiche push con Firebase
      await this.initializePushNotifications();

      this.initialized = true;
      console.log('[NotificationService] Inizializzazione completata');
      
      // Log dello stato finale
      const status = this.getStatus();
      console.log('[NotificationService] Stato finale:', status);
    } catch (error) {
      console.error('[NotificationService] Errore durante l\'inizializzazione:', error);
      // Continua con notifiche locali se disponibili
    }
  }

  /**
   * Inizializza notifiche locali
   */
  async initializeLocalNotifications() {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // Richiedi permessi
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

  /**
   * Inizializza notifiche push con Firebase
   */
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
      console.log('[NotificationService] Notifiche push abilitate con successo');
      
    } catch (error) {
      console.error('[NotificationService] Errore nell\'inizializzazione notifiche push:', error);
    }
  }

  /**
   * Configura i listener per le notifiche push
   */
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
        console.log('[NotificationService] Token FCM ricevuto:', token);
        this.pushToken = token?.value || token;
        if (this.pushToken) {
          this.sendTokenToBackend(this.pushToken);
        }
      } catch (e) {
        console.error('[NotificationService] Errore gestione token FCM:', e);
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[NotificationService] Errore registrazione FCM:', error);
    });
  }

  /**
   * Mostra notifica locale quando l'app è in foreground
   */
  showForegroundNotification(pushNotification) {
    if (!this.isLocalNotificationsAvailable) return;

    try {
      const notification = {
        title: pushNotification.title || 'TableTalk',
        body: pushNotification.body || 'Nuova notifica',
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 100) }, // Immediata
        extra: pushNotification.data || {}
      };

      this.sendLocalNotification(notification);
    } catch (error) {
      console.error('[NotificationService] Errore nel mostrare notifica foreground:', error);
    }
  }

  /**
   * Gestisce l'azione quando l'utente clicca una notifica
   */
  handleNotificationAction(notification) {
    try {
      const data = notification.notification.data;
      
      if (data && data.type) {
        switch (data.type) {
          case 'new_message':
            // Apri la chat specifica
            if (data.chatId) {
              // Normalizza chatId: assicurati che sia una stringa, non un oggetto
              let chatIdString = data.chatId;
              if (typeof chatIdString === 'object' && chatIdString !== null) {
                chatIdString = chatIdString._id || chatIdString.id || chatIdString.chatId || String(chatIdString);
                console.warn('⚠️ [NotificationService] data.chatId era un oggetto, normalizzato a:', chatIdString);
              }
              chatIdString = String(chatIdString || '').trim();
              
              if (chatIdString && chatIdString !== 'undefined' && chatIdString !== 'null' && !chatIdString.includes('[object Object]')) {
                window.location.href = `/chat/${chatIdString}`;
              } else {
                console.error('❌ [NotificationService] chatId non valido:', data.chatId);
              }
            }
            break;
          case 'new_invitation':
            // Apri la pagina inviti
            window.location.href = '/invitations';
            break;
          case 'meal_reminder':
            // Apri il dettaglio del pasto
            if (data.mealId) {
              window.location.href = `/meals/${data.mealId}`;
            }
            break;
          default:
            console.log('[NotificationService] Tipo notifica non gestito:', data.type);
        }
      }
    } catch (error) {
      console.error('[NotificationService] Errore nella gestione azione notifica:', error);
    }
  }

  /**
   * Invia il token FCM al backend
   */
  async sendTokenToBackend(token) {
    try {
      const { default: apiClient } = await import('./apiService');
      await apiClient.post('/profile/me/fcm-token', { token });
      console.log('[NotificationService] Token inviato al backend con successo');
    } catch (error) {
      console.error('[NotificationService] Errore nell\'invio token al backend:', error);
    }
  }

  /**
   * Invia una notifica
   */
  async sendNotification(notification) {
    try {
      // Priorità 1: Notifiche push se disponibili
      if (this.isPushNotificationsAvailable) {
        await this.sendPushNotification(notification);
        return;
      }

      // Priorità 2: Notifiche locali come fallback
      if (this.isLocalNotificationsAvailable) {
        await this.sendLocalNotification(notification);
        return;
      }

      // Fallback: console log
      console.log('[NotificationService] Notifica (console):', notification);
    } catch (error) {
      console.error('[NotificationService] Errore nell\'invio notifica:', error);
    }
  }

  /**
   * Invia notifica push
   */
  async sendPushNotification(notification) {
    // Le notifiche push vengono gestite dal server Firebase
    // Questo metodo è per notifiche programmate localmente
    console.log('[NotificationService] Notifica push programmata:', notification);
  }

  /**
   * Invia notifica locale
   */
  async sendLocalNotification(notification) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      const localNotification = {
        title: notification.title || 'TableTalk',
        body: notification.body || notification.message || 'Nuova notifica',
        id: notification.id || Date.now(),
        schedule: notification.schedule || { at: new Date(Date.now() + 1000) },
        sound: notification.sound || null,
        attachments: notification.attachments || null,
        actionTypeId: notification.actionTypeId || 'OPEN_APP',
        extra: notification.extra || {}
      };

      await LocalNotifications.schedule({
        notifications: [localNotification]
      });

      console.log('[NotificationService] Notifica locale inviata:', localNotification);
    } catch (error) {
      console.error('[NotificationService] Errore nell\'invio notifica locale:', error);
    }
  }

  /**
   * Invia notifica immediata
   */
  async sendImmediateNotification(title, body, data = {}) {
    const notification = {
      title,
      body,
      schedule: { at: new Date(Date.now() + 500) }, // 0.5 secondi dopo
      extra: data
    };

    await this.sendNotification(notification);
  }

  /**
   * Invia notifica programmata
   */
  async sendScheduledNotification(title, body, scheduledTime, data = {}) {
    const notification = {
      title,
      body,
      schedule: { at: scheduledTime },
      extra: data
    };

    await this.sendNotification(notification);
  }

  /**
   * Cancella tutte le notifiche
   */
  async cancelAllNotifications() {
    try {
      if (this.isLocalNotificationsAvailable) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.cancel({ notifications: [] });
        console.log('[NotificationService] Tutte le notifiche locali cancellate');
      }
    } catch (error) {
      console.error('[NotificationService] Errore nella cancellazione notifiche:', error);
    }
  }

  /**
   * Controlla lo stato del servizio
   */
  getStatus() {
    return {
      initialized: this.initialized,
      localNotifications: this.isLocalNotificationsAvailable,
      pushNotifications: this.isPushNotificationsAvailable,
      pushToken: this.pushToken ? 'Presente' : 'Mancante',
      platform: Capacitor.isNativePlatform() ? 'native' : 'web'
    };
  }

  /**
   * Ottieni il token FCM corrente
   */
  getPushToken() {
    return this.pushToken;
  }

  /**
   * Ottieni le notifiche dell'utente dal backend
   */
  async getNotifications(params = {}) {
    try {
      const { default: apiClient } = await import('./apiService');
      const queryParams = new URLSearchParams({
        page: params.page || 1,
        limit: params.limit || 15,
        ...params
      }).toString();
      
      const response = await apiClient.get(`/notifications?${queryParams}`);
      return response.data?.data || [];
    } catch (error) {
      console.error('[NotificationService] Errore nel caricamento notifiche:', error);
      throw new Error('Impossibile caricare le notifiche');
    }
  }

  /**
   * Segna una notifica come letta
   */
  async markAsRead(notificationId) {
    try {
      const { default: apiClient } = await import('./apiService');
      const response = await apiClient.post('/notifications/read', { 
        notificationId 
      });
      return response.data;
    } catch (error) {
      console.error('[NotificationService] Errore nel segnare notifica come letta:', error);
      throw new Error('Impossibile segnare la notifica come letta');
    }
  }

  /**
   * Segna tutte le notifiche come lette
   */
  async markAllAsRead() {
    try {
      const { default: apiClient } = await import('./apiService');
      const response = await apiClient.post('/notifications/read');
      return response.data;
    } catch (error) {
      console.error('[NotificationService] Errore nel segnare tutte le notifiche come lette:', error);
      throw new Error('Impossibile segnare tutte le notifiche come lette');
    }
  }
}

// Esporta un'istanza singleton
const notificationService = new NotificationService();
export default notificationService;
