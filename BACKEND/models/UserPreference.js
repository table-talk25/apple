const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // 🍽️ PREFERENZE CULINARIE
  cuisinePreferences: {
    italian: { type: Number, default: 0.6, min: -1, max: 1 },
    japanese: { type: Number, default: 0.1, min: -1, max: 1 },
    mexican: { type: Number, default: 0, min: -1, max: 1 },
    indian: { type: Number, default: 0.1, min: -1, max: 1 },
    chinese: { type: Number, default: 0.1, min: -1, max: 1 },
    mediterranean: { type: Number, default: 0.4, min: -1, max: 1 },
    american: { type: Number, default: 0, min: -1, max: 1 },
    vegetarian: { type: Number, default: 0.2, min: -1, max: 1 },
    vegan: { type: Number, default: 0.1, min: -1, max: 1 },
    thai: { type: Number, default: 0, min: -1, max: 1 },
    french: { type: Number, default: 0.2, min: -1, max: 1 },
    spanish: { type: Number, default: 0.3, min: -1, max: 1 }
  },
  
  // ⏰ PREFERENZE ORARIO
  timePreferences: {
    breakfast: { type: Number, default: 0.1, min: -1, max: 1 },
    brunch: { type: Number, default: 0.1, min: -1, max: 1 },
    lunch: { type: Number, default: 0.4, min: -1, max: 1 },
    aperitivo: { type: Number, default: 0.3, min: -1, max: 1 },
    dinner: { type: Number, default: 0.6, min: -1, max: 1 }
  },
  
  // 💰 PREFERENZE PREZZO
  priceRange: {
    budget: { type: Number, default: 0.4, min: -1, max: 1 },      // < 20€
    moderate: { type: Number, default: 0.6, min: -1, max: 1 },    // 20-40€
    upscale: { type: Number, default: 0.2, min: -1, max: 1 }      // > 40€
  },
  
  // 👥 PREFERENZE SOCIALI
  socialPreferences: {
    groupSize: {
      intimate: { type: Number, default: 0.6, min: -1, max: 1 },  // 2-4 persone
      medium: { type: Number, default: 0.4, min: -1, max: 1 },    // 5-8 persone
      large: { type: Number, default: 0.1, min: -1, max: 1 }      // 9+ persone
    },
    ageGroup: {
      young: { type: Number, default: 0.3, min: -1, max: 1 },     // 18-25
      adult: { type: Number, default: 0.6, min: -1, max: 1 },     // 26-40
      mature: { type: Number, default: 0.4, min: -1, max: 1 }     // 40+
    }
  },
  
  // 📍 PREFERENZE LOCATION
  locationPreferences: {
    maxDistance: { type: Number, default: 15, min: 1, max: 100 }, // km
    preferredAreas: [String], // Array di nomi di zone preferite
    avoidAreas: [String]      // Array di zone da evitare
  },
  
  // 📊 STATISTICHE ATTIVITÀ
  activityScores: {
    totalMeals: { type: Number, default: 0 },
    totalHosts: { type: Number, default: 0 },
    totalJoins: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now }
  },
  
  // 🎯 PREFERENZE AVANZATE
  advancedPreferences: {
    dietaryRestrictions: [String], // ['vegetarian', 'vegan', 'gluten-free', etc.]
    allergies: [String],           // ['nuts', 'dairy', 'seafood', etc.]
    languagePreferences: [String], // ['italian', 'english', 'spanish', etc.]
    accessibility: {
      wheelchair: { type: Boolean, default: false },
      hearing: { type: Boolean, default: false },
      visual: { type: Boolean, default: false }
    }
  },
  
  // 🔄 METADATI
  lastUpdated: { type: Date, default: Date.now },
  learningEnabled: { type: Boolean, default: true },
  version: { type: String, default: '1.0' }
}, {
  timestamps: true
});

// Indici per performance
userPreferenceSchema.index({ userId: 1 });
userPreferenceSchema.index({ lastUpdated: -1 });
userPreferenceSchema.index({ 'activityScores.totalMeals': -1 });

// Middleware per aggiornare lastUpdated
userPreferenceSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Metodo per aggiornare le preferenze basate sull'attività
userPreferenceSchema.methods.updateFromActivity = function(activityType, mealData) {
  if (!this.learningEnabled) return Promise.resolve(this);

  if (activityType === 'created') {
    this.activityScores.totalHosts += 1;
  } else if (activityType === 'joined') {
    this.activityScores.totalJoins += 1;
  }

  this.activityScores.totalMeals += 1;
  this.activityScores.lastActivity = new Date();

  // Learning algorithm: aggiorna preferenze basate su scelte
  if (mealData) {
    this.learnFromMeal(mealData);
  }

  return this.save();
};

// Algoritmo di apprendimento semplice
userPreferenceSchema.methods.learnFromMeal = function(mealData) {
  if (!this.learningEnabled || !mealData) return;
  const learningRate = 0.1;

  // Time slot da meal.date
  const dateValue = mealData.date || mealData.scheduledAt; // back-compat
  if (dateValue) {
    const mealHour = new Date(dateValue).getHours();
    let timeSlot;
    if (mealHour >= 7 && mealHour < 10) timeSlot = 'breakfast';
    else if (mealHour >= 10 && mealHour < 12) timeSlot = 'brunch';
    else if (mealHour >= 12 && mealHour < 15) timeSlot = 'lunch';
    else if (mealHour >= 17 && mealHour < 19) timeSlot = 'aperitivo';
    else if (mealHour >= 19 && mealHour <= 23) timeSlot = 'dinner';
    if (timeSlot && this.timePreferences[timeSlot] !== undefined) {
      const current = this.timePreferences[timeSlot];
      this.timePreferences[timeSlot] = Math.min(1, current + learningRate);
      this.markModified('timePreferences');
    }
  }

  // Price range da meal.estimatedCost
  const price = (mealData.estimatedCost == null) ? null : Number(mealData.estimatedCost);
  if (price != null) {
    let priceRange;
    if (price <= 20) priceRange = 'budget';
    else if (price <= 40) priceRange = 'moderate';
    else priceRange = 'upscale';
    if (priceRange && this.priceRange[priceRange] !== undefined) {
      const current = this.priceRange[priceRange];
      this.priceRange[priceRange] = Math.min(1, current + learningRate);
      this.markModified('priceRange');
    }
  }
};

module.exports = mongoose.model('UserPreference', userPreferenceSchema);
