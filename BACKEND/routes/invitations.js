const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Invitation = require('../models/Invitation');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const MESSAGE_MAX_LENGTH = 250; // allineato a models/Invitation.js

// Crea un invito
// Body: { toUser, message }  (per retrocompatibilità è accettato anche `recipient`)
router.post('/', protect, asyncHandler(async (req, res, next) => {
  const body = req.body || {};
  const toUser = body.toUser !== undefined ? body.toUser : body.recipient;
  const rawMessage = body.message;

  if (typeof toUser !== 'string' || !OBJECT_ID_RE.test(toUser)) {
    return next(new ErrorResponse('Destinatario non valido', 400));
  }
  if (rawMessage !== undefined && rawMessage !== null && typeof rawMessage !== 'string') {
    return next(new ErrorResponse('Messaggio non valido', 400));
  }
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : '';
  if (message.length > MESSAGE_MAX_LENGTH) {
    return next(new ErrorResponse(`Il messaggio non può superare i ${MESSAGE_MAX_LENGTH} caratteri`, 400));
  }

  const senderId = req.user.id;
  if (toUser === senderId) {
    return next(new ErrorResponse('Non puoi invitare te stesso', 400));
  }

  const recipientUser = await User.findById(toUser);
  if (!recipientUser || recipientUser.isActive === false) {
    return next(new ErrorResponse('Utente destinatario non trovato', 404));
  }

  // Blocchi in entrambe le direzioni: stessa risposta di "non trovato" per non rivelare il blocco
  const senderBlockedRecipient = (req.user.blockedUsers || []).some((id) => id.toString() === toUser);
  const recipientBlockedSender = (recipientUser.blockedUsers || []).some((id) => id.toString() === senderId);
  if (senderBlockedRecipient || recipientBlockedSender) {
    return next(new ErrorResponse('Utente destinatario non trovato', 404));
  }

  const invitation = await Invitation.create({
    fromUser: senderId,
    toUser,
    message: message || undefined,
  });

  // Notifica in tempo reale al destinatario
  notificationService.sendNotification(
    toUser,
    'new_invitation',
    `${req.user.nickname || req.user.name} ti ha invitato${message ? `: "${message}"` : ''}`,
    { invitationId: invitation._id }
  );

  // Invia email se il destinatario ha attivato le notifiche email
  if (recipientUser.settings?.notifications?.email) {
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
}));

// Lista inviti ricevuti
// Il frontend legge `inv.sender.nickname`: esponiamo `sender` come alias di `fromUser`.
router.get('/received', protect, asyncHandler(async (req, res) => {
  const invitations = await Invitation.find({ toUser: req.user.id })
    .populate('fromUser', 'nickname profileImage')
    .sort({ createdAt: -1 });
  const data = invitations.map((inv) => {
    const plain = inv.toJSON();
    return { ...plain, sender: plain.fromUser };
  });
  res.json({ success: true, data });
}));

// Accetta invito
router.put('/:id/accept', protect, asyncHandler(async (req, res, next) => {
  if (!OBJECT_ID_RE.test(req.params.id)) {
    return next(new ErrorResponse('Invito non trovato', 404));
  }
  const invitation = await Invitation.findById(req.params.id);
  if (!invitation || invitation.toUser.toString() !== req.user.id) {
    return next(new ErrorResponse('Invito non trovato', 404));
  }
  if (invitation.status !== 'pending') {
    return next(new ErrorResponse(`Questo invito è già stato ${invitation.status}`, 400));
  }
  invitation.status = 'accepted';
  await invitation.save();

  // Crea chat tra i due utenti (nome senza identificativi interni)
  const chat = await Chat.create({
    name: 'Chat diretta',
    participants: [invitation.fromUser, invitation.toUser],
  });

  // Notifica al mittente
  notificationService.sendNotification(
    invitation.fromUser,
    'invitation_accepted',
    `${req.user.nickname || req.user.name} ha accettato il tuo invito!`,
    { chatId: chat._id }
  );

  res.json({ success: true, data: { invitation, chat } });
}));

module.exports = router;
