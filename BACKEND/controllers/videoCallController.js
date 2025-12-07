const asyncHandler = require('express-async-handler');

const AccessToken = require('twilio').jwt.AccessToken;

const VideoGrant = AccessToken.VideoGrant;

const Meal = require('../models/Meal');

const ErrorResponse = require('../utils/errorResponse');



// @desc    Ottieni token per videochiamata

// @route   GET /api/video/token/:mealId

// @access  Private

exports.getVideoToken = asyncHandler(async (req, res, next) => {

  const { mealId } = req.params;

  const user = req.user;



  // 1. Verifica esistenza pasto e permessi

  const meal = await Meal.findById(mealId);

  

  if (!meal) {

    return next(new ErrorResponse('Pasto non trovato', 404));

  }



  // Verifica che sia un pasto virtuale (opzionale, ma consigliato)

  // if (meal.mealType !== 'virtual') {

  //   return next(new ErrorResponse('Questo non è un pasto virtuale', 400));

  // }



  // Verifica partecipazione

  const isHost = meal.host.toString() === user.id;

  const isParticipant = meal.participants.includes(user.id);



  if (!isHost && !isParticipant) {

    return next(new ErrorResponse('Non sei autorizzato ad accedere a questa videochiamata', 403));

  }



  // 2. Configura Twilio

  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;

  const twilioApiKey = process.env.TWILIO_API_KEY;

  const twilioApiSecret = process.env.TWILIO_API_SECRET;



  if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {

    console.error('❌ [VideoCall] Credenziali Twilio mancanti nel .env');

    return next(new ErrorResponse('Errore configurazione server video', 500));

  }



  // 3. Crea il Grant Video

  // IMPORTANTE: Il nome della stanza DEVE essere il mealId per far incontrare tutti

  const roomName = `meal-${mealId}`; 

  

  const videoGrant = new VideoGrant({

    room: roomName

  });



  // 4. Crea il Token

  const token = new AccessToken(

    twilioAccountSid,

    twilioApiKey,

    twilioApiSecret,

    { identity: user.nickname || user.email } // Identità visibile agli altri

  );



  token.addGrant(videoGrant);



  console.log(`🎥 [VideoCall] Token generato per utente ${user.nickname} nella stanza ${roomName}`);



  res.status(200).json({

    success: true,

    token: token.toJwt(),

    roomName: roomName,

    identity: user.nickname

  });

});
