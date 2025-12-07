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
      values: ['breakfast', 'lunch', 'dinner', 'aperitif'],
      message: 'Il tipo di pasto deve essere uno tra: colazione, pranzo, cena, aperitivo' 
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
          // Esegui questo controllo solo se il documento è NUOVO.
          // Se stiamo solo modificando, permettiamo di salvare anche date passate.
          if (this.isNew) {
            return date > new Date();
          }
          return true; // Per le modifiche, la validazione è sempre superata.
        },
        message: 'La data di un nuovo pasto deve essere futura'
      }
    ]
  },
  duration: {
    type: Number,
    // La durata è in minuti. Il frontend la userà per calcolare l'ora di fine.
    required: [true, 'Per favore specifica la durata del pasto'],
    default: 60, // Impostiamo un default di 60 minuti (1 ora)
    min: [30, 'La durata minima è di 30 minuti'], // Aggiornato a 30
    max: [180, 'La durata massima è di 3 ore (180 minuti)'],
    validate: {
      validator: function(value) {
        // Validiamo che sia un numero intero tra 30 e 180
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
    // Usiamo un unico oggetto di validazione per evitare messaggi confusi
    validate: {
      validator: function(topics) {
        // Regola 1: Non più di 5 argomenti
        if (topics.length > 5) {
          this.invalidate('topics', 'Puoi inserire un massimo di 5 argomenti.');
          return false;
        }
        // Regola 2: Ogni argomento deve essere tra 2 e 50 caratteri
        if (!topics.every(topic => topic.trim().length >= 2 && topic.trim().length <= 50)) {
          this.invalidate('topics', 'Ogni argomento deve essere lungo tra 2 e 50 caratteri.');
          return false;
        }
        return true;
      }
    }
  },
  // Campo per la posizione - obbligatorio solo per pasti fisici
  location: {
    type: mongoose.Schema.Types.Mixed, // Supporta sia stringa che oggetto
    validate: {
      validator: function(value) {
        // Se è un pasto fisico, la location è obbligatoria
        if (this.mealType === 'physical' && (!value || (typeof value === 'string' && value.trim().length === 0) || (typeof value === 'object' && !value.address))) {
          this.invalidate('location', 'La posizione è obbligatoria per un pasto fisico');
          return false;
        }
        // Se è un pasto virtuale, la location non è necessaria
        if (this.mealType === 'virtual') {
          return true;
        }
        
        // Validazione per stringhe (compatibilità con dati esistenti)
        if (typeof value === 'string') {
          return value.trim().length >= 5 && value.trim().length <= 200;
        }
        
        // Validazione per oggetti (nuovo formato)
        if (typeof value === 'object' && value !== null) {
          // Deve avere almeno un indirizzo
          if (!value.address || typeof value.address !== 'string' || value.address.trim().length === 0) {
            return false;
          }
          
          // L'indirizzo deve essere tra 5 e 200 caratteri
          if (value.address.trim().length < 5 || value.address.trim().length > 200) {
            return false;
          }
          
          // Se ci sono coordinate, devono essere valide
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
  // Campo per distinguere pasti pubblici e privati
  isPublic: {
    type: Boolean,
    default: true, // Di default i pasti sono pubblici
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
    // Lo nascondiamo di default dalle risposte JSON per non esporre dati interni non necessari
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
  // Nuovo campo per le notifiche
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
  // Nuovo campo per i rating
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
MealSchema.index({ mealType: 1 }); // Nuovo indice per mealType
MealSchema.index({ 'notifications.recipient': 1, 'notifications.read': 1 });
MealSchema.index({ 'ratings.user': 1 });

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
  if (!this.date || this.isPast) return 0;
  return Math.max(0, this.date.getTime() - new Date().getTime());
});

// Virtual per la media dei rating
MealSchema.virtual('averageRating').get(function() {
  if (!this.ratings || this.ratings.length === 0) 
    return 0;
  const sum = this.ratings.reduce((acc, curr) => acc + curr.score, 0);
  return sum / this.ratings.length;
});

// Metodo per ottenere i pasti futuri
MealSchema.statics.findUpcoming = function() {
  return this.find({
    date: { $gt: new Date() },
    status: 'upcoming'
  }).sort({ date: 1 });
};

// Metodo per ottenere i pasti attivi
MealSchema.statics.findActive = function() {
  const now = new Date();
  return this.find({
    date: { $lte: now },
    status: 'ongoing'
  });
};

// Metodo per ottenere i pasti di un utente
MealSchema.statics.findUserMeals = function(userId) {
  return this.find({
    $or: [
      { host: userId },
      { participants: userId }
    ]
  });
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
  // Aggiorna il conteggio dei partecipanti se l'array è stato modificato
  if (this.isModified('participants')) {
    this.participantsCount = this.participants.length;
  }

  // Aggiunge automaticamente l'organizzatore (host) ai partecipanti alla creazione del pasto
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
  
  // Se il pasto è stato cancellato, mantieni lo stato
  if (this.status === 'cancelled') {
    return 'cancelled';
  }
  
  // Calcola lo stato basato su data/ora attuale
  if (now < startTime) {
    return 'upcoming';
  } else if (now >= startTime && now < endTime) {
    return 'ongoing';
  } else {
    return 'completed';
  }
});

// 🕐 STATUS DETTAGLIATO: Informazioni aggiuntive sullo stato
MealSchema.virtual('statusInfo').get(function() {
  const now = new Date();
  const startTime = this.date;
  const endTime = new Date(startTime.getTime() + (this.duration || 60) * 60 * 1000);
  
  if (this.status === 'cancelled') {
    return {
      status: 'cancelled',
      message: 'Pasto cancellato',
      isActive: false,
      isUpcoming: false,
      isCompleted: false
    };
  }
  
  if (now < startTime) {
    const timeUntilStart = startTime.getTime() - now.getTime();
    const minutesUntilStart = Math.ceil(timeUntilStart / (1000 * 60));
    
    return {
      status: 'upcoming',
      message: `Inizia tra ${minutesUntilStart} minuti`,
      isActive: false,
      isUpcoming: true,
      isCompleted: false,
      timeUntilStart: minutesUntilStart,
      startTime: startTime,
      endTime: endTime
    };
  } else if (now >= startTime && now < endTime) {
    const timeElapsed = now.getTime() - startTime.getTime();
    const timeRemaining = endTime.getTime() - now.getTime();
    const minutesElapsed = Math.ceil(timeElapsed / (1000 * 60));
    const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60));
    
    return {
      status: 'ongoing',
      message: `In corso (${minutesRemaining} minuti rimanenti)`,
      isActive: true,
      isUpcoming: false,
      isCompleted: false,
      timeElapsed: minutesElapsed,
      timeRemaining: minutesRemaining,
      startTime: startTime,
      endTime: endTime,
      progress: Math.round((timeElapsed / (this.duration * 60 * 1000)) * 100)
    };
  } else {
    const timeSinceEnd = now.getTime() - endTime.getTime();
    const minutesSinceEnd = Math.ceil(timeSinceEnd / (1000 * 60));
    
    return {
      status: 'completed',
      message: `Completato ${minutesSinceEnd} minuti fa`,
      isActive: false,
      isUpcoming: false,
      isCompleted: true,
      timeSinceEnd: minutesSinceEnd,
      startTime: startTime,
      endTime: endTime
    };
  }
});

// 🕐 TEMPO RIMANENTE: Calcola minuti rimanenti per pasti attivi
MealSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const startTime = this.date;
  const endTime = new Date(startTime.getTime() + (this.duration || 60) * 60 * 1000);
  
  if (this.status === 'cancelled') {
    return 0;
  }
  
  if (now < startTime) {
    return Math.ceil((startTime.getTime() - now.getTime()) / (1000 * 60));
  } else if (now >= startTime && now < endTime) {
    return Math.ceil((endTime.getTime() - now.getTime()) / (1000 * 60));
  } else {
    return 0;
  }
});

