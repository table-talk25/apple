const JoinRequest = require('../models/JoinRequest');
const Meal = require('../models/Meal');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');
const pushNotificationService = require('../services/pushNotificationService');
const sendEmail = require('../utils/sendEmail');

// Richiedi di unirsi a un pasto pubblico
exports.requestToJoin = asyncHandler(async (req, res, next) => {
  const { mealId, message } = req.body;
  const requesterId = req.user.id;

  const meal = await Meal.findById(mealId).populate('host', 'nickname settings');
  if (!meal) {
    return next(new ErrorResponse('Pasto non trovato', 404));
  }

  if (meal.mealType !== 'physical') {
    return next(new ErrorResponse('Solo i pasti fisici accettano richieste di partecipazione', 400));
  }

  if (!meal.isPublic) {
    return next(new ErrorResponse('Questo pasto è privato. Devi essere invitato per partecipare', 403));
  }

  if (meal.host._id.toString() === requesterId) {
    return next(new ErrorResponse('Non puoi richiedere di unirti al tuo stesso pasto', 400));
  }

  if (meal.participants.includes(requesterId)) {
    return next(new ErrorResponse('Sei già partecipante di questo pasto', 400));
  }

  if (meal.participants.length >= meal.maxParticipants) {
    return next(new ErrorResponse('Il pasto ha raggiunto il numero massimo di partecipanti', 400));
  }

  // Controlla se esiste già una richiesta
  const existingRequest = await JoinRequest.findOne({
    meal: mealId,
    requester: requesterId
  });

  if (existingRequest) {
    return next(new ErrorResponse('Hai già inviato una richiesta per questo pasto', 400));
  }

  const joinRequest = await JoinRequest.create({
    meal: mealId,
    requester: requesterId,
    message
  });

  // Invia notifica push all'host se abilitata
  if (meal.host.settings?.notifications?.push && meal.host.fcmTokens && meal.host.fcmTokens.length > 0) {
    const pushMessage = message ? `"${message}"` : 'Vuole unirsi al tuo pasto!';
    pushNotificationService.sendPushNotification(
      meal.host.fcmTokens,
      `Nuova richiesta di partecipazione!`,
      `${req.user.nickname}: ${pushMessage}`,
      { type: 'joinRequest', mealId: mealId.toString(), requestId: joinRequest._id.toString() }
    );
  }

  // Invia email all'host se abilitata
  if (meal.host.settings?.notifications?.email) {
    const emailSubject = `Nuova richiesta di partecipazione - ${meal.title}`;
    const emailMessage = `
      <h1>Hai una nuova richiesta di partecipazione!</h1>
      <p><strong>${req.user.nickname}</strong> vorrebbe unirsi al tuo pasto "${meal.title}".</p>
      ${message ? `<p><strong>Il suo messaggio:</strong> "${message}"</p>` : ''}
      <p>Apri l'app per accettare o rifiutare la richiesta.</p>
    `;
    try {
      await sendEmail({
        to: meal.host.email,
        subject: emailSubject,
        html: emailMessage,
      });
    } catch (err) {
      console.error("Errore nell'invio dell'email di richiesta:", err);
    }
  }

  res.status(201).json({
    success: true,
    data: joinRequest
  });
});

