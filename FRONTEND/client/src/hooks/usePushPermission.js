import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import notificationService from '../services/notificationService';

function usePushPermission() {
  useEffect(() => {
    // Controlla se siamo su un dispositivo mobile nativo
    const isNativePlatform = Capacitor.isNativePlatform();
    
    if (!isNativePlatform) {
      console.log('[usePushPermission] Piattaforma non nativa, saltando inizializzazione');
      return;
    }

    const initializeNotifications = async () => {
      try {
        console.log('[usePushPermission] Inizializzazione servizio notifiche...');
        
        // Usa il servizio di notifiche completo
        await notificationService.initialize();
        
        // Log dello stato finale
        const status = notificationService.getStatus();
        console.log('[usePushPermission] Stato notifiche:', status);
        
        // Se le notifiche push sono disponibili, mostra un messaggio di successo
        if (status.pushNotifications) {
          console.log('[usePushPermission] ✅ Notifiche push abilitate con successo!');
          
          // Mostra notifica di test se le notifiche locali sono disponibili
          if (status.localNotifications) {
            setTimeout(() => {
              notificationService.sendImmediateNotification(
                'TableTalk', 
                'Notifiche push configurate correttamente! 🎉'
              );
            }, 3000);
          }
        } else {
          console.log('[usePushPermission] ⚠️ Notifiche push non disponibili (Firebase non configurato), usando fallback locale');
          
          // Mostra notifica informativa se le notifiche locali sono disponibili
          if (status.localNotifications) {
            setTimeout(() => {
              notificationService.sendImmediateNotification(
                'TableTalk', 
                'App avviata con notifiche locali. Le notifiche push richiedono configurazione Firebase.'
              );
            }, 3000);
          }
        }
        
      } catch (error) {
        console.error('[usePushPermission] Errore nell\'inizializzazione notifiche:', error);
        // Non propagare l'errore per evitare crash dell'app
      }
    };

    // Esegui in modo sicuro
    try {
      initializeNotifications();
    } catch (error) {
      console.error('[usePushPermission] Errore critico durante l\'inizializzazione:', error);
      // Non propagare l'errore per evitare crash dell'app
    }
  }, []);

  // Restituisci il servizio per uso esterno se necessario
  return notificationService;
}

export default usePushPermission; 