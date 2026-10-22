const mongoose = require('mongoose');
const { calculateMealStatus, getMealTiming, isTerminal } = require('../utils/mealLifecycle');

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

MealSchema.index({ date: 1, status: 1 });
MealSchema.index({ host: 1 });
MealSchema.index({ participants: 1 });
MealSchema.index({ language: 1 });
MealSchema.index({ topics: 1 });
MealSchema.index({ mealType: 1 });
MealSchema.index({ 'notifications.recipient': 1, 'notifications.read': 1 });
MealSchema.index({ 'ratings.user': 1 });
MealSchema.index({ date: 1, status: 1, reminderSent: 1 });

MealSchema.virtual('isFull').get(function() {
  return this.participantsCount >= this.maxParticipants;
});
MealSchema.virtual('isPast').get(function() {
  if (!this.date) return false;
  return new Date(this.date) < new Date();
});
MealSchema.virtual('isActive').get(function() {
  if (!this.date) return false;
  return calculateMealStatus(this) === 'ongoing';
});
MealSchema.virtual('timeRemaining').get(function() {
  if (isTerminal(this.status) || !this.date) return 0;
  const now = new Date();
  const status = calculateMealStatus(this, now);
  const { startTime, endTime } = getMealTiming(this);
  if (status === 'upcoming') return Math.ceil((startTime - now) / 60000);
  if (status === 'ongoing') return Math.ceil((endTime - now) / 60000);
  return 0;
});
MealSchema.virtual('averageRating').get(function() {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, curr) => acc + curr.score, 0);
  return sum / this.ratings.length;
});
MealSchema.statics.findUpcoming = function() {
  return this.find({ date: { $gt: new Date() }, status: 'upcoming' }).sort({ date: 1 });
};
MealSchema.statics.findActive = function() {
  const now = new Date();
  return this.find({ date: { $lte: now }, status: 'ongoing' });
};
MealSchema.statics.findUserMeals = function(userId) {
  return this.find({ $or: [{ host: userId }, { participants: userId }] });
};
MealSchema.statics.findVirtualMeals = function() {
  return this.find({ mealType: 'virtual' });
};
MealSchema.statics.findPhysicalMeals = function() {
  return this.find({ mealType: 'physical' });
};
MealSchema.pre('save', function(next) {
  if (this.isModified('participants')) {
    this.participantsCount = this.participants.length;
  }
  if (this.isNew && !this.participants.includes(this.host)) {
    this.participants.push(this.host);
  }
  next();
});
MealSchema.methods.isHost = function(userId) {
  return this.host.toString() === userId.toString();
};
MealSchema.methods.isParticipant = function(userId) {
  return this.participants.some(participant => participant.toString() === userId.toString());
};
MealSchema.virtual('virtualStatus').get(function() {
  return calculateMealStatus(this);
});
MealSchema.virtual('statusInfo').get(function() {
  const now = new Date();
  const status = calculateMealStatus(this, now);
  if (status === 'cancelled') return { status, message: 'Pasto cancellato', isActive: false, isUpcoming: false, isCompleted: false };
  const { startTime, endTime, duration } = getMealTiming(this);
  if (status === 'upcoming') {
    const minutes = Math.ceil((startTime - now) / 60000);
    return { status, message: `Inizia tra ${minutes} minuti`, isActive: false, isUpcoming: true, isCompleted: false, timeUntilStart: minutes, startTime, endTime };
  }
  if (status === 'ongoing') {
    const remaining = Math.ceil((endTime - now) / 60000);
    return { status, message: `In corso (${remaining} minuti rimanenti)`, isActive: true, isUpcoming: false, isCompleted: false, timeElapsed: Math.ceil((now - startTime) / 60000), timeRemaining: remaining, startTime, endTime, progress: Math.round(((now - startTime) / (duration * 60000)) * 100) };
  }
  const elapsed = Math.max(0, Math.ceil((now - endTime) / 60000));
  return { status, message: `Completato ${elapsed} minuti fa`, isActive: false, isUpcoming: false, isCompleted: true, timeSinceEnd: elapsed, startTime, endTime };
});
MealSchema.virtual('nextStatusUpdate').get(function() {
  if (isTerminal(this.status) || !this.date) return null;
  const status = calculateMealStatus(this);
  const { startTime, endTime } = getMealTiming(this);
  if (status === 'upcoming') return startTime;
  if (status === 'ongoing') return endTime;
  return null;
});
MealSchema.methods.addParticipant = function(userId) {
  if (this.isFull) throw new Error('Il pasto ha raggiunto il numero massimo di partecipanti');
  if (this.isParticipant(userId)) throw new Error('Sei già un partecipante di questo pasto');
  if (this.isPast) throw new Error('Non è possibile unirsi a un pasto già passato');
  if (!this.settings.allowLateJoin && this.isActive) throw new Error('Non è possibile unirsi a un pasto già iniziato');
  this.participants.push(userId);
  this.notifications.push({ type: 'join', message: 'Un nuovo partecipante si è unito al pasto', recipient: this.host });
  return this.save();
};
MealSchema.methods.removeParticipant = function(userId) {
  if (this.isHost(userId)) throw new Error('L\'host non può lasciare il pasto');
  if (!this.isParticipant(userId)) throw new Error('Non sei un partecipante di questo pasto');
  this.participants = this.participants.filter(p => p.toString() !== userId.toString());
  this.notifications.push({ type: 'leave', message: 'Un partecipante ha lasciato il pasto', recipient: this.host });
  return this.save();
};
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
MealSchema.methods.addNotification = function(type, message, recipient) {
  this.notifications.push({ type, message, recipient, read: false });
  return this.save();
};
MealSchema.methods.markNotificationsAsRead = function(userId) {
  this.notifications.forEach(notification => {
    if (notification.recipient.toString() === userId.toString()) notification.read = true;
  });
  return this.save();
};
MealSchema.methods.syncStatus = function() {
  const nextStatus = calculateMealStatus(this);
  if (nextStatus !== this.status) {
    this.status = nextStatus;
    if (isTerminal(nextStatus)) this.videoCallStatus = 'ended';
    this.participants.filter(Boolean).forEach(participant => {
      this.notifications.push({ type: 'update', message: `Il pasto è ora ${nextStatus}`, recipient: participant });
    });
  }
  return this;
};
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
