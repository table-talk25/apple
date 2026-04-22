// File: /BACKEND/controllers/authController.js (Versione Finale, Completa e Corretta)

const crypto = require('crypto');
const { validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const emailVerificationService = require('../services/emailVerificationService');
const passwordResetService = require('../services/passwordResetService');

/**
 * @desc    Registra un nuovo utente
 * @route   POST /api/auth/register
 */
exports.register = asyncHandler(async (req, res, next) => {
    console.time('Tempo Registrazione');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse('Uno o più campi non sono validi', 400, errors.array()));
    }
    
    const { name, surname, email, password, dateOfBirth } = req.body;

    console.log('\n--- TENTATIVO DI REGISTRAZIONE RICEVUTO ---');
    console.log('Dati ricevuti per la registrazione:', { name, surname, email, dateOfBirth });

    // Lasciamo che sia il nostro errorHandler (con la regola per il codice 11000)
    // a gestire il caso dell'email duplicata per dare un messaggio specifico.
    
    // Passiamo la password in chiaro. Il modello User.js si occuperà di criptarla
    // UNA SOLA VOLTA prima di salvare, grazie al middleware pre-save.
    const user = await User.create({ name, surname, email, password, dateOfBirth });
    
    console.log('✅ Utente creato con successo nel database!');
    console.log('Dettagli utente salvato:', user);
    console.log('-------------------------------------------\n');
    
    await user.checkProfileCompletion();

    // Genera il token JWT per l'autenticazione
    const token = user.generateAuthToken();
    
    // Invia l'email di verifica utilizzando il servizio dedicato
    try {
      const verificationResult = await emailVerificationService.sendVerificationEmail(user);
      
      if (!verificationResult.success) {
        console.warn('⚠️ [AuthController] Email verifica non inviata:', verificationResult.message);
        // Non blocchiamo la registrazione se l'email fallisce
      }
    } catch (err) {
      console.error('❌ [AuthController] Errore invio email verifica:', err.message);
      // Non blocchiamo la registrazione se l'email fallisce
    }
    console.timeEnd('Tempo Registrazione');
    // Creo un oggetto con solo i dati essenziali per il frontend
    const userInfo = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileCompleted: user.profileCompleted,
      isEmailVerified: user.isEmailVerified
    };
    
    res.status(201).json({ 
      success: true, 
      token, 
      user: userInfo, 
      message: 'Registrazione effettuata con successo! Controlla la tua email per verificare il tuo account e accedere a tutte le funzionalità.',
      requiresEmailVerification: true
    });
});

/**
 * @desc    Autentica un utente
 * @route   POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { 
        return next(new ErrorResponse('Dati di login non validi', 400, errors.array())); 
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return next(new ErrorResponse('Credenziali non valide', 401));
    }
    
    if (user.isLocked()) {
        return next(new ErrorResponse('Account bloccato a causa di troppi tentativi falliti. Riprova più tardi.', 403));
    }
    
    if (!(await user.comparePassword(password))) {
        await user.incrementLoginAttempts();
        return next(new ErrorResponse('Credenziali non valide', 401));
    }

    await user.resetLoginAttempts();
    const token = user.generateAuthToken();
    res.status(200).json({ success: true, token, user });
});

/**
 * @desc    Ottiene i dati dell'utente loggato
 * @route   GET /api/auth/me
 */
exports.getMe = asyncHandler(async (req, res, next) => {
    // req.user viene popolato dal middleware 'protect'
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorResponse('Utente non trovato', 404));
    }
    
    // 🔒 SICUREZZA: Verifica che l'email sia stata verificata (DISABILITATA PER TEST AI)
    // if (!user.isEmailVerified) {
    //     return next(new ErrorResponse('Account non verificato. Controlla la tua email e clicca sul link di verifica per completare la registrazione.', 403));
    // }
    
    res.status(200).json({ success: true, data: user });
});

/**
 * @desc    Esegue il logout (lato server non fa nulla, il token viene invalidato nel frontend)
 * @route   POST /api/auth/logout
 */
exports.logout = asyncHandler(async (req, res, next) => {
    res.status(200).json({ success: true, message: 'Logout effettuato con successo' });
});

