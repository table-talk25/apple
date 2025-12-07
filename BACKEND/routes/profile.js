// File: /BACKEND/routes/profile.js (Ordine Corretto)

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload  = require('../middleware/upload');

// PASSO 1: Importiamo TUTTE le funzioni necessarie dal controller.
// La nuova 'getPublicProfile' è inclusa qui.
const {
  getProfile,
  updateProfile,
  updatePassword,
  updateAvatar,
  deleteProfileImage,
  deleteAccount,
  getPublicProfile,
  addFcmToken
} = require('../controllers/profileController');


// --- ROTTE PRIVATE (devono venire PRIMA delle rotte pubbliche) ---

// Ottiene il profilo dell'utente corrente
router.get('/me', protect, getProfile);

// Aggiorna i dati testuali del profilo
router.put('/me', protect, updateProfile);

// Aggiorna la password
router.put('/me/password', protect, updatePassword);

// Carica o aggiorna l'avatar
router.put('/me/avatar', protect, upload.single('avatar'), updateAvatar);

// Elimina l'avatar
router.delete('/me/avatar', protect, deleteProfileImage);

// Elimina l'intero account dell'utente
router.delete('/me', protect, deleteAccount);

// Aggiunge un token FCM per le notifiche push
router.post('/me/fcm-token', protect, addFcmToken);

// --- ROTTE PUBBLICHE (devono venire DOPO le rotte private) ---

// @route   GET /api/profile/public/:userId
// @desc    Rotta pubblica per visualizzare un profilo utente
// @access  Public
router.get('/public/:userId', getPublicProfile);

module.exports = router;