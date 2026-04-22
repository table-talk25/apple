// File: BACKEND/routes/auth.js (Versione Finale e Corretta)

const express = require('express');
const router = express.Router();
const { check } = require('express-validator'); 
const rateLimit = require('express-rate-limit'); // <-- IMPORT NECESSARIO
const authController = require('../controllers/authController');
const socialAuthController = require('../controllers/socialAuthController');
const { protect } = require('../middleware/auth');

const { 
  registerValidation, 
  loginValidation, 
  forgotPasswordValidation, 
  resetPasswordValidation 
} = require('../middleware/validators/authValidator');

// Configurazione rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, 
  message: 'Troppi tentativi di login. Riprova tra 10 minuti.'
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5, 
  message: 'Troppe registrazioni. Riprova tra un\'ora.'
});

// --- DEFINIZIONE DELLE ROTTE ---

router.post('/register', registerLimiter, registerValidation, authController.register);

router.post('/login', loginLimiter, loginValidation, authController.login);

router.post('/logout', authController.logout);

router.get('/me', protect, authController.getMe);

router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);

// 🔑 Route per reset password
router.post('/reset-password', resetPasswordValidation, authController.resetPassword);
router.get('/verify-reset-token', authController.verifyResetToken);

// 🔐 Route per verifica email
router.get('/verify-email', authController.verifyEmail);

router.post('/resend-verification', [check('email', 'Email non valida').isEmail()], authController.resendVerification);

// 📊 Route per statistiche e manutenzione (solo admin)
router.get('/verification-stats', protect, authController.getVerificationStats);
router.post('/cleanup-expired-tokens', protect, authController.cleanupExpiredTokens);
router.get('/password-reset-stats', protect, authController.getPasswordResetStats);
router.post('/cleanup-expired-reset-tokens', protect, authController.cleanupExpiredResetTokens);

// Social Authentication Routes
router.post('/google', socialAuthController.googleAuth);
router.post('/apple', socialAuthController.appleAuth);

module.exports = router;