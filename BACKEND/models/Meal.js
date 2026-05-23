const mongoose = require('mongoose');

/**
 * Schema per i pasti virtuali nell'app TableTalk
 * Gestisce le informazioni sui pasti, i partecipanti e i link per videochiamata
 */
const MealSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Per favore inserisci un titolo per il pasto virtuale'],
    trim: true,
    maxlength: [50, 'Il titolo non può superare i 100 caratteri'],
    minlength: [10, 'Il titolo deve essere di almeno 10 caratteri']
  },
  imageUrl: {
    type: String,
    default: null 
  },
  mealType: {
    type: String,
    required: [true, 'Il tipo di TableTalk è obbligatorio'],
    enum: {
      values: ['virtual', 'physical'],
      message: 'Il tipo di TableTalk deve essere "virtual" o "physical"'
    },
    default: 'virtual'
  },
  type: {
    type: String,
    required: [true, 'Il tipo di pasto è obbligatorio'],
    enum: {
      values: ['breakfast', 'brunch', 'lunch', 'dinner', 'aperitif'],
      message: 'Il tipo di pasto deve essere uno tra: colazione, brunch, pranzo, cena, aperitivo' 
    }
  },
  description: {
    type: String,
    required: [true, 'Per favore inserisci una descrizione'],
    maxlength: [1000, 'La descrizione non può superare i 1000 caratteri'],
    minlength: [10, 'La descrizione deve essere di almeno 10 caratteri']
  },
  date: {
    type: Date,
    required: [true, 'Per favore specifica data e ora del pasto'],
    validate: [
      {
        validator: function(date) {
          return date instanceof Date && !isNaN(date.getTime());
        },
        message: 'La data deve essere in formato ISO8601 valido'
      },
      {
        validator: function(date) {
          if (this.isNew) {
            return date > new Date();
          }
          return true;
        },
        message: 'La data di un nuovo pasto deve essere futura'
      }
    ]
  },
  duration: {
    type: Number,
    required: [true, 'Per favore specifica la durata del pasto'],
    default: 60,
    min: [30, 'La durata minima è di 30 minuti'],
    max: [180, 'La durata massima è di 3 ore (180 minuti)'],
    validate: {
      validator: function(value) {
        return Number.isInteger(value) && value >= 30 && value <= 180;
      },
      message: 'La durata deve essere un numero intero tra 30 e 180 minuti'
    }
  },
  maxParticipants: {
    type: Number,
    required: [true, 'Per favore specifica il numero massimo di partecipanti'],
    min: [2, 'Ci devono essere almeno 2 partecipanti'],
    max: [10, 'Non possono partecipare più di 10 persone'],
    validate: {
      validator: function(value) {
        return Number.isInteger(value) && value >= 2 && value <= 10;
      },
      message: 'Il numero di partecipanti deve essere un intero tra 2 e 10'
    }
  },
  host: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  participantsCount: {
    type: Number,
    default: 0
  },
  language: {
    type: String,
    required: [true, 'Per favore specifica la lingua principale della conversazione'],
    enum: {
      values: ['Italiano', 'English', 'Español', 'Français', 'Deutsch', '中文', 'العربية'],
      message: 'La lingua deve essere una tra: Italiano, English, Español, Français, Deutsch, 中文, العربية'
    }
  },
  topics: {
    type: [String],
    validate: {
      validator: function(topics) {
        if (topics.length > 5) {
          this.invalidate('topics', 'Puoi inserire un massimo di 5 argomenti.');
          return false;
        }
        if (!topics.every(topic => topic.trim().length >= 2 && topic.trim().length <= 50)) {
          this.invalidate('topics', 'Ogni argomento deve essere lungo tra 2 e 50 caratteri.');
          return false;
        }
        return true;
      }
    }
  },
  location: {
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: function(value) {
        if (this.mealType === 'physical' && (!value || (typeof value === 'string' && value.trim().length === 0) || (typeof value === 'object' && !value.address))) {
          this.invalidate('location', 'La posizione è obbligatoria per un pasto fisico');
          return false;
        }
        if (this.mealType === 'virtual') {
          return true;
        }
        if (typeof value === 'string') {
          return value.trim().length >= 5 && value.trim().length <= 200;
        }
        if (typeof value === 'object' && value !== null) {
          if (!value.address || typeof value.address !== 'string' || value.address.trim().length === 0) {
            return false;
          }
          if (value.address.trim().length < 5 || value.address.trim().length > 200) {
            return false;
          }
          if (value.coordinates && Array.isArray(value.coordinates)) {
            if (value.coordinates.length !== 2) {
              return false;
            }
            const [lng, lat] = value.coordinates;
            if (typeof lng !== 'number' || typeof lat !== 'number' || 
                isNaN(lng) || isNaN(lat) || 
                lng < -180 || lng > 180 || lat < -90 || lat > 90) {
              return false;
            }
          }
          return true;
        }
        return false;
      },
      message: 'La posizione deve essere valida: stringa tra 5-200 caratteri o oggetto con address e coordinate opzionali'
    }
  },
  isPublic: {
    type: Boolean,
    default: true,
    required: true
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  videoCallLink: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || v.startsWith('http');
      },
      message: 'Il link della videochiamata deve essere un URL valido'
    }
  },
  videoCallProvider: {
    type: String,
    enum: ['jitsi', 'zoom', 'meet', 'altro'],
    default: 'jitsi'
  },
  chatId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Chat'
  },
  twilioRoomSid: {
    type: String,
    select: false 
  },
  status: {
    type: String,
    required: [true, 'Lo stato del pasto è obbligatorio'],
    enum: {
      values: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      message: 'Lo stato del pasto deve essere uno tra: upcoming, ongoing, completed, cancelled'
    },
    default: 'upcoming'
  },

  videoCallStatus: {
    type: String,
    enum: ['pending', 'active', 'ended'],
    default: 'pending',
    required: true
  },

  // Flag per evitare che il cron reminder venga inviato più di una volta
  reminderSent: {
    type: Boolean,
    default: false,
  },

  settings: {
    allowLateJoin: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    videoQuality: {
      type: String,
      enum: ['SD', 'HD', 'FullHD'],
      default: 'HD'
    },
    backgroundBlur: {
      type: Boolean,
      default: true
    }
  },
  notifications: [{
    type: {
      type: String,
      enum: ['join', 'leave', 'update', 'reminder', 'system'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    recipient: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  ratings: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indici per ottimizzare le query
MealSchema.index({ date: 1, status: 1 });
MealSchema.index({ host: 1 });
MealSchema.index({ participants: 1 });
MealSchema.index({ language: 1 });
MealSchema.index({ topics: 1 });
MealSchema.index({ mealType: 1 });
MealSchema.index({ 'notifications.recipient': 1, 'notifications.read': 1 });
MealSchema.index({ 'ratings.user': 1 });
// Indice per il cron reminder: cerca pasti upcoming non ancora notificati
MealSchema.index({ date: 1, status: 1, reminderSent: 1 });

// Virtual per vedere se il pasto è pieno
MealSchema.virtual('isFull').get(function() {
  return this.participantsCount >= this.maxParticipants;
});

// Virtual per vedere se il pasto è passato
MealSchema.virtual('isPast').get(function() {
  if (!this.date) return false;
  return new Date(this.date) < new Date();
});

// Virtual per vedere se il pasto è in corso
MealSchema.virtual('isActive').get(function() {
  if (!this.date) return false;
  const now = new Date();
  const endTime = new Date(this.date.getTime() + (this.duration || 0) * 60000);
  return now >= this.date && now <= endTime;
});

// Virtual per vedere il tempo rimanente
MealSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const startTime = this.date;
  const endTime = new Date(startTime.getTime() + (this.duration || 60) * 60 * 1000);
  if (this.status === 'cancelled') return 0;
  if (now < startTime) return Math.ceil((startTime.getTime() - now.getTime()) / (1000 * 60));
  if (now >= startTime && now < endTime) return Math.ceil((endTime.getTime() - now.getTime()) / (1000 * 60));
  return 0;
});

// Virtual per la media dei rating
MealSchema.virtual('averageRating').get(function() {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, curr) => acc + curr.score, 0);
  return sum / this.ratings.length;
});

