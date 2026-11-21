const mongoose = require('mongoose');

/**
 * Invito/legame "Tribù" tra due utenti.
 * - pending  → invito inviato, in attesa di risposta del destinatario
 * - accepted → i due utenti fanno parte della stessa tribù (legame simmetrico)
 * - declined → invito rifiutato dal destinatario
 */
const TribeInviteSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // t2t in cui i due utenti si sono conosciuti (contesto dell'invito)
    meal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    respondedAt: { type: Date },
    // Stato di lettura delle notifiche lato destinatario (invito) e mittente (accettazione)
    readByRecipient: { type: Boolean, default: false },
    readBySender: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TribeInviteSchema.index({ toUser: 1, status: 1 });
TribeInviteSchema.index({ fromUser: 1, status: 1 });
TribeInviteSchema.index({ fromUser: 1, toUser: 1 });

module.exports = mongoose.model('TribeInvite', TribeInviteSchema);
