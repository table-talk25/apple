const admin = require('firebase-admin');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Meal = require('./models/Meal');
const Chat = require('./models/Chat');
const mongoose = require('mongoose');
const notificationService = require('./services/notificationService');

// Firebase Admin SDK - configurazione
// Firebase Admin SDK viene inizializzato in server.js
// Qui controlliamo solo se è disponibile


// Mappa per tenere traccia degli utenti connessi
// { userId: socketId }
const connectedUsers = new Map();

// Rate limiter personalizzato per socket
const rateLimitMap = new Map();

const checkRateLimit = (userId, maxRequests, windowMs) => {
  const now = Date.now();
  const key = `${userId}`;
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const userLimit = rateLimitMap.get(key);
  
  if (now > userLimit.resetTime) {
    userLimit.count = 1;
    userLimit.resetTime = now + windowMs;
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  userLimit.count++;
  return true;
};

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5001',
  'http://localhost:5002',
  'http://localhost:5003',
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.API_URL || 'http://localhost:5001',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
];


let ioInstance;

function initializeSocket(server) {
  ioInstance = socketIO(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    // Configurazione ottimizzata per WebSocket
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'], // WebSocket come primario, polling come fallback
    allowUpgrades: true,
    upgradeTimeout: 10000
  });

  // Middleware di autenticazione
  ioInstance.use(async (socket, next) => {
    console.log(`[Socket] Tentativo di connessione da: ${socket.handshake.headers.origin}`);
    console.log(`[Socket] User-Agent: ${socket.handshake.headers['user-agent']}`);
    
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.log('[Socket] ❌ Token mancante');
        return next(new Error('Autenticazione richiesta'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('nickname profileImage');

      if (!user) {
        console.log('[Socket] ❌ Utente non trovato');
        return next(new Error('Utente non trovato'));
      }

      console.log(`[Socket] ✅ Autenticazione riuscita per: ${user.nickname}`);
      socket.user = user;
      next();
    } catch (error) {
      console.error('[Socket Auth] ❌ Errore di autenticazione:', error.message);
      next(new Error('Token non valido'));
    } 
  });
  
  // Gestione della connessione
  ioInstance.on('connection', (socket) => {
    console.log(`✅ Utente connesso via socket: ${socket.user.nickname} (ID: ${socket.id})`);
    connectedUsers.set(socket.user._id.toString(), socket.id);

    // Gestore per quando un utente si unisce a una stanza di chat
    socket.on('joinChatRoom', async (chatId) => { 
      try {
        // Normalizza l'ID: può arrivare come stringa o come oggetto { _id } / { chatId }
        const rawId = (typeof chatId === 'string') ? chatId : (chatId?._id || chatId?.chatId || String(chatId));
        const normalizedId = typeof rawId === 'string' ? rawId.trim() : '';

        // Valida ObjectId per evitare CastError
        if (!normalizedId || !mongoose.Types.ObjectId.isValid(normalizedId)) {
          console.warn(`[Socket] joinChatRoom: chatId non valido ricevuto:`, chatId);
          return; // Ignora silenziosamente richieste non valide
        }

        const chat = await Chat.findOne({ _id: normalizedId, participants: socket.user._id });
        if (!chat) {
          console.log(`[Socket Security] L'utente ${socket.user.nickname} ha tentato di unirsi alla chat ${normalizedId} senza autorizzazione.`);
          return; // Non fare nulla se non autorizzato
        }

        // Unisciti alla stanza della chat (questo permette di ricevere i messaggi in tempo reale)
        socket.join(normalizedId);
        console.log(`✅ [Socket] joinChatRoom: L'utente ${socket.user.nickname} si è unito alla stanza della chat: ${normalizedId}`);
      } catch (err) {
        console.error('[Socket] Errore joinChatRoom:', err.message);
      }
    });

    socket.on('leaveChatRoom', (chatId) => {
      socket.leave(chatId);
      console.log(`L'utente ${socket.user.nickname} ha lasciato la stanza della chat: ${chatId}`);
    });

    // Gestore per l'evento "sta scrivendo"
    socket.on('typing', ({ chatId, isTyping }) => {
      // Controllo rate limit per eventi typing
      if (!checkRateLimit(socket.user._id.toString(), 20, 5000)) {
        console.log(`[Rate Limit] Utente ${socket.user.nickname} ha superato il limite per typing`);
        return;
      }
      
      // Invia l'evento a tutti nella stanza TRANNE al mittente
      socket.to(chatId).emit('userTyping', { 
        user: { 
          _id: socket.user._id,
          nickname: socket.user.nickname
        }, 
        isTyping 
      });
    });
  
    // Gestore per l'invio di un messaggio
    socket.on('sendMessage', async ({ chatId, content }, callback) => {
      try {
        // Controllo rate limit per messaggi
        if (!checkRateLimit(socket.user._id.toString(), 5, 10000)) {
          if (callback) callback({ success: false, error: "Troppi messaggi inviati. Riprova tra qualche secondo." });
          return;
        }
        
        const chat = await Chat.findById(chatId);
        if (!chat) {
          if (callback) callback({ success: false, error: "Chat non trovata." });
          return;
        }

        // Verifica partecipazione
        const isParticipant = chat.participants.some(p => p._id ? p._id.toString() === socket.user._id.toString() : p.toString() === socket.user._id.toString());
        if (!isParticipant) {
          if (callback) callback({ success: false, error: "Non autorizzato." });
          return;
        }
        
        // Salva nel DB usando il metodo del modello
        await chat.addMessage(socket.user._id, content.trim());

        // Prendi il messaggio salvato e popolalo
        // (Importante per mostrare nome e foto subito)
        await chat.populate('messages.sender', 'nickname profileImage');
        const newMessage = chat.messages[chat.messages.length - 1];

        // Invia a TUTTI nella stanza (incluso chi ha inviato, per conferma)
        ioInstance.to(chatId).emit('receiveMessage', newMessage);

        // 🔔 NOTIFICHE PUSH
        // Invia notifica agli altri partecipanti
        const otherParticipants = chat.participants
          .map(p => p._id ? p._id.toString() : p.toString())
          .filter(id => id !== socket.user._id.toString());

        // (Logica notifiche semplificata)
        try {
          const sender = await User.findById(socket.user._id);
          for (const pId of otherParticipants) {
            const recipient = await User.findById(pId);
            if (recipient?.fcmToken) {
              // Usa il servizio di notifiche se disponibile
              if (typeof notificationService?.sendPushNotification === 'function') {
                await notificationService.sendPushNotification(
                  recipient.fcmToken,
                  `Messaggio da ${sender.nickname}`,
                  content.trim(),
                  { type: 'chat_message', chatId: chatId }
                );
              } else if (admin.apps.length > 0 && recipient.fcmTokens && recipient.fcmTokens.length > 0) {
                // Fallback a Firebase Admin diretto
                const payload = {
                  notification: { 
                    title: `Messaggio da ${sender.nickname}`, 
                    body: content.trim() 
                  },
                  data: { 
                    type: 'chat_message', 
                    chatId: chatId 
                  }
                };
                await admin.messaging().sendToDevice(recipient.fcmTokens, payload);
              }
            }
          }
        } catch (err) {
          console.error('Errore invio notifiche push chat:', err);
        }
  
        if (callback) callback({ success: true, message: newMessage });

      } catch (error) {
        console.error('[Socket] Errore durante l\'invio/salvataggio del messaggio:', error);
        if (callback) callback({ success: false, error: "Errore del server." });
      }
    });

    socket.on('joinRoom', async ({ mealId }) => {
      try {
        // --- CONTROLLO DI AUTORIZZAZIONE ---
        const meal = await Meal.findById(mealId);
        if (!meal || !meal.participants.map(id => id.toString()).includes(socket.user._id.toString())) {
          socket.emit('error', 'Non autorizzato a partecipare a questa chat.');
          return;
        }
        // -----------------------------------
        socket.join(mealId);
        console.log(`✅ L'utente ${socket.user._id} si è unito alla stanza: ${mealId}`);
        // (Opzionale) ioInstance.to(mealId).emit('userJoined', { userId: socket.user._id });
      } catch (error) {
        console.error('Errore durante joinRoom:', error);
        socket.emit('error', 'Errore del server durante la connessione alla stanza.');
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Utente disconnesso: ${socket.user.nickname} (ID: ${socket.id}) - Motivo: ${reason}`);
      // Rimuovi l'utente dalla mappa degli utenti connessi
      connectedUsers.delete(socket.user._id.toString());
    });
  });
}


const getIO = () => ioInstance;

module.exports = { initializeSocket, getIO };