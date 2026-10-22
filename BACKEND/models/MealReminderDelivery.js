const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  meal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date, required: true },
  windowMinutes: { type: Number, enum: [10, 60], required: true },
  role: { type: String, enum: ['host', 'participant'], required: true },
  state: { type: String, enum: ['processing', 'accepted', 'failed', 'uncertain'], default: 'processing', required: true },
  completedAt: Date,
}, { timestamps: true });

// The built-in unique _id index is the atomic claim; no TTL can silently reopen an old claim.
module.exports = mongoose.model('MealReminderDelivery', schema);
