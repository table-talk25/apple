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

const checkRateLimit = (key, maxRequests, windowMs) => {
  const now = Date.now();

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

    // Typing indicator — chiave per socketId
    socket.on('typing', ({ chatId, isTyping }) => {
      if (!checkRateLimit(`typing:${socket.id}`, 20, 5000)) return;
      
      socket.to(chatId).emit('userTyping', { 
        user: { _id: socket.user._id, nickname: socket.user.nickname }, 
        isTyping 
      });
    });
  
    // Invia messaggio — chiave per socketId, limite 20 messaggi ogni 10 secondi
    socket.on('sendMessage', async ({ chatId, content }, callback) => {
      try {
        if (!checkRateLimit(`msg:${socket.id}`, 20, 10000)) {
          if (callback) callback({ success: false, error: "Stai inviando troppi messaggi, aspetta un momento." });
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

        ioInstance.to(chatId).emit('receiveMessage', newMessage);

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

    socket.on('disconnect', () => {
      console.log(`❌ [Socket] Disconnesso: ${socket.user.nickname}`);
      connectedUsers.delete(socket.user._id.toString());
      // Pulizia rate limit entries per questo socket
      rateLimitMap.delete(`msg:${socket.id}`);
      rateLimitMap.delete(`typing:${socket.id}`);
    });
  });
}

const getIO = () => ioInstance;

module.exports = { 
    initializeSocket, 
    getIO,
    connectedUsers 
};
