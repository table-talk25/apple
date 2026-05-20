// File: /BACKEND/controllers/profileController.js (Versione Definitiva Completa)

const { validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const path = require('path');
const fs = require('fs').promises; 
const Meal = require('../models/Meal');


/**
 * @desc    Ottieni il profilo dell'utente corrente
 * @route   GET /api/profile/me
 * @access  Private
 */
exports.getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return next(new ErrorResponse('Utente non trovato nel DB', 404));
  }
  
  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Ottenere il profilo pubblico di un utente tramite ID
 * @route   GET /api/profile/public/:userId
 * @access  Public
 */
exports.getPublicProfile = asyncHandler(async (req, res, next) => {
  const publicFields = 'nickname profileImage bio gender interests languages preferredCuisine location createdMeals age mealsCount createdAt settings';

  const userDoc = await User.findById(req.params.userId)
    .select(publicFields)
    .populate({ path: 'createdMeals', select: 'title date' })
    .populate({ path: 'joinedMeals', select: 'title date' })
    .lean();

  if (!userDoc) {
    console.log('[getPublicProfile] ❌ ERRORE: Utente non trovato nel DB.');
    return next(new ErrorResponse(`Utente non trovato`, 404));
  }
  console.log('[getPublicProfile] ✅ Utente trovato. Inizio a processare i suoi dati...');

  // Pulizia dei pasti "fantasma" (cancellati)
  if (userDoc.createdMeals) {
    userDoc.createdMeals = userDoc.createdMeals.filter(meal => meal !== null && meal.date);
  }
  if (userDoc.joinedMeals) {
    userDoc.joinedMeals = userDoc.joinedMeals.filter(meal => meal !== null && meal.date);
  }

  const user = userDoc;

  // Logica della privacy
  if (user.settings?.privacy && !user.settings.privacy.showAge) user.age = null;
  if (user.settings?.privacy && !user.settings.privacy.showLocation) user.location = '';
  delete user.settings;

  console.log('[getPublicProfile] ✅ Dati pronti per essere inviati al frontend.');
  res.status(200).json({ success: true, data: user });
});

/**
 * @desc    Aggiorna il profilo dell'utente corrente
 * @route   PUT /api/profile/me
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse('Utente non trovato.', 404));
  }

  const updatedUser = await user.updateProfile(req.body);

  res.status(200).json({
    success: true,
    message: 'Profilo aggiornato con successo',
    data: updatedUser,
  });
});

/**
 * @desc    Aggiorna la password dell'utente corrente
 * @route   PUT /api/profile/me/password
 * @access  Private
 */
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    return next(new ErrorResponse('Utente non trovato', 404));
  }

  const isMatch = await user.comparePassword(req.body.currentPassword);
  if (!isMatch) {
    return next(new ErrorResponse('La password attuale non è corretta', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password aggiornata con successo',
  });
});

/**
 * @desc    Aggiorna l'avatar dell'utente corrente
 * @route   PUT /api/profile/me/avatar
 * @access  Private
 */
exports.updateAvatar = asyncHandler(async (req, res, next) => {
  const { uploadImage, deleteImage } = require('../services/firebaseStorageService');

  console.log('🖼️ [UpdateAvatar] Richiesta ricevuta per utente:', req.user.id);
  console.log('🖼️ [UpdateAvatar] File presente:', Boolean(req.file));

  if (!req.file) {
    console.error('❌ [UpdateAvatar] Nessun file ricevuto');
    return next(new ErrorResponse('Per favore, carica un file immagine.', 400));
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    console.error('❌ [UpdateAvatar] Utente non trovato:', req.user.id);
    return next(new ErrorResponse('Utente non trovato.', 404));
  }

  try {
    const fileBuffer = req.file.buffer || (req.file.path ? await fs.readFile(req.file.path) : null);
    if (!fileBuffer) {
      return next(new ErrorResponse('Impossibile leggere il file immagine.', 400));
    }

    const imageUrl = await uploadImage(
      fileBuffer,
      req.file.originalname,
      'profile-images'
    );

    const oldImageUrl = user.profileImage;
    const defaultImageUrl = 'https://storage.googleapis.com/tabletalk-social.firebasestorage.app/profile-images/default-avatar.jpg';

    if (oldImageUrl && oldImageUrl !== defaultImageUrl && oldImageUrl.includes('storage.googleapis.com')) {
      await deleteImage(oldImageUrl);
    }

    user.profileImage = imageUrl;
    await user.save();

    console.log('✅ [UpdateAvatar] Avatar aggiornato con successo per utente:', req.user.id);
    console.log('✅ [UpdateAvatar] Nuovo URL immagine:', imageUrl);

    res.status(200).json({
      success: true,
      message: 'Immagine del profilo aggiornata con successo.',
      data: user,
    });
  } catch (error) {
    console.error('❌ [UpdateAvatar] Errore durante il caricamento:', error);
    return next(new ErrorResponse('Errore durante il caricamento dell\'immagine.', 500));
  }
});

