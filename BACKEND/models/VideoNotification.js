const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  meal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal', required: true },
  scheduledAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
eventSchema.index({ expiresAt: 1 });

const deliverySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  event: { type: String, required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  state: { type: String, enum: ['pending', 'processing', 'retry', 'accepted', 'permanent', 'skipped', 'expired', 'exhausted'], required: true, default: 'pending' },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now },
  leaseId: String,
  leaseUntil: Date,
  errorCode: String,
}, { timestamps: true });
deliverySchema.index({ state: 1, expiresAt: 1 });

module.exports = {
  Event: mongoose.model('VideoNotificationEvent', eventSchema),
  Delivery: mongoose.model('VideoNotificationDelivery', deliverySchema),
};