// Metodo per ottenere i pasti futuri
MealSchema.statics.findUpcoming = function() {
  return this.find({ date: { $gt: new Date() }, status: 'upcoming' }).sort({ date: 1 });
};

// Metodo per ottenere i pasti attivi
MealSchema.statics.findActive = function() {
  const now = new Date();
  return this.find({ date: { $lte: now }, status: 'ongoing' });
};

// Metodo per ottenere i pasti di un utente
MealSchema.statics.findUserMeals = function(userId) {
  return this.find({ $or: [{ host: userId }, { participants: userId }] });
};

// Metodo per ottenere pasti virtuali
MealSchema.statics.findVirtualMeals = function() {
  return this.find({ mealType: 'virtual' });
};

// Metodo per ottenere pasti fisici
MealSchema.statics.findPhysicalMeals = function() {
  return this.find({ mealType: 'physical' });
};

// Unico pre-save hook combinato e corretto
MealSchema.pre('save', function(next) {
  if (this.isModified('participants')) {
    this.participantsCount = this.participants.length;
  }
  if (this.isNew && !this.participants.includes(this.host)) {
    this.participants.push(this.host);
  }
  next();
});

// Metodo per verificare se un utente è l'host del pasto
MealSchema.methods.isHost = function(userId) {
  return this.host.toString() === userId.toString();
};

