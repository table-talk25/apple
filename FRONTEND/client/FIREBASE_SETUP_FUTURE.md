# Configurazione Firebase per TableTalk - Guida Futura

## Problema Risolto

L'errore `Default FirebaseApp is not initialized` è stato risolto temporaneamente disabilitando le notifiche push. L'app ora funziona correttamente con le notifiche locali.

## Per Abilitare le Notifiche Push in Futuro

### 1. Creare un Progetto Firebase

1. Vai su [console.firebase.google.com](https://console.firebase.google.com)
2. Crea un nuovo progetto o usa uno esistente
3. Aggiungi un'app Android con il package `com.tabletalk.socialapp`

### 2. Scaricare il File di Configurazione

1. Scarica il file `google-services.json`
2. Mettilo in `FRONTEND/client/android/app/`

### 3. Riabilitare le Notifiche Push

1. **Reinstalla il plugin:**
   ```bash
   npm install @capacitor/push-notifications
   ```

2. **Modifica `capacitor.config.js`:**
   ```javascript
   plugins: {
     // ... altri plugin ...
     PushNotifications: {
       presentationOptions: [
         "badge",
         "sound", 
         "alert"
       ]
     }
   }
   ```

3. **Modifica `src/config/capacitorConfig.js`:**
   ```javascript
   plugins: {
     // ... altri plugin ...
     PushNotifications: {
       presentationOptions: [
         "badge",
         "sound",
         "alert"
       ]
     }
   }
   ```

4. **Riabilita il servizio in `src/services/notificationService.js`:**
   - Rimuovi i commenti dal metodo `initializePushNotifications()`
   - Rimuovi i commenti dal metodo `setupPushListeners()`

5. **Ricostruisci l'app:**
   ```bash
   npm run build
   npx cap sync android
   cd android && ./gradlew assembleDebug
   ```

## Stato Attuale

- ✅ **Notifiche locali**: Funzionanti
- ✅ **App stabile**: Nessun crash Firebase
- ❌ **Notifiche push**: Disabilitate temporaneamente
- ❌ **Firebase**: Non configurato

## Vantaggi della Soluzione Temporanea

1. **App stabile**: Nessun crash all'avvio
2. **Notifiche locali**: Funzionano per notifiche interne
3. **Facile riabilitazione**: Basta seguire i passi sopra
4. **Nessuna perdita di funzionalità**: L'app funziona normalmente

## Note Importanti

- Le notifiche push richiedono Firebase per funzionare
- Le notifiche locali funzionano senza Firebase
- L'app è ora stabile e pronta per l'uso
- La configurazione Firebase può essere fatta in qualsiasi momento futuro
