# 📱 Push Notification Service

## Panoramica

Il servizio di push notification utilizza Firebase Cloud Messaging (FCM) per inviare notifiche push agli utenti dell'app TableTalk mEat Together.

## Configurazione

### 1. Firebase Service Account

Assicurati di avere il file `firebase-service-account.json` nella cartella `BACKEND/` con le credenziali corrette di Firebase.

### 2. Inizializzazione

Il servizio si inizializza automaticamente all'avvio del server:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
```

## Funzioni Disponibili

### `sendPushNotification(userToken, title, body, data)`

Invia una push notification a un singolo utente.

**Parametri:**
- `userToken` (string): FCM token dell'utente
- `title` (string): Titolo della notifica
- `body` (string): Corpo della notifica
- `data` (object): Dati aggiuntivi (opzionale)

**Esempio:**
```javascript
await notificationService.sendPushNotification(
  'FCM_TOKEN_DEL_UTENTE',
  '🍽️ Nuovo TableTalk®!',
  'È stato creato un nuovo pasto vicino a te',
  {
    mealId: '507f1f77bcf86cd799439011',
    type: 'new_meal'
  }
);
```

### `sendCombinedNotification(userId, fcmToken, type, title, message, data)`

Invia una notifica combinata (Socket.IO + Push) a un utente.

**Parametri:**
- `userId` (string): ID dell'utente
- `fcmToken` (string): FCM token dell'utente (opzionale)
- `type` (string): Tipo di notifica
- `title` (string): Titolo push notification
- `message` (string): Messaggio notifica
- `data` (object): Dati aggiuntivi (opzionale)

**Esempio:**
```javascript
await notificationService.sendCombinedNotification(
  '507f1f77bcf86cd799439011',
  'FCM_TOKEN_DEL_UTENTE',
  'meal_join',
  '🎉 Qualcuno si è unito!',
  'Un nuovo partecipante si è unito al tuo TableTalk®',
  {
    mealId: '507f1f77bcf86cd799439011',
    participantName: 'Mario Rossi'
  }
);
```

## Tipi di Notifica

### 1. Nuovo Pasto
```javascript
{
  type: 'new_meal_nearby',
  mealId: '507f1f77bcf86cd799439011',
  hostName: 'Mario Rossi'
}
```

### 2. Partecipazione
```javascript
{
  type: 'meal_join',
  mealId: '507f1f77bcf86cd799439011',
  participantName: 'Mario Rossi'
}
```

### 3. Promemoria
```javascript
{
  type: 'meal_reminder',
  mealId: '507f1f77bcf86cd799439011',
  startTime: '2024-01-20T19:00:00Z'
}
```

### 4. Cancellazione
```javascript
{
  type: 'meal_cancelled',
  mealId: '507f1f77bcf86cd799439011',
  reason: 'host_cancelled'
}
```

### 5. Messaggio
```javascript
{
  type: 'new_message',
  chatId: '507f1f77bcf86cd799439011',
  senderName: 'Mario Rossi',
  messagePreview: 'Ciao! Ci vediamo domani?'
}
```

## Configurazione Android

### Icona Notifica
```javascript
android: {
  notification: {
    icon: 'ic_notification',
    color: '#FF6B35',
    sound: 'default'
  }
}
```

### Suono e Badge iOS
```javascript
apns: {
  payload: {
    aps: {
      sound: 'default',
      badge: 1
    }
  }
}
```

## Gestione Errori

Il servizio gestisce automaticamente gli errori e non blocca le operazioni principali:

```javascript
try {
  await notificationService.sendPushNotification(token, title, body, data);
} catch (error) {
  console.error('⚠️ Errore push notification:', error.message);
  // Non bloccare l'operazione principale
}
```

## Funzione Centralizzata `sendMealNotifications`

### Utilizzo nel Controller

```javascript
// Nel mealController.js
const sendMealNotifications = async (meal, eventType) => {
  // Gestisce automaticamente:
  // - Titoli e messaggi per ogni tipo di evento
  // - Ricerca utenti nelle vicinanze
  // - Invio notifiche push
  // - Gestione errori
};

// Esempi di utilizzo:
await sendMealNotifications(meal, 'new_meal_nearby');
await sendMealNotifications(meal, 'meal_cancelled');
await sendMealNotifications(meal, 'new_participant');
```

### Tipi di Evento Supportati

- `new_meal_nearby` - Nuovo pasto nelle vicinanze
- `meal_starting_soon` - Pasto che inizia tra poco
- `new_participant` - Nuovo partecipante
- `meal_cancelled` - Pasto cancellato
- `meal_reminder` - Promemoria pasto

## Esempi di Utilizzo

Vedi i file:
- `BACKEND/examples/pushNotificationExample.js` - Esempi base
- `BACKEND/examples/mealNotificationExamples.js` - Esempi specifici per pasti

## Note Importanti

1. **FCM Token**: Assicurati che gli utenti abbiano un FCM token valido nel database
2. **Rate Limiting**: Firebase ha limiti di rate per le notifiche
3. **Fallback**: Le notifiche Socket.IO funzionano come fallback per utenti online
4. **Testing**: Usa il Firebase Console per testare le notifiche durante lo sviluppo

## Troubleshooting

### Errore: "Firebase Admin non inizializzato"
- Verifica che il file `firebase-service-account.json` sia presente e valido
- Controlla che le credenziali Firebase siano corrette

### Errore: "Invalid registration token"
- Verifica che l'FCM token sia valido e aggiornato
- Gli FCM token possono scadere e devono essere rinnovati

### Notifiche non ricevute
- Verifica che l'app abbia i permessi per le notifiche
- Controlla che l'FCM token sia stato registrato correttamente
- Verifica la configurazione Firebase nel frontend