// Metodo per verificare se un utente è partecipante al pasto
MealSchema.methods.isParticipant = function(userId) {
  return this.participants.some(participant => 
    participant.toString() === userId.toString()
  );
};

// 🕐 STATUS VIRTUALE: Calcola lo stato preciso in tempo reale
MealSchema.virtual('virtualStatus').get(function() {
  const now = new Date();
  const startTime = this.date;
  const endTime = new Date(startTime.getTime() + (this.duration || 60) * 60 * 1000);
  if (this.status === 'cancelled') return 'cancelled';
  if (now < startTime) return 'upcoming';
  if (now >= startTime && now < endTime) return 'ongoing';
  return 'completed';
});

// 🕐 STATUS DETTAGLIATO
MealSchema.virtual('statusInfo').get(function() {
  const now = new Date();
  const startTime = this.date;
  const endTime = new Date(startTime.getTime() + (this.duration || 60) * 60 * 1000);
  if (this.status === 'cancelled') {
    return { status: 'cancelled', message: 'Pasto cancellato', isActive: false, isUpcoming: false, isCompleted: false };
  }
  if (now < startTime) {
    const minutesUntilStart = Math.ceil((startTime.getTime() - now.getTime()) / (1000 * 60));
    return { status: 'upcoming', message: `Inizia tra ${minutesUntilStart} minuti`, isActive: false, isUpcoming: true, isCompleted: false, timeUntilStart: minutesUntilStart, startTime, endTime };
  } else if (now >= startTime && now < endTime) {
    const minutesElapsed = Math.ceil((now.getTime() - startTime.getTime()) / (1000 * 60));
    const minutesRemaining = Math.ceil((endTime.getTime() - now.getTime()) / (1000 * 60));
    return { status: 'ongoing', message: `In corso (${minutesRemaining} minuti rimanenti)`, isActive: true, isUpcoming: false, isCompleted: false, timeElapsed: minutesElapsed, timeRemaining: minutesRemaining, startTime, endTime, progress: Math.round(((now - startTime) / (this.duration * 60 * 1000)) * 100) };
  } else {
    const minutesSinceEnd = Math.ceil((now.getTime() - endTime.getTime()) / (1000 * 60));
    return { status: 'completed', message: `Completato ${minutesSinceEnd} minuti fa`, isActive: false, isUpcoming: false, isCompleted: true, timeSinceEnd: minutesSinceEnd, startTime, endTime };
  }
});

