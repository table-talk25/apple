const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cron = require('node-cron');
const User = require('./models/User');
const Meal = require('./models/Meal');
const Chat = require('./models/Chat');

// Mappa per tenere traccia degli utenti connessi: { userId: socketId }
const connectedUsers = new Map();

// Rate limiter per socket (chiave per socketId)
const rateLimitMap = new Map();

const checkRateLimit = (key, maxRequests, windowMs) => {
  const now = Date.now();
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  const entry = rateLimitMap.get(key);
  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + windowMs;
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
};

const ALLOWED_EMOJIS = ['❤️','👍','😂','😮','😢','🔥','👏','🎉'];

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

// ─── Cron: reminder 30 minuti prima del pasto ─────────────────────────────────
const startReminderCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const in29 = new Date(now.getTime() + 29 * 60 * 1000);
      const in31 = new Date(now.getTime() + 31 * 60 * 1000);

      const meals = await Meal.find({
        date: { $gte: in29, $lte: in31 },
        status: 'upcoming',
        reminderSent: { $ne: true },
      });

      for (const meal of meals) {
        const notificationService = require('./services/notificationService');
        await notificationService.handleMealReminder(meal);
        meal.reminderSent = true;
        await meal.save();
        console.log(`⏰ [Cron] Reminder inviato per pasto: ${meal.title}`);
      }
    } catch (err) {
      console.error('[Cron] Errore reminder:', err.message);
    }
  });
  console.log('✅ [Cron] Reminder 30min avviato');
};

async function initializeSocket(server) {
  ioInstance = socketIO(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    upgradeTimeout: 10000,
  });

  if (process.env.REDIS_URL) {
    try {
      const { createClient } = require('redis');
      const { createAdapter } = require('@socket.io/redis-adapter');
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      ioInstance.adapter(createAdapter(pubClient, subClient));
      console.log('✅ [Socket] Redis adapter attivo');
    } catch (err) {
      console.warn('⚠️ [Socket] Redis adapter non inizializzato:', err.message);
    }
  }

  // Middleware autenticazione
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
      next(new Error('Token non valido'));
    }
  });

  ioInstance.on('connection', (socket) => {
    console.log(`✅ [Socket] Connesso: ${socket.user.nickname}`);
    connectedUsers.set(socket.user._id.toString(), socket.id);

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

    socket.on('leaveChatRoom', (chatId) => socket.leave(chatId));

    socket.on('typing', ({ chatId, isTyping }) => {
      if (!checkRateLimit(`typing:${socket.id}`, 20, 5000)) return;
      socket.to(chatId).emit('userTyping', {
        user: { _id: socket.user._id, nickname: socket.user.nickname },
        isTyping,
      });
    });

    // Invia messaggio — 20 msg / 10s per socketId
    // Accetta campo opzionale replyTo: { _id, senderName, message }
    socket.on('sendMessage', async ({ chatId, content, replyTo }, callback) => {
      try {
        if (!checkRateLimit(`msg:${socket.id}`, 20, 10000)) {
          if (callback) callback({ success: false, error: 'Stai inviando troppi messaggi, aspetta un momento.' });
          return;
        }
        const chat = await Chat.findById(chatId);
        if (!chat) {
          if (callback) callback({ success: false, error: 'Chat non trovata.' });
          return;
        }
        const isParticipant = chat.participants.some(
          p => p.toString() === socket.user._id.toString() ||
               (p._id && p._id.toString() === socket.user._id.toString())
        );
        if (!isParticipant) {
          if (callback) callback({ success: false, error: 'Non autorizzato.' });
          return;
        }

        // Sanitizza replyTo: accetta solo campi attesi, scarta il resto
        const sanitizedReplyTo = (replyTo && replyTo._id && replyTo.message)
          ? { _id: replyTo._id, senderName: replyTo.senderName || '', message: String(replyTo.message).substring(0, 200) }
          : null;

        await chat.addMessage(socket.user._id, content.trim(), [], sanitizedReplyTo);
        await chat.populate('messages.sender', 'nickname profileImage');
        const newMessage = chat.messages[chat.messages.length - 1];

        ioInstance.to(chatId).emit('receiveMessage', newMessage);

        const notificationService = require('./services/notificationService');
        if (typeof notificationService.handleChatNotification === 'function') {
          await notificationService.handleChatNotification(chat, socket.user, content.trim(), newMessage);
        }

        if (callback) callback({ success: true, message: newMessage });
      } catch (error) {
        console.error('[Socket] Errore sendMessage:', error.message);
        if (callback) callback({ success: false, error: 'Errore server.' });
      }
    });

    // Toggle reazione emoji su un messaggio — 30 toggle / 10s per socket
    socket.on('toggleReaction', async ({ chatId, messageId, emoji }, callback) => {
      try {
        if (!checkRateLimit(`reaction:${socket.id}`, 30, 10000)) {
          if (callback) callback({ success: false, error: 'Troppe reazioni, aspetta un momento.' });
          return;
        }
        if (!ALLOWED_EMOJIS.includes(emoji)) {
          if (callback) callback({ success: false, error: 'Emoji non consentita.' });
          return;
        }
        const chat = await Chat.findOne({ _id: chatId, participants: socket.user._id });
        if (!chat) {
          if (callback) callback({ success: false, error: 'Chat non trovata o non autorizzato.' });
          return;
        }
        const message = chat.messages.id(messageId);
        if (!message) {
          if (callback) callback({ success: false, error: 'Messaggio non trovato.' });
          return;
        }

        // Cerca la reazione esistente per questo emoji
        let reaction = message.reactions.find(r => r.emoji === emoji);
        if (!reaction) {
          // Prima reazione con questo emoji
          message.reactions.push({ emoji, users: [socket.user._id] });
        } else {
          const alreadyReacted = reaction.users.some(u => u.toString() === socket.user._id.toString());
          if (alreadyReacted) {
            // Rimuovi l'utente (toggle off)
            reaction.users = reaction.users.filter(u => u.toString() !== socket.user._id.toString());
            // Rimuovi l'entry se non ci sono più utenti
            if (reaction.users.length === 0) {
              message.reactions = message.reactions.filter(r => r.emoji !== emoji);
            }
          } else {
            // Aggiungi l'utente (toggle on)
            reaction.users.push(socket.user._id);
          }
        }

        await chat.save();

        // Invia l'aggiornamento a tutti i partecipanti nella stanza
        ioInstance.to(chatId).emit('reactionUpdated', {
          messageId,
          reactions: message.reactions.map(r => ({
            emoji: r.emoji,
            count: r.users.length,
            users: r.users.map(u => u.toString()),
          })),
        });

        if (callback) callback({ success: true });
      } catch (error) {
        console.error('[Socket] Errore toggleReaction:', error.message);
        if (callback) callback({ success: false, error: 'Errore server.' });
      }
    });

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
      rateLimitMap.delete(`msg:${socket.id}`);
      rateLimitMap.delete(`typing:${socket.id}`);
      rateLimitMap.delete(`reaction:${socket.id}`);
    });
  });

  startReminderCron();
}

const getIO = () => ioInstance;

module.exports = { initializeSocket, getIO, connectedUsers };
