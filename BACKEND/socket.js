const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');
const Meal = require('./models/Meal');
const Chat = require('./models/Chat');

// Mappa per tenere traccia degli utenti connessi: { userId: socketId }
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

async function initializeSocket(server) {
  ioInstance = socketIO(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'], 
    allowUpgrades: true,
    upgradeTimeout: 10000
  });

  if (process.env.REDIS_URL) {
    try {
      const { createClient } = require('redis');
      const { createAdapter } = require('@socket.io/redis-adapter');
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      ioInstance.adapter(createAdapter(pubClient, subClient));
      console.log('✅ [Socket] Redis adapter attivo (Socket.IO multi-istanza)');
    } catch (err) {
      console.warn('⚠️ [Socket] REDIS_URL presente ma adapter Redis non inizializzato:', err.message);
    }
  }

  // Middleware di autenticazione
  ioInstance.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Autenticazione richiesta'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('nickname profileImage');

      if (!user) return next(new Error('Utente non trovato'));

      socket.user = user;
      next();
    } catch (error) {
      console.error('[Socket Auth] ❌ Errore di autenticazione:', error.message);
      next(new Error('Token non valido'));
    } 
  });
  
  // Gestione della connessione
  ioInstance.on('connection', (socket) => {
    console.log(`✅ [Socket] Connesso: ${socket.user.nickname}`);
    
    // Memorizziamo l'utente connesso per il servizio notifiche
    connectedUsers.set(socket.user._id.toString(), socket.id);

    // Unisciti a una chat room
    socket.on('joinChatRoom', async (chatId) => { 
      try {
        const rawId = (typeof chatId === 'string') ? chatId : (chatId?._id || chatId?.chatId || String(chatId));
        const normalizedId = typeof rawId === 'string' ? rawId.trim() : '';

        if (!normalizedId || !mongoose.Types.ObjectId.isValid(normalizedId)) return;

        const chat = await Chat.findOne({ _id: normalizedId, participants: socket.user._id });
        if (!chat) return;

        socket.join(normalizedId);
      } catch (err) {
        console.error('[Socket] Errore joinChatRoom:', err.message);
      }
    });

    // Lascia una chat room
    socket.on('leaveChatRoom', (chatId) => {
      socket.leave(chatId);
    });

    // Typing indicator
    socket.on('typing', ({ chatId, isTyping }) => {
      if (!checkRateLimit(socket.user._id.toString(), 20, 5000)) return;
      
      socket.to(chatId).emit('userTyping', { 
        user: { _id: socket.user._id, nickname: socket.user.nickname }, 
        isTyping 
      });
    });
  
    // Invia messaggio
    socket.on('sendMessage', async ({ chatId, content }, callback) => {
      try {
        if (!checkRateLimit(socket.user._id.toString(), 5, 10000)) {
          if (callback) callback({ success: false, error: "Troppi messaggi inviati." });
          return;
        }
        
        const chat = await Chat.findById(chatId);
        if (!chat) {
          if (callback) callback({ success: false, error: "Chat non trovata." });
          return;
        }

        const isParticipant = chat.participants.some(p => p.toString() === socket.user._id.toString() || (p._id && p._id.toString() === socket.user._id.toString()));
        if (!isParticipant) {
          if (callback) callback({ success: false, error: "Non autorizzato." });
          return;
        }
        
        await chat.addMessage(socket.user._id, content.trim());
        await chat.populate('messages.sender', 'nickname profileImage');
        const newMessage = chat.messages[chat.messages.length - 1];

        // Manda il messaggio ai WebSockets
        ioInstance.to(chatId).emit('receiveMessage', newMessage);

        // Deleghiamo interamente la notifica Push al notificationService
        // Evitiamo di chiamare Firebase admin qui dentro per pulizia.
        const notificationService = require('./services/notificationService');
        if (notificationService && typeof notificationService.handleChatNotification === 'function') {
            await notificationService.handleChatNotification(chat, socket.user, content.trim(), newMessage);
        }
  
        if (callback) callback({ success: true, message: newMessage });

      } catch (error) {
        console.error('[Socket] Errore sendMessage:', error.message);
        if (callback) callback({ success: false, error: "Errore server." });
      }
    });

    // Unisciti alla stanza del pasto
    socket.on('joinRoom', async ({ mealId }) => {
      try {
        const meal = await Meal.findById(mealId);
        if (!meal || !meal.participants.map(id => id.toString()).includes(socket.user._id.toString())) {
          socket.emit('error', 'Non autorizzato.');
          return;
        }
        socket.join(mealId);
      } catch (error) {
        socket.emit('error', 'Errore connessione stanza.');
      }
    });

    // 🎵 MUSIC SHARE — host condivide un link musicale con la stanza video del meal.
    // L'evento "joinRoom" valida gia' che il chiamante e' partecipante; qui validiamo
    // che sia l'HOST del meal prima di rebroadcastare a tutta la stanza.
    socket.on('music:share', async ({ mealId, url }) => {
      try {
        if (!mealId || typeof mealId !== 'string') return;
        if (!mongoose.Types.ObjectId.isValid(mealId)) return;
        const safeUrl = (typeof url === 'string') ? url.trim().slice(0, 500) : '';
        // Solo HTTPS (i provider supportati lo richiedono comunque per gli iframe)
        if (safeUrl && !/^https:\/\//i.test(safeUrl)) return;

        // Rate limit: max 5 cambi musica ogni 30s per host
        if (!checkRateLimit(`music:${socket.user._id}`, 5, 30000)) return;

        const meal = await Meal.findById(mealId).select('host participants');
        if (!meal) return;

        const isHost = meal.host.toString() === socket.user._id.toString();
        if (!isHost) {
          socket.emit('error', 'Solo l\'host può condividere musica');
          return;
        }

        // Broadcast a tutti i client nella stanza meal (compreso il mittente, così
        // ha conferma che il cambio è andato a buon fine)
        ioInstance.to(mealId).emit('music:shared', {
          url: safeUrl,
          from: { _id: socket.user._id, nickname: socket.user.nickname },
          at: Date.now(),
        });
      } catch (err) {
        console.error('[Socket] Errore music:share:', err.message);
      }
    });

    // 🎵 MUSIC STOP — l'host rimuove il player condiviso dalla stanza.
    socket.on('music:stop', async ({ mealId }) => {
      try {
        if (!mealId || typeof mealId !== 'string') return;
        if (!mongoose.Types.ObjectId.isValid(mealId)) return;

        const meal = await Meal.findById(mealId).select('host');
        if (!meal) return;
        if (meal.host.toString() !== socket.user._id.toString()) return;

        ioInstance.to(mealId).emit('music:stopped', { at: Date.now() });
      } catch (err) {
        console.error('[Socket] Errore music:stop:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ [Socket] Disconnesso: ${socket.user.nickname}`);
      connectedUsers.delete(socket.user._id.toString());
    });
  });
}

const getIO = () => ioInstance;

// FIX CRITICO: Esportiamo esplicitamente connectedUsers per il server.js
module.exports = { 
    initializeSocket, 
    getIO,
    connectedUsers 
};