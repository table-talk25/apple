const mongoose = require('mongoose');

const JoinRequestSchema = new mongoose.Schema({
  meal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meal',
    required: true
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  message: {
    type: String,
    maxlength: 500
  }
}, { timestamps: true });

// Indici per performance
JoinRequestSchema.index({ meal: 1, requester: 1 }, { unique: true });
JoinRequestSchema.index({ meal: 1, status: 1 });

module.exports = mongoose.model('JoinRequest', JoinRequestSchema); 