// File: BACKEND/controllers/tribeController.js
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const TribeInvite = require('../models/TribeInvite');
const User = require('../models/User');
const Meal = require('../models/Meal');
const ErrorResponse = require('../utils/errorResponse');

const USER_FIELDS = 'nickname profileImage';

const idOf = (v) => (v && v._id ? v._id.toString() : v ? v.toString() : '');

/** Notifica in tempo reale (Socket.IO) + push FCM best-effort */
const notifyUser = async (userId, payload, push) => {
  try {
    const { getIO } = require('../socket');
    const io = getIO();
    if (io) io.to(`user:${userId}`).emit('new_notification', payload);
  } catch (err) {
    console.error('[Tribe] Errore emissione socket:', err.message);
  }
  if (push) {
    try {
      const { sendPushNotification } = require('./notificationsController');
      await sendPushNotification(userId, push.title, push.body, push.data || {});
    } catch (err) {
      console.error('[Tribe] Errore push:', err.message);
    }
  }
};

/**
 * @desc    Panoramica tribù: membri, inviti ricevuti e inviti inviati in attesa
 * @route   GET /api/tribe
 */
exports.getMyTribe = asyncHandler(async (req, res) => {
  const me = req.user.id;

  const [accepted, received, sent] = await Promise.all([
    TribeInvite.find({ status: 'accepted', $or: [{ fromUser: me }, { toUser: me }] })
      .populate('fromUser', USER_FIELDS)
      .populate('toUser', USER_FIELDS)
      .sort({ respondedAt: -1, updatedAt: -1 })
      .lean(),
    TribeInvite.find({ toUser: me, status: 'pending' })
      .populate('fromUser', USER_FIELDS)
      .populate('meal', 'title')
      .sort({ createdAt: -1 })
      .lean(),
    TribeInvite.find({ fromUser: me, status: 'pending' })
      .populate('toUser', USER_FIELDS)
      .populate('meal', 'title')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const members = accepted
    .map((inv) => {
      const other = idOf(inv.fromUser) === me ? inv.toUser : inv.fromUser;
      if (!other) return null;
      return { ...other, linkId: inv._id, since: inv.respondedAt || inv.updatedAt };
    })
    .filter(Boolean);

  res.status(200).json({ success: true, data: { members, received, sent } });
});

/**
 * @desc    Invita un utente nella propria tribù (solo tra partecipanti dello stesso t2t)
 * @route   POST /api/tribe/invites
 * @body    { toUserId, mealId }
 */
exports.sendInvite = asyncHandler(async (req, res, next) => {
  const me = req.user.id;
  const { toUserId, mealId } = req.body || {};

  if (!toUserId || !mongoose.Types.ObjectId.isValid(toUserId)) {
    return next(new ErrorResponse('Utente non valido', 400));
  }
  if (String(toUserId) === String(me)) {
    return next(new ErrorResponse('Non puoi invitare te stesso', 400));
  }
  if (!mealId || !mongoose.Types.ObjectId.isValid(mealId)) {
    return next(new ErrorResponse('Puoi invitare solo persone conosciute in un t2t', 400));
  }

  const [target, meal] = await Promise.all([
    User.findById(toUserId).select(USER_FIELDS).lean(),
    Meal.findById(mealId).select('title host participants').lean(),
  ]);
  if (!target) return next(new ErrorResponse('Utente non trovato', 404));
  if (!meal) return next(new ErrorResponse('t2t non trovato', 404));

  const inMeal = (uid) =>
    idOf(meal.host) === String(uid) ||
    (Array.isArray(meal.participants) && meal.participants.some((p) => idOf(p) === String(uid)));
  if (!inMeal(me) || !inMeal(toUserId)) {
    return next(new ErrorResponse('Potete entrare in tribù solo se partecipate allo stesso t2t', 403));
  }

  const existing = await TribeInvite.find({
    $or: [
      { fromUser: me, toUser: toUserId },
      { fromUser: toUserId, toUser: me },
    ],
  });
  if (existing.some((e) => e.status === 'accepted')) {
    return next(new ErrorResponse('Fa già parte della tua tribù', 409));
  }
  if (existing.some((e) => e.status === 'pending')) {
    return next(new ErrorResponse('C\'è già un invito in attesa', 409));
  }
  // Inviti rifiutati in passato: si ripulisce e si permette un nuovo invito
  if (existing.length > 0) {
    await TribeInvite.deleteMany({ _id: { $in: existing.map((e) => e._id) } });
  }

  const invite = await TribeInvite.create({ fromUser: me, toUser: toUserId, meal: mealId });

  const sender = await User.findById(me).select(USER_FIELDS).lean();
  const senderName = (sender && sender.nickname) || 'Qualcuno';
  const message = `👥 ${senderName} ti ha invitato nella sua tribù`;
  await notifyUser(
    String(toUserId),
    {
      message,
      type: 'tribe_invite',
      data: { inviteId: invite._id.toString(), status: 'pending', senderName },
    },
    { title: 'Invito nella tribù', body: message, data: { type: 'tribe_invite', inviteId: invite._id.toString() } }
  );

  res.status(201).json({ success: true, data: invite });
});

const loadInviteForRecipient = async (req, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    next(new ErrorResponse('Invito non valido', 400));
    return null;
  }
  const invite = await TribeInvite.findById(id);
  if (!invite) {
    next(new ErrorResponse('Invito non trovato', 404));
    return null;
  }
  if (idOf(invite.toUser) !== req.user.id) {
    next(new ErrorResponse('Non autorizzato', 403));
    return null;
  }
  if (invite.status !== 'pending') {
    next(new ErrorResponse('Hai già risposto a questo invito', 409));
    return null;
  }
  return invite;
};

/**
 * @desc    Accetta un invito nella tribù
 * @route   POST /api/tribe/invites/:id/accept
 */
exports.acceptInvite = asyncHandler(async (req, res, next) => {
  const invite = await loadInviteForRecipient(req, next);
  if (!invite) return undefined;

  invite.status = 'accepted';
  invite.respondedAt = new Date();
  invite.readByRecipient = true;
  invite.readBySender = false;
  await invite.save();

  const me = await User.findById(req.user.id).select(USER_FIELDS).lean();
  const name = (me && me.nickname) || 'Qualcuno';
  const message = `✅ ${name} è entrato nella tua tribù`;
  await notifyUser(
    idOf(invite.fromUser),
    { message, type: 'tribe_accepted', data: { inviteId: invite._id.toString() } },
    { title: 'Tribù', body: message, data: { type: 'tribe_accepted' } }
  );

  return res.status(200).json({ success: true, data: invite });
});

/**
 * @desc    Rifiuta un invito nella tribù (il mittente non riceve notifiche)
 * @route   POST /api/tribe/invites/:id/decline
 */
exports.declineInvite = asyncHandler(async (req, res, next) => {
  const invite = await loadInviteForRecipient(req, next);
  if (!invite) return undefined;

  invite.status = 'declined';
  invite.respondedAt = new Date();
  invite.readByRecipient = true;
  await invite.save();

  return res.status(200).json({ success: true, data: invite });
});

/**
 * @desc    Annulla un invito inviato ancora in attesa
 * @route   DELETE /api/tribe/invites/:id
 */
exports.cancelInvite = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return next(new ErrorResponse('Invito non valido', 400));
  const invite = await TribeInvite.findById(id);
  if (!invite) return next(new ErrorResponse('Invito non trovato', 404));
  if (idOf(invite.fromUser) !== req.user.id) return next(new ErrorResponse('Non autorizzato', 403));
  if (invite.status !== 'pending') return next(new ErrorResponse('Invito non più in attesa', 409));
  await invite.deleteOne();
  return res.status(200).json({ success: true });
});