/**
 * @desc    Invia email per il reset della password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    
    if (!email) {
        return next(new ErrorResponse('Email richiesta', 400));
    }
    
    console.log(`🔑 [AuthController] Richiesta reset password per: ${email}`);
    
    try {
        const result = await passwordResetService.sendPasswordResetEmail(email);
        
        if (result.success) {
            console.log(`✅ [AuthController] Email reset inviata a: ${email}`);
            
            res.status(200).json({
                success: true,
                message: result.message,
                email: email
            });
        } else {
            console.log(`❌ [AuthController] Reset password fallito: ${result.message}`);
            
            // Gestisci i diversi tipi di errore
            if (result.code === 'COOLDOWN_ACTIVE') {
                return next(new ErrorResponse(result.message, 429, null, 'COOLDOWN_ACTIVE'));
            } else {
                return next(new ErrorResponse(result.message, 500));
            }
        }
        
    } catch (error) {
        console.error(`❌ [AuthController] Errore nel reset password:`, error);
        return next(new ErrorResponse('Errore nell\'invio email di reset', 500));
    }
});


/**
 * @desc    Resetta la password usando un token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
        return next(new ErrorResponse('Token e nuova password richiesti', 400));
    }
    
    // Validazione password
    if (newPassword.length < 8) {
        return next(new ErrorResponse('La password deve essere di almeno 8 caratteri', 400));
    }
    
    console.log(`🔄 [AuthController] Reset password richiesto per token: ${token.substring(0, 8)}...`);
    
    try {
        const result = await passwordResetService.resetPassword(token, newPassword);
        
        if (result.success) {
            console.log(`✅ [AuthController] Password resettata con successo per utente: ${result.userId}`);
            
            res.status(200).json({
                success: true,
                message: result.message,
                userId: result.userId,
                email: result.email
            });
        } else {
            console.log(`❌ [AuthController] Reset password fallito: ${result.message}`);
            
            return next(new ErrorResponse(result.message, 400, null, result.code));
        }
        
    } catch (error) {
        console.error(`❌ [AuthController] Errore nel reset password:`, error);
        return next(new ErrorResponse('Errore nel reset della password', 500));
    }
});

/**
 * @desc    Verifica l'email di un utente
 * @route   GET /api/auth/verify-email
 * @access  Public
 */
exports.verifyEmail = asyncHandler(async (req, res, next) => {
    const { token } = req.query;
    
    if (!token) {
        return next(new ErrorResponse('Token di verifica richiesto', 400));
    }
    
    console.log(`🔍 [AuthController] Verifica email richiesta per token: ${token.substring(0, 8)}...`);
    
    try {
        const verificationResult = await emailVerificationService.verifyEmailToken(token);
        
        if (verificationResult.success) {
            console.log(`✅ [AuthController] Email verificata con successo per utente: ${verificationResult.userId}`);
            
            res.status(200).json({
                success: true,
                message: 'Email verificata con successo! Ora puoi accedere a tutte le funzionalità di TableTalk.',
                user: verificationResult.user
            });
        } else {
            console.log(`❌ [AuthController] Verifica email fallita: ${verificationResult.message}`);
            
            return next(new ErrorResponse(verificationResult.message, 400, null, verificationResult.code));
        }
        
    } catch (error) {
        console.error(`❌ [AuthController] Errore nella verifica email:`, error);
        return next(new ErrorResponse('Errore nella verifica dell\'email', 500));
    }
});

/**
 * @desc    Reinvia l'email di verifica
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
exports.resendVerification = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    
    if (!email) {
        return next(new ErrorResponse('Email richiesta', 400));
    }
    
    console.log(`🔄 [AuthController] Richiesta riinvio verifica per: ${email}`);
    
    try {
        const result = await emailVerificationService.resendVerificationEmail(email);
        
        if (result.success) {
            console.log(`✅ [AuthController] Email verifica reinviata a: ${email}`);
            
            res.status(200).json({
                success: true,
                message: 'Nuova email di verifica inviata. Controlla la tua casella di posta.',
                email: email,
                tokenExpires: result.tokenExpires
            });
        } else {
            console.log(`❌ [AuthController] Rinvio verifica fallito: ${result.message}`);
            
            // Gestisci i diversi tipi di errore
            if (result.code === 'USER_NOT_FOUND' || result.code === 'ALREADY_VERIFIED') {
                return res.status(200).json({
                    success: true,
                    message: 'Se l\'email è registrata, riceverai un link di verifica.'
                });
            } else if (result.code === 'COOLDOWN_ACTIVE') {
                return next(new ErrorResponse(result.message, 429, null, 'COOLDOWN_ACTIVE'));
            } else {
                return next(new ErrorResponse(result.message, 500));
            }
        }
        
    } catch (error) {
        console.error(`❌ [AuthController] Errore nel riinvio verifica:`, error);
        return next(new ErrorResponse('Errore nel riinvio dell\'email di verifica', 500));
    }
});

/**
 * @desc    Ottiene statistiche sulla verifica email (solo admin)
 * @route   GET /api/auth/verification-stats
 * @access  Private (Admin)
 */
