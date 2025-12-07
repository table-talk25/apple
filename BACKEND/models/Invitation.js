const mongoose = require('mongoose');

const InvitationSchema = new mongoose.Schema(
  {
fromUser: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true,
},
toUser: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true,
},
message: {
  type: String,
  trim: true,
  maxlength: [250, 'Il messaggio non può superare i 250 caratteri.'],
},
status: {
  type: String,
  enum: ['pending', 'accepted', 'declined'],
  default: 'pending',
},
},
{
// Aggiungiamo i timestamps, molto utili per ordinare gli inviti
timestamps: true,
}
);

// Indice per migliorare le performance delle ricerche
InvitationSchema.index({ toUser: 1, status: 1 });

module.exports = mongoose.model('Invitation', InvitationSchema); 