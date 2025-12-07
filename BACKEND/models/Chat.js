const mongoose = require('mongoose');

/**
 * Schema per i messaggi all'interno di una chat
 */
const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Il mittente del messaggio è obbligatorio']
  },
  content: {
    type: String,
    required: [true, 'Il contenuto del messaggio è obbligatorio'],
    trim: true,
    maxlength: [500, 'Il messaggio non può superare i 500 caratteri'],
    minlength: [1, 'Il messaggio non può essere vuoto']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file', 'link'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    name: String,
    size: Number
  }]
});

/**
 * Schema per le chat dell'app TableTalk
 * Ogni pasto virtuale ha una sua chat associata
 */
const ChatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Il nome della chat è obbligatorio'],
    trim: true,
    maxlength: [100, 'Il nome della chat non può superare i 100 caratteri']
  },
  mealId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Meal',
  },
  participants: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [MessageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isClosed: {
    type: Boolean,
    default: false
  },
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    messageRetention: {
      type: Number,
      default: 30, // giorni
      min: 1,
      max: 365
    }
  },
  // Traccia chi sta scrivendo nella chat
  typingUsers: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Proprietà virtuale per calcolare la data di scadenza della chat.
// La chat scade 1 ora dopo la fine del pasto.
ChatSchema.virtual('expirationDate').get(function() {
  // Per funzionare, il campo 'mealId' deve essere popolato!
  if (!this.mealId || !this.mealId.date || !this.mealId.duration) {
    return null;
  }
  // Calcoliamo l'ora di fine del pasto in millisecondi
  const mealEndTime = new Date(this.mealId.date).getTime() + (this.mealId.duration * 60000);
  // Aggiungiamo 1 ora (3600000 millisecondi)
  return new Date(mealEndTime + 3600000);
});

// Proprietà virtuale che ci dice se la chat è scaduta.
ChatSchema.virtual('isExpired').get(function() {
  if (!this.expirationDate) return false;
  // Ritorna 'true' se l'ora attuale ha superato l'ora di scadenza
  return new Date() > this.expirationDate;
});

// Indici per ottimizzare le query
ChatSchema.index({ mealId: 1 });
ChatSchema.index({ participants: 1 });
ChatSchema.index({ updatedAt: -1 });
ChatSchema.index({ 'messages.timestamp': -1 });


// Middleware pre-find per popolare i riferimenti
ChatSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'participants',
    select: 'nickname profileImage'
  }).populate({
    path: 'messages.sender',
    select: 'nickname profileImage'
  }).populate({
    path: 'messages.readBy.user',
    select: 'nickname profileImage'
  }).populate({
    path: 'typingUsers.user',
    select: 'nickname profileImage'
  });
  
  next();
});

// Middleware per aggiornare updatedAt e lastActivity
ChatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.updatedAt = Date.now();
    this.lastActivity = Date.now();
  }
  next();
});

// Metodo per aggiungere un messaggio
ChatSchema.methods.addMessage = async function(senderId, content, attachments = []) {
  const message = {
    sender: senderId,
    content,
    read: [senderId],
    readBy: [{
      user: senderId,
      readAt: new Date()
    }],
    timestamp: Date.now()
  };

  if (attachments.length > 0) {
    message.attachments = attachments;
  }

  this.messages.push(message);
  this.updatedAt = Date.now();
  this.lastActivity = Date.now();
  
  return this.save();
};

// Metodo per marcare i messaggi come letti
ChatSchema.methods.markAsRead = async function(userId) {
  this.messages.forEach(message => {
    if (!message.read.includes(userId)) {
      message.read.push(userId);
    }
    
    // Aggiungi anche al campo readBy con timestamp
    const existingReadBy = message.readBy.find(rb => rb.user.toString() === userId.toString());
    if (!existingReadBy) {
      message.readBy.push({
        user: userId,
        readAt: new Date()
      });
    }
  });
  
  return this.save();
};

// Metodo per ottenere i messaggi non letti
ChatSchema.methods.getUnreadMessages = function(userId) {
  return this.messages.filter(message => 
    !message.read.includes(userId) && 
    message.sender.toString() !== userId
  );
};

// Metodo per aggiungere un partecipante
ChatSchema.methods.addParticipant = async function(userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    return this.save();
  }
  return this;
};

// Metodo per rimuovere un partecipante
ChatSchema.methods.removeParticipant = async function(userId) {
  this.participants = this.participants.filter(
    p => p.toString() !== userId.toString()
  );
  return this.save();
};

// Metodo per pulire i messaggi vecchi
ChatSchema.methods.cleanOldMessages = async function() {
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - this.settings.messageRetention);
  
  this.messages = this.messages.filter(
    message => message.timestamp > retentionDate
  );
  
  return this.save();
};

// Metodo per iniziare a scrivere
ChatSchema.methods.startTyping = async function(userId) {
  const existingTyping = this.typingUsers.find(tu => tu.user.toString() === userId.toString());
  if (!existingTyping) {
    this.typingUsers.push({
      user: userId,
      startedAt: new Date()
    });
    return this.save();
  }
  return this;
};

// Metodo per smettere di scrivere
ChatSchema.methods.stopTyping = async function(userId) {
  this.typingUsers = this.typingUsers.filter(
    tu => tu.user.toString() !== userId.toString()
  );
  return this.save();
};

// Metodo per pulire gli utenti che scrivono da troppo tempo (timeout)
ChatSchema.methods.cleanTypingUsers = async function() {
  const timeoutThreshold = new Date(Date.now() - 10000); // 10 secondi
  this.typingUsers = this.typingUsers.filter(
    tu => tu.startedAt > timeoutThreshold
  );
  return this.save();
};

// Metodo statico per trovare le chat attive di un utente
ChatSchema.statics.findActiveChats = function(userId) {
  return this.find({
    participants: userId,
    isActive: true
  }).sort({ lastActivity: -1 });
};

// Metodo statico per trovare le chat con messaggi non letti
ChatSchema.statics.findUnreadChats = function(userId) {
  return this.find({
    participants: userId,
    'messages.read': { $ne: userId }
  });
};

module.exports = mongoose.model('Chat', ChatSchema);