// Host accetta/rifiuta richiesta
exports.handleJoinRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const { action } = req.body; // 'accept' o 'decline'
  const hostId = req.user.id;

  const joinRequest = await JoinRequest.findById(requestId)
    .populate('meal')
    .populate('requester', 'nickname settings email fcmTokens');

  if (!joinRequest) {
    return next(new ErrorResponse('Richiesta non trovata', 404));
  }

  if (joinRequest.meal.host.toString() !== hostId) {
    return next(new ErrorResponse('Solo l\'host può gestire le richieste', 403));
  }

  if (joinRequest.status !== 'pending') {
    return next(new ErrorResponse('Questa richiesta è già stata gestita', 400));
  }

  if (action === 'accept') {
    // Controlla se c'è ancora posto
    if (joinRequest.meal.participants.length >= joinRequest.meal.maxParticipants) {
      return next(new ErrorResponse('Il pasto ha raggiunto il numero massimo di partecipanti', 400));
    }

    joinRequest.status = 'accepted';
    await joinRequest.save();

    // Aggiungi il partecipante al pasto
    await Meal.findByIdAndUpdate(joinRequest.meal._id, {
      $push: { participants: joinRequest.requester._id }
    });

    // Invia notifica al richiedente
    if (joinRequest.requester.settings?.notifications?.push && joinRequest.requester.fcmTokens && joinRequest.requester.fcmTokens.length > 0) {
      pushNotificationService.sendPushNotification(
        joinRequest.requester.fcmTokens,
        'Richiesta accettata!',
        `La tua richiesta per "${joinRequest.meal.title}" è stata accettata!`,
        { type: 'joinRequestAccepted', mealId: joinRequest.meal._id.toString() }
      );
    }

    // Invia email al richiedente
    if (joinRequest.requester.settings?.notifications?.email) {
      const emailSubject = `Richiesta accettata - ${joinRequest.meal.title}`;
      const emailMessage = `
        <h1>La tua richiesta è stata accettata!</h1>
        <p>Congratulazioni! La tua richiesta per partecipare a "${joinRequest.meal.title}" è stata accettata.</p>
        <p>Data: ${new Date(joinRequest.meal.date).toLocaleString('it-IT')}</p>
        <p>Posizione: ${joinRequest.meal.location}</p>
        <p>Apri l'app per vedere i dettagli del pasto.</p>
      `;
      try {
        await sendEmail({
          to: joinRequest.requester.email,
          subject: emailSubject,
          html: emailMessage,
        });
      } catch (err) {
        console.error("Errore nell'invio dell'email di accettazione:", err);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Richiesta accettata con successo',
      data: joinRequest
    });
  } else if (action === 'decline') {
    joinRequest.status = 'declined';
    await joinRequest.save();

    // Invia notifica al richiedente
    if (joinRequest.requester.settings?.notifications?.push && joinRequest.requester.fcmTokens && joinRequest.requester.fcmTokens.length > 0) {
      pushNotificationService.sendPushNotification(
        joinRequest.requester.fcmTokens,
        'Richiesta rifiutata',
        `La tua richiesta per "${joinRequest.meal.title}" non è stata accettata.`,
        { type: 'joinRequestDeclined', mealId: joinRequest.meal._id.toString() }
      );
    }

    // Invia email al richiedente
    if (joinRequest.requester.settings?.notifications?.email) {
      const emailSubject = `Richiesta non accettata - ${joinRequest.meal.title}`;
      const emailMessage = `
        <h1>Richiesta non accettata</h1>
        <p>La tua richiesta per partecipare a "${joinRequest.meal.title}" non è stata accettata.</p>
        <p>Non scoraggiarti! Ci sono molti altri TableTalk disponibili.</p>
      `;
      try {
        await sendEmail({
          to: joinRequest.requester.email,
          subject: emailSubject,
          html: emailMessage,
        });
      } catch (err) {
        console.error("Errore nell'invio dell'email di rifiuto:", err);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Richiesta rifiutata',
      data: joinRequest
    });
  } else {
    return next(new ErrorResponse('Azione non valida', 400));
  }
});

// Ottieni richieste per un pasto (solo per l'host)
exports.getJoinRequests = asyncHandler(async (req, res, next) => {
  const { mealId } = req.params;
  const hostId = req.user.id;

  const meal = await Meal.findById(mealId);
  if (!meal) {
    return next(new ErrorResponse('Pasto non trovato', 404));
  }

  if (meal.host.toString() !== hostId) {
    return next(new ErrorResponse('Solo l\'host può vedere le richieste', 403));
  }

  // Ottieni gli ID degli utenti da escludere (blocchi bidirezionali)
  const currentUser = await require('../models/User').findById(hostId);
  const usersWhoBlockedMe = await require('../models/User').find({ blockedUsers: hostId }).select('_id');
  const usersWhoBlockedMeIds = usersWhoBlockedMe.map(user => user._id);
  const excludedIds = [...currentUser.blockedUsers, ...usersWhoBlockedMeIds];

  const requests = await JoinRequest.find({ 
    meal: mealId,
    requester: { $nin: excludedIds } // Escludi richieste da utenti bloccati
  })
    .populate('requester', 'nickname profileImage')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: requests.length,
    data: requests
  });
});

// Ottieni le richieste inviate dall'utente corrente
exports.getMyRequests = asyncHandler(async (req, res, next) => {
  // Ottieni gli ID degli utenti da escludere (blocchi bidirezionali)
  const currentUser = await require('../models/User').findById(req.user.id);
  const usersWhoBlockedMe = await require('../models/User').find({ blockedUsers: req.user.id }).select('_id');
  const usersWhoBlockedMeIds = usersWhoBlockedMe.map(user => user._id);
  const excludedIds = [...currentUser.blockedUsers, ...usersWhoBlockedMeIds];

  const requests = await JoinRequest.find({ requester: req.user.id })
    .populate('meal', 'title date location host')
    .populate('meal.host', 'nickname')
    .sort({ createdAt: -1 });

  // Filtra le richieste per escludere i pasti di utenti bloccati
  const filteredRequests = requests.filter(request => 
    !excludedIds.some(id => id.toString() === request.meal.host._id.toString())
  );

  res.status(200).json({
    success: true,
    count: filteredRequests.length,
    data: filteredRequests
  });
}); 