/**
 * @desc    Elimina l'immagine del profilo
 * @route   DELETE /api/profile/me/avatar
 * @access  Private
 */
exports.deleteProfileImage = asyncHandler(async (req, res, next) => {
  const { deleteImage } = require('../services/firebaseStorageService');

  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new ErrorResponse('Utente non trovato', 404));
  }

  const defaultImageUrl = 'https://storage.googleapis.com/tabletalk-social.firebasestorage.app/profile-images/default-avatar.jpg';

  if (user.profileImage && user.profileImage !== defaultImageUrl && user.profileImage.includes('storage.googleapis.com')) {
    try {
      await deleteImage(user.profileImage);
    } catch (error) {
      console.error('❌ Errore durante l\'eliminazione dell\'immagine:', error);
    }
  }

  user.profileImage = defaultImageUrl;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Immagine del profilo eliminata',
    data: user,
  });
});

/**
 * @desc    Elimina l'account dell'utente corrente
 * @route   DELETE /api/profile/me
 * @access  Private
 */
exports.deleteAccount = asyncHandler(async (req, res, next) => {
  const { password } = req.body;
  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    return next(new ErrorResponse('Utente non trovato', 404));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ErrorResponse('Password non corretta. Impossibile eliminare l\'account.', 401));
  }

  try {
    const { deleteImage } = require('../services/firebaseStorageService');
    const defaultImageUrl = 'https://storage.googleapis.com/tabletalk-social.firebasestorage.app/profile-images/default-avatar.jpg';

    // 1. Elimina l'immagine del profilo se non è quella di default
    if (user.profileImage && user.profileImage !== defaultImageUrl && user.profileImage.includes('storage.googleapis.com')) {
      try {
        await deleteImage(user.profileImage);
      } catch (err) {
        console.error('Errore nell\'eliminazione dell\'immagine profilo:', err.message);
      }
    }

    // 2. Elimina tutti i pasti creati dall'utente
    const Meal = require('../models/Meal');
    await Meal.deleteMany({ host: user._id });

    // 3. Rimuovi l'utente da tutti i pasti a cui ha partecipato
    await Meal.updateMany(
      { participants: user._id },
      { $pull: { participants: user._id } }
    );

    // 4. Elimina tutte le chat dell'utente
    const Chat = require('../models/Chat');
    await Chat.deleteMany({ participants: user._id });

    // 5. Elimina tutte le inviti dell'utente
    const Invitation = require('../models/Invitation');
    await Invitation.deleteMany({
      $or: [
        { fromUser: user._id },
        { toUser: user._id }
      ]
    });

    // 6. Elimina tutte le richieste di partecipazione dell'utente
    const JoinRequest = require('../models/JoinRequest');
    await JoinRequest.deleteMany({
      $or: [
        { requester: user._id },
        { meal: { $in: await Meal.find({ host: user._id }).select('_id') } }
      ]
    });

    // 7. Elimina tutte le segnalazioni dell'utente
    const Report = require('../models/Report');
    await Report.deleteMany({
      $or: [
        { reporter: user._id },
        { reportedUser: user._id }
      ]
    });

    // 8. Rimuovi l'utente dalla lista dei blocchi di altri utenti
    await User.updateMany(
      { blockedUsers: user._id },
      { $pull: { blockedUsers: user._id } }
    );

    // 9. Elimina l'utente
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Il tuo account e tutti i tuoi dati sono stati eliminati con successo.',
    });
  } catch (error) {
    console.error('Errore durante l\'eliminazione dell\'account:', error);
    return next(new ErrorResponse('Errore durante l\'eliminazione dell\'account. Riprova più tardi.', 500));
  }
});

/**
 * @desc    Aggiunge un token FCM al profilo dell'utente
 * @route   POST /api/profile/me/fcm-token
 * @access  Private
 */
exports.addFcmToken = asyncHandler(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new ErrorResponse('Token non fornito.', 400));
  }

  // Usiamo $addToSet per evitare di aggiungere token duplicati
  await User.findByIdAndUpdate(req.user.id, {
    $addToSet: { fcmTokens: token }
  });

  res.status(200).json({
    success: true,
    message: 'Token per le notifiche salvato con successo.'
  });
});