# 💬 Sistema di Chat per Pasti

## Panoramica

Il sistema di chat permette ai partecipanti e all'host di un pasto di comunicare in tempo reale attraverso messaggi di testo, immagini e posizioni.

## Modello ChatMessage

### Schema del Database

```javascript
const chatMessageSchema = new mongoose.Schema({
  mealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meal',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'location'],
    default: 'text'
  },
  readBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});
```

### Campi del Modello

- **`mealId`** - ID del pasto a cui appartiene il messaggio
- **`senderId`** - ID dell'utente che ha inviato il messaggio
- **`message`** - Contenuto del messaggio (max 1000 caratteri)
- **`messageType`** - Tipo di messaggio: `text`, `image`, `location`
- **`readBy`** - Array di utenti che hanno letto il messaggio
- **`createdAt`** - Data e ora di creazione del messaggio

## API Endpoints (Versione Semplificata)

### 1. Invia Messaggio

**POST** `/api/chats/:mealId`

```javascript
// Request Body
{
  "message": "Ciao a tutti! Ci vediamo domani?",
  "messageType": "text" // opzionale, default: "text"
}

// Response
{
  "_id": "507f1f77bcf86cd799439011",
  "mealId": "507f1f77bcf86cd799439012",
  "senderId": {
    "_id": "507f1f77bcf86cd799439013",
    "nickname": "Mario",
    "profileImage": "https://..."
  },
  "message": "Ciao a tutti! Ci vediamo domani?",
  "messageType": "text",
  "readBy": [],
  "createdAt": "2024-01-20T10:30:00.000Z"
}
```

### 2. Ottieni Messaggi

**GET** `/api/chats/:mealId?page=1&limit=50`

```javascript
// Response (Array diretto di messaggi)
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "mealId": "507f1f77bcf86cd799439012",
    "senderId": {
      "_id": "507f1f77bcf86cd799439013",
      "nickname": "Mario",
      "profileImage": "https://..."
    },
    "message": "Ciao a tutti! Ci vediamo domani?",
    "messageType": "text",
    "readBy": [
      {
        "userId": "507f1f77bcf86cd799439014",
        "readAt": "2024-01-20T10:35:00.000Z"
      }
    ],
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
]
```

## Tipi di Messaggio

### 1. Messaggio di Testo
```javascript
{
  "message": "Ciao a tutti! Ci vediamo domani?",
  "messageType": "text"
}
```

### 2. Messaggio con Immagine
```javascript
{
  "message": "Ecco la foto del ristorante!",
  "messageType": "image"
}
```

### 3. Messaggio con Posizione
```javascript
{
  "message": "📍 Posizione: Via Roma 123, Milano",
  "messageType": "location"
}
```

## Notifiche Push

### Configurazione Automatica

Quando viene inviato un messaggio, il sistema invia automaticamente notifiche push a tutti i partecipanti del pasto (escluso il mittente):

```javascript
// Notifica automatica
{
  "title": "💬 Nuovo messaggio",
  "body": "Mario: Ciao a tutti! Ci vediamo domani?",
  "data": {
    "mealId": "507f1f77bcf86cd799439012",
    "type": "new_message",
    "senderName": "Mario",
    "messagePreview": "Ciao a tutti! Ci vediamo domani?",
    "chatId": "507f1f77bcf86cd799439012"
  }
}
```

## Autorizzazioni

### Chi può inviare messaggi:
- **Host del pasto**
- **Partecipanti del pasto**

### Chi può vedere i messaggi:
- **Host del pasto**
- **Partecipanti del pasto**

### Chi può eliminare messaggi:
- **Solo il mittente del messaggio**

## Esempi di Utilizzo

Vedi il file `BACKEND/examples/simpleChatExamples.js` per esempi semplificati:

- `sendMessage()` - Invia messaggio semplice
- `getMessages()` - Ottieni messaggi con paginazione
- `sendMessageWithNotifications()` - Invia messaggio con notifiche push
- `sendMessageWithSocket()` - Invia messaggio tramite Socket.IO
- `getRecentMessages()` - Ottieni ultimi messaggi
- `getMessageStats()` - Ottieni statistiche del chat
- `searchMessages()` - Cerca messaggi per contenuto
- `cleanupOldMessages()` - Elimina messaggi vecchi
- `checkUserPermission()` - Verifica autorizzazione utente
- `sendSystemMessage()` - Invia messaggio di sistema

## Sicurezza

### Validazioni:
- **Lunghezza messaggio**: Max 1000 caratteri
- **Autorizzazione**: Solo partecipanti e host possono inviare/vedere messaggi
- **Eliminazione**: Solo il mittente può eliminare i propri messaggi

### Rate Limiting:
- **Messaggi per minuto**: Configurabile (default: 30)
- **Spam protection**: Rilevamento messaggi duplicati

## Performance

### Ottimizzazioni:
- **Paginazione**: Limite di 50 messaggi per richiesta
- **Indici**: Su `mealId`, `createdAt`, `senderId`
- **Popolazione**: Solo campi necessari (`nickname`, `profileImage`)

### Cleanup:
- **Messaggi vecchi**: Eliminazione automatica dopo 30 giorni
- **Indici**: Manutenzione automatica degli indici MongoDB

## Integrazione Frontend

### Socket.IO (Tempo Reale)
```javascript
// Ascolta nuovi messaggi
socket.on('new_message', (message) => {
  // Aggiorna UI con nuovo messaggio
});

// Invia messaggio
socket.emit('send_message', {
  mealId: '507f1f77bcf86cd799439012',
  message: 'Ciao a tutti!',
  messageType: 'text'
});
```

### React Hook Example
```javascript
const useChatMessages = (mealId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message, messageType = 'text') => {
    try {
      const response = await apiClient.post(`/api/chats/${mealId}`, {
        message,
        messageType
      });
      setMessages(prev => [...prev, response.data.data]);
    } catch (error) {
      console.error('Errore invio messaggio:', error);
    }
  };

  return { messages, sendMessage, loading };
};
```

## Troubleshooting

### Problemi Comuni:

1. **Messaggio non inviato**
   - Verifica di essere partecipante del pasto
   - Controlla la lunghezza del messaggio (max 1000 caratteri)

2. **Notifiche non ricevute**
   - Verifica che l'utente abbia un FCM token valido
   - Controlla le impostazioni di notifica dell'utente

3. **Messaggi non caricati**
   - Verifica l'autorizzazione per il pasto
   - Controlla i parametri di paginazione

4. **Performance lenta**
   - Usa la paginazione per grandi quantità di messaggi
   - Considera l'implementazione di indici aggiuntivi