// 🕐 PROSSIMO AGGIORNAMENTO
MealSchema.virtual('nextStatusUpdate').get(function() {
  const now = new Date();
  const startTime = this.date;
  const endTime = new Date(startTime.getTime() + (this.duration || 60) * 60 * 1000);
  if (this.status === 'cancelled') return null;
  if (now < startTime) return startTime;
  if (now >= startTime && now < endTime) return endTime;
  return null;
});

// Metodo per aggiungere un partecipante
MealSchema.methods.addParticipant = function(userId) {
  if (this.isFull) throw new Error('Il pasto ha raggiunto il numero massimo di partecipanti');
  if (this.isParticipant(userId)) throw new Error('Sei già un partecipante di questo pasto');
  if (this.isPast) throw new Error('Non è possibile unirsi a un pasto già passato');
  if (!this.settings.allowLateJoin && this.isActive) throw new Error('Non è possibile unirsi a un pasto già iniziato');
  this.participants.push(userId);
  this.notifications.push({ type: 'join', message: 'Un nuovo partecipante si è unito al pasto', recipient: this.host });
  return this.save();
};

// Metodo per rimuovere un partecipante
MealSchema.methods.removeParticipant = function(userId) {
  if (this.isHost(userId)) throw new Error('L\'host non può lasciare il pasto');
  if (!this.isParticipant(userId)) throw new Error('Non sei un partecipante di questo pasto');
  this.participants = this.participants.filter(p => p.toString() !== userId.toString());
  this.notifications.push({ type: 'leave', message: 'Un partecipante ha lasciato il pasto', recipient: this.host });
  return this.save();
};

// Metodo per aggiungere un rating
MealSchema.methods.addRating = function(userId, score, comment) {
  if (!this.isParticipant(userId)) throw new Error('Solo i partecipanti possono lasciare un rating');
  const existingRating = this.ratings.find(r => r.user.toString() === userId.toString());
  if (existingRating) {
    existingRating.score = score;
    existingRating.comment = comment;
    existingRating.createdAt = Date.now();
  } else {
    this.ratings.push({ user: userId, score, comment });
  }
  return this.save();
};

// Metodo per aggiungere una notifica
MealSchema.methods.addNotification = function(type, message, recipient) {
  this.notifications.push({ type, message, recipient, read: false });
  return this.save();
};

// Metodo per marcare le notifiche come lette
MealSchema.methods.markNotificationsAsRead = function(userId) {
  this.notifications.forEach(notification => {
    if (notification.recipient.toString() === userId.toString()) notification.read = true;
  });
  return this.save();
};

// 🕐 SINCRONIZZAZIONE STATUS
MealSchema.methods.syncStatus = function() {
  const virtualStatus = this.virtualStatus;
  if (virtualStatus !== this.status && virtualStatus !== 'cancelled') {
    this.status = virtualStatus;
    console.log(`🔄 [Meal] Status sincronizzato: ${this.status} -> ${virtualStatus} (Meal ID: ${this._id})`);
    const notificationMessage = `Il pasto è ora ${virtualStatus}`;
    this.participants.forEach(participant => {
      this.notifications.push({ type: 'status_update', message: notificationMessage, recipient: participant });
    });
  }
  return this;
};

// Metodo per aggiornare lo stato del pasto
MealSchema.methods.updateStatus = function(newStatus) {
  if (!['upcoming', 'ongoing', 'completed', 'cancelled'].includes(newStatus)) throw new Error('Stato non valido');
  this.status = newStatus;
  const notificationMessage = `Il pasto è stato ${newStatus}`;
  this.participants.forEach(participant => {
    this.notifications.push({ type: 'update', message: notificationMessage, recipient: participant });
  });
  return this.save();
};

MealSchema.set('toJSON', { virtuals: true });
MealSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Meal', MealSchema);