// 🕐 PROSSIMO AGGIORNAMENTO: Calcola quando aggiornare lo status
MealSchema.virtual('nextStatusUpdate').get(function() {
  const now = new Date();
  const startTime = this.date;
  const endTime = new Date(startTime.getTime() + (this.duration || 60) * 60 * 1000);
  
  if (this.status === 'cancelled') {
    return null;
  }
  
  if (now < startTime) {
    return startTime; // Aggiorna quando inizia
  } else if (now >= startTime && now < endTime) {
    return endTime; // Aggiorna quando finisce
  } else {
    return null; // Non serve aggiornare
  }
});

// Metodo per aggiungere un partecipante
MealSchema.methods.addParticipant = function(userId) {
  if (this.isFull) {
    throw new Error('Il pasto ha raggiunto il numero massimo di partecipanti');
  }
  if (this.isParticipant(userId)) {
    throw new Error('Sei già un partecipante di questo pasto');
  }
  if (this.isPast) {
    throw new Error('Non è possibile unirsi a un pasto già passato');
  }
  if (!this.settings.allowLateJoin && this.isActive) {
    throw new Error('Non è possibile unirsi a un pasto già iniziato');
  }
  
  this.participants.push(userId);
  
  // Aggiungi notifica all'array, ma non salvare ancora
  this.notifications.push({
    type: 'join',
    message: 'Un nuovo partecipante si è unito al pasto',
    recipient: this.host
  });
  
  // Un solo salvataggio alla fine
  return this.save();
};