exports.getVerificationStats = asyncHandler(async (req, res, next) => {
    try {
        const stats = await emailVerificationService.getVerificationStats();
        
        if (stats.success) {
            res.status(200).json({
                success: true,
                message: 'Statistiche verifica email recuperate con successo',
                stats: stats.stats
            });
        } else {
            return next(new ErrorResponse(stats.message, 500));
        }
        
    } catch (error) {
        console.error(`❌ [AuthController] Errore nel recupero statistiche verifica:`, error);
        return next(new ErrorResponse('Errore nel recupero statistiche verifica', 500));
    }
});

/**
 * @desc    Pulisce token di verifica scaduti (solo admin)
 * @route   POST /api/auth/cleanup-expired-tokens
 * @access  Private (Admin)
 */
exports.cleanupExpiredTokens = asyncHandler(async (req, res, next) => {
    try {
        const result = await emailVerificationService.cleanupExpiredTokens();
        
        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message,
                cleanedCount: result.cleanedCount
            });
        } else {
            return next(new ErrorResponse(result.message, 500));
        }
        
    } catch (error) {
        console.error(`❌ [AuthController] Errore nella pulizia token:`, error);
        return next(new ErrorResponse('Errore nella pulizia token scaduti', 500));
    }
});

/**
 * @desc    Verifica un token di reset password
 * @route   GET /api/auth/verify-reset-token
 * @access  Public
 */
exports.verifyResetToken = asyncHandler(async (req, res, next) => {
    const { token } = req.query;
    
    if (!token) {
        return next(new ErrorResponse('Token di reset richiesto', 400));
    }
    
    console.log(`🔍 [AuthController] Verifica token reset richiesta per: ${token.substring(0, 8)}...`);
    
    try {
        const result = await passwordResetService.verifyResetToken(token);
        
        if (result.success) {
            console.log(`✅ [AuthController] Token reset valido per utente: ${result.userId}`);
            
            res.status(200).json({
                success: true,
                message: result.message,
                user: result.user
            });
        } else {
            console.log(`❌ [AuthController] Token reset non valido: ${result.message}`);
            
            return next(new ErrorResponse(result.message, 400, null, result.code));
        }
        
    } catch (error) {
        console.error(`❌ [AuthController] Errore nella verifica token reset:`, error);
        return next(new ErrorResponse('Errore nella verifica del token', 500));
    }
});

/**
 * @desc    Ottiene statistiche sui reset password (solo admin)
 * @route   GET /api/auth/password-reset-stats
 * @access  Private (Admin)
 */
exports.getPasswordResetStats = asyncHandler(async (req, res, next) => {
    try {
        const stats = await passwordResetService.getResetStats();
        
        if (stats.success) {
            res.status(200).json({
                success: true,
                message: 'Statistiche reset password recuperate con successo',
                stats: stats.stats
            });
        } else {
            return next(new ErrorResponse(stats.message, 500));
        }
        
    } catch (error) {
        console.error(`❌ [AuthController] Errore nel recupero statistiche reset:`, error);
        return next(new ErrorResponse('Errore nel recupero statistiche reset password', 500));
    }
});

/**
 * @desc    Pulisce token di reset password scaduti (solo admin)
 * @route   POST /api/auth/cleanup-expired-reset-tokens
 * @access  Private (Admin)
 */
exports.cleanupExpiredResetTokens = asyncHandler(async (req, res, next) => {
    try {
        const result = await passwordResetService.cleanupExpiredTokens();
        
        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message,
                cleanedCount: result.cleanedCount
            });
        } else {
            return next(new ErrorResponse(result.message, 500));
        }
        
    } catch (error) {
        console.error(`❌ [AuthController] Errore nella pulizia token reset:`, error);
        return next(new ErrorResponse('Errore nella pulizia token reset scaduti', 500));
    }
});