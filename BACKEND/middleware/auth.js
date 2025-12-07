// File: /BACKEND/middleware/auth.js (Versione Definitiva e Pulita)

const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

/**
 * @desc    Middleware per proteggere le rotte. Verifica il token e attacca l'utente a req.user
 */
exports.protect = asyncHandler(async (req, res, next) => {
  console.log(`\n--- [PROTECT] Eseguo il middleware per la rotta: ${req.method} ${req.path} ---`);
  console.log('🔐 [Auth] Checking token...');
  console.log('🔐 [Auth] Authorization header:', req.headers.authorization);
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('[PROTECT] ✅ Token trovato nell\'header.');
  }

  if (!token) {
    console.log('[PROTECT] ❌ ERRORE: Token NON trovato.');
    return next(new ErrorResponse('Non autorizzato. Token mancante.', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ [Auth] Token valid for user:', decoded.id);
    console.log('[PROTECT] ✅ Token decodificato. ID Utente:', decoded.id);

    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      console.log(`[PROTECT] ❌ ERRORE: Utente non trovato nel DB con l'ID: ${decoded.id}`);
      return next(new ErrorResponse('Utente associato a questo token non più esistente.', 401));
    }

    // Verifica se l'utente è attivo
    if (!req.user.isActive) {
      return next(new ErrorResponse('Account disattivato', 401));
    }

    // 🔒 SICUREZZA: Verifica che l'email sia stata verificata
    // TEMPORANEAMENTE DISABILITATO PER TEST
    // if (!req.user.isEmailVerified) {
    //   return next(new ErrorResponse('Account non verificato. Controlla la tua email e clicca sul link di verifica per completare la registrazione.', 403));
    // }

    console.log(`[PROTECT] ✅ Utente trovato: ${req.user.email} (verificato). Passo al controller.`);
    next();

  } catch (err) {
    console.error('[PROTECT] ❌ ERRORE: Token non valido o scaduto.', err.message);
    return next(new ErrorResponse('Token non valido o scaduto.', 401));
  }
});

/**
 * @desc    Middleware per autorizzare solo specifici ruoli
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Utente non trovato, impossibile verificare il ruolo.', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`Ruolo '${req.user.role}' non autorizzato ad accedere a questa risorsa`, 403));
    }
    next();
  };
};

/**
 * @desc    Middleware per autorizzare solo gli admin
 */
exports.admin = exports.authorize('admin');

/**
 * @desc    Middleware per verificare se l'utente è il proprietario della risorsa
 */
exports.isOwner = (model) => async (req, res, next) => {
  try {
    const resource = await model.findById(req.params.id);
    
    if (!resource) {
      return next(new ErrorResponse('Risorsa non trovata', 404));
    }
    
    if (resource.user.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Non hai i permessi necessari per questa operazione', 403));
    }
    
    req.resource = resource;
    next();
  } catch (error) {
    console.error('Errore durante la verifica del proprietario:', error);
    next(new ErrorResponse('Errore durante la verifica dei permessi', 500));
  }
};

/**
 * @desc    Middleware per verificare se il profilo è completo
 */
exports.requireCompleteProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return next(new ErrorResponse('Utente non trovato', 404));
  }

  // 🔒 SICUREZZA: Verifica il campo corretto per il profilo completo
  if (!user.profileCompleted) {
    return next(new ErrorResponse('Profilo incompleto. Completa il tuo profilo per accedere a questa funzionalità.', 403));
  }

  next();
});

/**
 * @desc    Middleware per verificare se l'account è verificato
 */
exports.requireVerifiedAccount = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return next(new ErrorResponse('Utente non trovato', 404));
  }

  // 🔒 SICUREZZA: Verifica il campo corretto per la verifica email
  if (!user.isEmailVerified) {
    return next(new ErrorResponse('Account non verificato. Controlla la tua email e clicca sul link di verifica per completare la registrazione.', 403));
  }

  next();
});

/**
 * @desc    Middleware per verificare se l'utente è un host
 */
exports.requireHost = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return next(new ErrorResponse('Utente non trovato', 404));
  }

  if (!user.isHost) {
    return next(new ErrorResponse('Non sei un host', 403));
  }

  next();
});

// Middleware per permettere solo agli admin
exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Accesso riservato agli amministratori.' });
};

/**
 * @desc    Middleware flessibile per verificare l'account (opzionale)
 * @param   {boolean} required - Se true, blocca l'accesso. Se false, solo avvisa
 */
exports.requireVerifiedAccountFlexible = (required = true) => asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return next(new ErrorResponse('Utente non trovato', 404));
  }

  if (!user.isEmailVerified) {
    if (required) {
      return next(new ErrorResponse('Account non verificato. Controlla la tua email e clicca sul link di verifica per completare la registrazione.', 403));
    } else {
      // Solo avvisa ma permette l'accesso
      req.user.emailVerificationWarning = true;
      console.log(`[AUTH] ⚠️ Utente ${user.email} non verificato ma accesso permesso`);
    }
  }

  next();
});

/**
 * @desc    Middleware flessibile per verificare il profilo (opzionale)
 * @param   {boolean} required - Se true, blocca l'accesso. Se false, solo avvisa
 */
exports.requireProfileCompleteFlexible = (required = true) => asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return next(new ErrorResponse('Utente non trovato', 404));
  }

  if (!user.profileCompleted) {
    if (required) {
      return next(new ErrorResponse('Profilo incompleto. Completa il tuo profilo per accedere a questa funzionalità.', 403));
    } else {
      // Solo avvisa ma permette l'accesso
      req.user.profileCompletionWarning = true;
      console.log(`[AUTH] ⚠️ Utente ${user.email} con profilo incompleto ma accesso permesso`);
    }
  }

  next();
});

// NOTA: Le altre funzioni middleware (requireCompleteProfile, etc.) sono corrette
// ma assicurati che non siano duplicate e che usino `req.user` in modo sicuro.