// Metodo per rimuovere un partecipante
MealSchema.methods.removeParticipant = function(userId) {
  if (this.isHost(userId)) {
    throw new Error('L\'host non può lasciare il pasto');
  }
  if (!this.isParticipant(userId)) {
    throw new Error('Non sei un partecipante di questo pasto');
  }
  
  this.participants = this.participants.filter(
    p => p.toString() !== userId.toString()
  );
  
  // Aggiungi notifica all'array, ma non salvare ancora
  this.notifications.push({
    type: 'leave',
    message: 'Un partecipante ha lasciato il pasto',
    recipient: this.host
  });
  
  // Un solo salvataggio alla fine
  return this.save();
};

// Metodo per aggiungere un rating
MealSchema.methods.addRating = function(userId, score, comment) {
  if (!this.isParticipant(userId)) {
    throw new Error('Solo i partecipanti possono lasciare un rating');
  }
  
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
  this.notifications.push({
    type,
    message,
    recipient,
    read: false
  });
  return this.save();
};

// Metodo per marcare le notifiche come lette
MealSchema.methods.markNotificationsAsRead = function(userId) {
  this.notifications.forEach(notification => {
    if (notification.recipient.toString() === userId.toString()) {
      notification.read = true;
    }
  });
  return this.save();
};

// 🕐 SINCRONIZZAZIONE STATUS: Sincronizza status virtuale con fisico
MealSchema.methods.syncStatus = function() {
  const virtualStatus = this.virtualStatus;
  
  // Se lo status virtuale è diverso da quello fisico, aggiornalo
  if (virtualStatus !== this.status && virtualStatus !== 'cancelled') {
    this.status = virtualStatus;
    
    // Log per debugging
    console.log(`🔄 [Meal] Status sincronizzato: ${this.status} -> ${virtualStatus} (Meal ID: ${this._id})`);
    
    // Aggiungi notifica per tutti i partecipanti
    const notificationMessage = `Il pasto è ora ${virtualStatus}`;
    this.participants.forEach(participant => {
      this.notifications.push({
        type: 'status_update',
        message: notificationMessage,
        recipient: participant
      });
    });
  }
  
  return this;
};

// Metodo per aggiornare lo stato del pasto
MealSchema.methods.updateStatus = function(newStatus) {
  if (!['upcoming', 'ongoing', 'completed', 'cancelled'].includes(newStatus)) {
    throw new Error('Stato non valido');
  }
  
  this.status = newStatus;
  
  // Aggiungi notifica per tutti i partecipanti
  const notificationMessage = `Il pasto è stato ${newStatus}`;
  this.participants.forEach(participant => {
    this.notifications.push({
      type: 'update',
      message: notificationMessage,
      recipient: participant
    });
  });
  
  return this.save();
};

// Configurazione per includere virtuals nelle risposte JSON
MealSchema.set('toJSON', { virtuals: true });
MealSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Meal', MealSchema);