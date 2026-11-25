const mongoose = require('mongoose');

const TribeListSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

TribeListSchema.index({ owner: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('TribeList', TribeListSchema);
