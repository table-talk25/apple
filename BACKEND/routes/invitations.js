const express = require('express');
const router = express.Router();
const Invitation = require('../models/Invitation');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');

// Crea un invito
router.post('/', protect, async (req, res) => {
  const { recipient, message } = req.body;
  const invitation = await Invitation.create({
    sender: req.user.id,
    recipient,
    message
  });
  // Notifica al destinatario
  notificationService.sendNotification(
    recipient,
    'new_invitation',
    `${req.user.nickname} ti ha invitato: "${message}"`,
    { invitationId: invitation._id }
  );
  // Invia email se il destinatario ha attivato le notifiche email
  const recipientUser = await User.findById(recipient);
  if (recipientUser && recipientUser.settings?.notifications?.email) {
    try {
      await sendEmail.sendInvitationEmail(
        recipientUser.email,
        recipientUser.nickname || recipientUser.name,
        req.user.nickname || req.user.name,
        message
      );
    } catch (err) {
      console.error('Errore invio email invito:', err.message);
    }
  }
  res.status(201).json({ success: true, data: invitation });
});

// Lista inviti ricevuti
router.get('/received', protect, async (req, res) => {
  const invitations = await Invitation.find({ recipient: req.user.id }).populate('sender', 'nickname profileImage');
  res.json({ success: true, data: invitations });
});

// Accetta invito
router.put('/:id/accept', protect, async (req, res) => {
  const invitation = await Invitation.findById(req.params.id);
  if (!invitation || invitation.recipient.toString() !== req.user.id) {
    return res.status(404).json({ success: false, message: 'Invito non trovato' });
  }
  invitation.status = 'accepted';
  await invitation.save();

  // Crea chat tra i due utenti
  const chat = await Chat.create({
    name: `Chat tra ${invitation.sender} e ${invitation.recipient}`,
    participants: [invitation.sender, invitation.recipient]
  });

  // Notifica al mittente
  notificationService.sendNotification(
    invitation.sender,
    'invitation_accepted',
    `${req.user.nickname} ha accettato il tuo invito!`,
    { chatId: chat._id }
  );

  res.json({ success: true, data: { invitation, chat } });
});

module.exports = router; 