/**
 * @desc    Rimuove un membro dalla propria tribù
 * @route   DELETE /api/tribe/members/:userId
 */
exports.removeMember = asyncHandler(async (req, res, next) => {
  const me = req.user.id;
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) return next(new ErrorResponse('Utente non valido', 400));
  const result = await TribeInvite.deleteMany({
    status: 'accepted',
    $or: [
      { fromUser: me, toUser: userId },
      { fromUser: userId, toUser: me },
    ],
  });
  if (!result.deletedCount) return next(new ErrorResponse('Non fa parte della tua tribù', 404));
  return res.status(200).json({ success: true });
});

/**
 * Notifiche tribù per GET /api/notifications
 * - inviti ricevuti in attesa (con pulsanti Accetta/Rifiuta)
 * - inviti inviati e accettati
 */
exports.getTribeNotifications = async (userId) => {
  const [received, acceptedSent] = await Promise.all([
    TribeInvite.find({ toUser: userId, status: 'pending' })
      .populate('fromUser', USER_FIELDS)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    TribeInvite.find({ fromUser: userId, status: 'accepted' })
      .populate('toUser', USER_FIELDS)
      .sort({ respondedAt: -1 })
      .limit(50)
      .lean(),
  ]);

  const items = received.map((inv) => {
    const senderName = (inv.fromUser && inv.fromUser.nickname) || 'Qualcuno';
    return {
      _id: `tribe_inv_${inv._id}`,
      type: 'tribe_invite',
      inviteId: inv._id.toString(),
      status: 'pending',
      senderName,
      message: `👥 ${senderName} ti ha invitato nella sua tribù`,
      read: Boolean(inv.readByRecipient),
      isRead: Boolean(inv.readByRecipient),
      createdAt: inv.createdAt,
    };
  });

  acceptedSent.forEach((inv) => {
    const name = (inv.toUser && inv.toUser.nickname) || 'Qualcuno';
    items.push({
      _id: `tribe_acc_${inv._id}`,
      type: 'tribe_accepted',
      inviteId: inv._id.toString(),
      message: `✅ ${name} è entrato nella tua tribù`,
      read: Boolean(inv.readBySender),
      isRead: Boolean(inv.readBySender),
      createdAt: inv.respondedAt || inv.updatedAt,
    });
  });

  return items;
};

exports.markTribeNotificationsRead = async (userId) => {
  await Promise.all([
    TribeInvite.updateMany({ toUser: userId, readByRecipient: false }, { $set: { readByRecipient: true } }),
    TribeInvite.updateMany(
      { fromUser: userId, status: 'accepted', readBySender: false },
      { $set: { readBySender: true } }
    ),
  ]);
};
