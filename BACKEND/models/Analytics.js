const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user_action', 'meal_event', 'app_usage'],
    required: true
  },
  event: {
    type: String,
    required: true // 'meal_created', 'user_joined', 'meal_completed', etc.
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  mealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meal'
  },
  data: {
    type: mongoose.Schema.Types.Mixed // Dati specifici evento
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number] // [longitude, latitude]
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

analyticsSchema.index({ timestamp: 1 });
analyticsSchema.index({ type: 1, event: 1 });
analyticsSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Analytics', analyticsSchema);
