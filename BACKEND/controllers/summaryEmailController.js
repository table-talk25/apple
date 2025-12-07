// File: BACKEND/controllers/summaryEmailController.js
// 📧 CONTROLLER PER EMAIL DI RIEPILOGO
// 
// Questo controller gestisce le operazioni relative alle email di riepilogo:
// - Invio manuale di riepiloghi
// - Gestione delle preferenze utente
// - Statistiche e monitoraggio

const summaryEmailService = require('../services/summaryEmailService');
const summaryEmailJobs = require('../jobs/summaryEmailJobs');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Invia riepilogo settimanale manuale per un utente
 * @route   POST /api/summary-emails/weekly/:userId
 * @access  Private (Admin)
 */
exports.sendWeeklySummary = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  
  if (!userId) {
    return next(new ErrorResponse('ID utente richiesto', 400));
  }
  
  console.log(`📧 [SummaryEmailController] Richiesta riepilogo settimanale per utente: ${userId}`);
  
  try {
    // Calcola inizio e fine settimana
    const weekStart = summaryEmailJobs.getWeekStart();
    const weekEnd = summaryEmailJobs.getWeekEnd();
    
    // Invia il riepilogo
    const result = await summaryEmailService.sendWeeklySummary(userId, weekStart, weekEnd);
    
    if (result.success) {
      console.log(`✅ [SummaryEmailController] Riepilogo settimanale inviato a: ${result.email}`);
      
      res.status(200).json({
        success: true,
        message: 'Riepilogo settimanale inviato con successo',
        data: {
          userId: result.userId,
          email: result.email,
          periodStart: weekStart,
          periodEnd: weekEnd,
          summaryData: result.summaryData
        }
      });
    } else {
      console.log(`❌ [SummaryEmailController] Riepilogo settimanale fallito: ${result.message}`);
      
      return next(new ErrorResponse(result.message, 400, null, result.code));
    }
    
  } catch (error) {
    console.error(`❌ [SummaryEmailController] Errore nel riepilogo settimanale:`, error);
    return next(new ErrorResponse('Errore nell\'invio del riepilogo settimanale', 500));
  }
});

/**
 * @desc    Invia riepilogo mensile manuale per un utente
 * @route   POST /api/summary-emails/monthly/:userId
 * @access  Private (Admin)
 */
exports.sendMonthlySummary = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  
  if (!userId) {
    return next(new ErrorResponse('ID utente richiesto', 400));
  }
  
  console.log(`📧 [SummaryEmailController] Richiesta riepilogo mensile per utente: ${userId}`);
  
  try {
    // Calcola inizio e fine mese
    const monthStart = summaryEmailJobs.getMonthStart();
    const monthEnd = summaryEmailJobs.getMonthEnd();
    
    // Invia il riepilogo
    const result = await summaryEmailService.sendMonthlySummary(userId, monthStart, monthEnd);
    
    if (result.success) {
      console.log(`✅ [SummaryEmailController] Riepilogo mensile inviato a: ${result.email}`);
      
      res.status(200).json({
        success: true,
        message: 'Riepilogo mensile inviato con successo',
        data: {
          userId: result.userId,
          email: result.email,
          periodStart: monthStart,
          periodEnd: monthEnd,
          summaryData: result.summaryData
        }
      });
    } else {
      console.log(`❌ [SummaryEmailController] Riepilogo mensile fallito: ${result.message}`);
      
      return next(new ErrorResponse(result.message, 400, null, result.code));
    }
    
  } catch (error) {
    console.error(`❌ [SummaryEmailController] Errore nel riepilogo mensile:`, error);
    return next(new ErrorResponse('Errore nell\'invio del riepilogo mensile', 500));
  }
});

/**
 * @desc    Esegue riepilogo settimanale per tutti gli utenti attivi
 * @route   POST /api/summary-emails/weekly-all
 * @access  Private (Admin)
 */
exports.sendWeeklySummaryToAll = asyncHandler(async (req, res, next) => {
  console.log(`📧 [SummaryEmailController] Richiesta riepilogo settimanale per tutti gli utenti`);
  
  try {
    // Esegue il job manualmente
    const result = await summaryEmailJobs.manualWeeklySummary();
    
    if (result.success) {
      console.log(`✅ [SummaryEmailController] Riepilogo settimanale per tutti completato`);
      
      res.status(200).json({
        success: true,
        message: 'Riepilogo settimanale per tutti gli utenti completato',
        data: result
      });
    } else {
      console.log(`❌ [SummaryEmailController] Riepilogo settimanale per tutti fallito`);
      
      return next(new ErrorResponse('Errore nell\'esecuzione del riepilogo settimanale per tutti', 500));
    }
    
  } catch (error) {
    console.error(`❌ [SummaryEmailController] Errore nel riepilogo settimanale per tutti:`, error);
    return next(new ErrorResponse('Errore nell\'esecuzione del riepilogo settimanale per tutti', 500));
  }
});

/**
 * @desc    Esegue riepilogo mensile per tutti gli utenti attivi
 * @route   POST /api/summary-emails/monthly-all
 * @access  Private (Admin)
 */
exports.sendMonthlySummaryToAll = asyncHandler(async (req, res, next) => {
  console.log(`📧 [SummaryEmailController] Richiesta riepilogo mensile per tutti gli utenti`);
  
  try {
    // Esegue il job manualmente
    const result = await summaryEmailJobs.manualMonthlySummary();
    
    if (result.success) {
      console.log(`✅ [SummaryEmailController] Riepilogo mensile per tutti completato`);
      
      res.status(200).json({
        success: true,
        message: 'Riepilogo mensile per tutti gli utenti completato',
        data: result
      });
    } else {
      console.log(`❌ [SummaryEmailController] Riepilogo mensile per tutti fallito`);
      
      return next(new ErrorResponse('Errore nell\'esecuzione del riepilogo mensile per tutti', 500));
    }
    
  } catch (error) {
    console.error(`❌ [SummaryEmailController] Errore nel riepilogo mensile per tutti:`, error);
    return next(new ErrorResponse('Errore nell\'esecuzione del riepilogo mensile per tutti', 500));
  }
});

/**
 * @desc    Ottiene statistiche dei job di riepilogo email
 * @route   GET /api/summary-emails/stats
 * @access  Private (Admin)
 */
exports.getSummaryEmailStats = asyncHandler(async (req, res, next) => {
  console.log(`📊 [SummaryEmailController] Richiesta statistiche riepilogo email`);
  
  try {
    const stats = summaryEmailJobs.getStats();
    const status = summaryEmailJobs.getStatus();
    
    res.status(200).json({
      success: true,
      message: 'Statistiche riepilogo email recuperate con successo',
      data: {
        stats: stats,
        status: status
      }
    });
    
  } catch (error) {
    console.error(`❌ [SummaryEmailController] Errore nel recupero statistiche:`, error);
    return next(new ErrorResponse('Errore nel recupero delle statistiche riepilogo email', 500));
  }
});

/**
 * @desc    Ottiene lo stato dei job di riepilogo email
 * @route   GET /api/summary-emails/status
 * @access  Private (Admin)
 */
exports.getSummaryEmailStatus = asyncHandler(async (req, res, next) => {
  console.log(`🔍 [SummaryEmailController] Richiesta stato job riepilogo email`);
  
  try {
    const status = summaryEmailJobs.getStatus();
    
    res.status(200).json({
      success: true,
      message: 'Stato job riepilogo email recuperato con successo',
      data: status
    });
    
  } catch (error) {
    console.error(`❌ [SummaryEmailController] Errore nel recupero stato:`, error);
    return next(new ErrorResponse('Errore nel recupero dello stato dei job riepilogo email', 500));
  }
});

/**
 * @desc    Aggiorna configurazione dei job di riepilogo email
 * @route   PUT /api/summary-emails/config
 * @access  Private (Admin)
 */
exports.updateSummaryEmailConfig = asyncHandler(async (req, res, next) => {
  const { weeklySchedule, monthlySchedule, maxEmailsPerBatch, batchDelay } = req.body;
  
  console.log(`⚙️ [SummaryEmailController] Richiesta aggiornamento configurazione job riepilogo email`);
  
  try {
    const newConfig = {};
    
    if (weeklySchedule) newConfig.weeklySchedule = weeklySchedule;
    if (monthlySchedule) newConfig.monthlySchedule = monthlySchedule;
    if (maxEmailsPerBatch) newConfig.maxEmailsPerBatch = maxEmailsPerBatch;
    if (batchDelay) newConfig.batchDelay = batchDelay;
    
    // Aggiorna la configurazione
    summaryEmailJobs.updateConfig(newConfig);
    
    console.log(`✅ [SummaryEmailController] Configurazione aggiornata:`, newConfig);
    
    res.status(200).json({
      success: true,
      message: 'Configurazione job riepilogo email aggiornata con successo',
      data: {
        updatedConfig: newConfig,
        currentStats: summaryEmailJobs.getStats()
      }
    });
    
  } catch (error) {
    console.error(`❌ [SummaryEmailController] Errore nell\'aggiornamento configurazione:`, error);
    return next(new ErrorResponse('Errore nell\'aggiornamento della configurazione job riepilogo email', 500));
  }
});

/**
 * @desc    Avvia/ferma i job di riepilogo email
 * @route   POST /api/summary-emails/control
 * @access  Private (Admin)
 */
exports.controlSummaryEmailJobs = asyncHandler(async (req, res, next) => {
  const { action } = req.body;
  
  if (!action || !['start', 'stop'].includes(action)) {
    return next(new ErrorResponse('Azione richiesta: start o stop', 400));
  }
  
  console.log(`🎮 [SummaryEmailController] Richiesta controllo job riepilogo email: ${action}`);
  
  try {
    if (action === 'start') {
      summaryEmailJobs.start();
      console.log(`✅ [SummaryEmailController] Job riepilogo email avviati`);
      
      res.status(200).json({
        success: true,
        message: 'Job riepilogo email avviati con successo',
        data: {
          action: 'start',
          status: summaryEmailJobs.getStatus()
        }
      });
    } else if (action === 'stop') {
      summaryEmailJobs.stop();
      console.log(`🛑 [SummaryEmailController] Job riepilogo email fermati`);
      
      res.status(200).json({
        success: true,
        message: 'Job riepilogo email fermati con successo',
        data: {
          action: 'stop',
          status: summaryEmailJobs.getStatus()
        }
      });
    }
    
  } catch (error) {
    console.error(`❌ [SummaryEmailController] Errore nel controllo job:`, error);
    return next(new ErrorResponse(`Errore nel ${action} dei job riepilogo email`, 500));
  }
});

/**
 * @desc    Ottiene preferenze email di riepilogo per un utente
 * @route   GET /api/summary-emails/preferences/:userId
 * @access  Private (Admin) o Private (User stesso)
 */
exports.getSummaryEmailPreferences = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  
  if (!userId) {
    return next(new ErrorResponse('ID utente richiesto', 400));
  }
  
  // Verifica che l'utente possa accedere alle preferenze
  if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
    return next(new ErrorResponse('Non autorizzato ad accedere alle preferenze di questo utente', 403));
  }
  
  console.log(`⚙️ [SummaryEmailController] Richiesta preferenze riepilogo email per utente: ${userId}`);
  
  try {
    const user = await User.findById(userId).select('settings.notifications.email');
    
    if (!user) {
      return next(new ErrorResponse('Utente non trovato', 404));
    }
    
    const preferences = {
      summaryEmails: user.settings?.notifications?.email?.summaryEmails !== false,
      weeklySummary: user.settings?.notifications?.email?.weeklySummary !== false,
      monthlySummary: user.settings?.notifications?.email?.monthlySummary !== false
    };
    
    res.status(200).json({
      success: true,
      message: 'Preferenze riepilogo email recuperate con successo',
      data: {
        userId: userId,
        preferences: preferences
      }
    });
    
  } catch (error) {
    console.error(`❌ [SummaryEmailController] Errore nel recupero preferenze:`, error);
    return next(new ErrorResponse('Errore nel recupero delle preferenze riepilogo email', 500));
  }
});

/**
 * @desc    Aggiorna preferenze email di riepilogo per un utente
 * @route   PUT /api/summary-emails/preferences/:userId
 * @access  Private (Admin) o Private (User stesso)
 */
exports.updateSummaryEmailPreferences = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { summaryEmails, weeklySummary, monthlySummary } = req.body;
  
  if (!userId) {
    return next(new ErrorResponse('ID utente richiesto', 400));
  }
  
  // Verifica che l'utente possa modificare le preferenze
  if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
    return next(new ErrorResponse('Non autorizzato a modificare le preferenze di questo utente', 403));
  }
  
  console.log(`⚙️ [SummaryEmailController] Richiesta aggiornamento preferenze riepilogo email per utente: ${userId}`);
  
  try {
    const updateData = {};
    
    if (summaryEmails !== undefined) {
      updateData['settings.notifications.email.summaryEmails'] = summaryEmails;
    }
    if (weeklySummary !== undefined) {
      updateData['settings.notifications.email.weeklySummary'] = weeklySummary;
    }
    if (monthlySummary !== undefined) {
      updateData['settings.notifications.email.monthlySummary'] = monthlySummary;
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('settings.notifications.email');
    
    if (!user) {
      return next(new ErrorResponse('Utente non trovato', 404));
    }
    
    const updatedPreferences = {
      summaryEmails: user.settings?.notifications?.email?.summaryEmails !== false,
      weeklySummary: user.settings?.notifications?.email?.weeklySummary !== false,
      monthlySummary: user.settings?.notifications?.email?.monthlySummary !== false
    };
    
    console.log(`✅ [SummaryEmailController] Preferenze aggiornate per utente: ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Preferenze riepilogo email aggiornate con successo',
      data: {
        userId: userId,
        preferences: updatedPreferences
      }
    });
    
  } catch (error) {
    console.error(`❌ [SummaryEmailController] Errore nell\'aggiornamento preferenze:`, error);
    return next(new ErrorResponse('Errore nell\'aggiornamento delle preferenze riepilogo email', 500));
  }
});

/**
 * @desc    Testa l'invio di un riepilogo email
 * @route   POST /api/summary-emails/test
 * @access  Private (Admin)
 */
exports.testSummaryEmail = asyncHandler(async (req, res, next) => {
  const { type, userId, email } = req.body;
  
  if (!type || !['weekly', 'monthly'].includes(type)) {
    return next(new ErrorResponse('Tipo richiesto: weekly o monthly', 400));
  }
  
  if (!userId && !email) {
    return next(new ErrorResponse('ID utente o email richiesti', 400));
  }
  
  console.log(`🧪 [SummaryEmailController] Test riepilogo email: ${type} per ${userId || email}`);
  
  try {
    let targetUserId = userId;
    
    // Se è fornita solo l'email, trova l'utente
    if (!userId && email) {
      const user = await User.findOne({ email: email.toLowerCase() }).select('_id');
      if (!user) {
        return next(new ErrorResponse('Utente non trovato con questa email', 404));
      }
      targetUserId = user._id;
    }
    
    // Calcola periodo
    let periodStart, periodEnd;
    if (type === 'weekly') {
      periodStart = summaryEmailJobs.getWeekStart();
      periodEnd = summaryEmailJobs.getWeekEnd();
    } else {
      periodStart = summaryEmailJobs.getMonthStart();
      periodEnd = summaryEmailJobs.getMonthEnd();
    }
    
    // Invia email di test
    let result;
    if (type === 'weekly') {
      result = await summaryEmailService.sendWeeklySummary(targetUserId, periodStart, periodEnd);
    } else {
      result = await summaryEmailService.sendMonthlySummary(targetUserId, periodStart, periodEnd);
    }
    
    if (result.success) {
      console.log(`✅ [SummaryEmailController] Test riepilogo ${type} completato per: ${result.email}`);
      
      res.status(200).json({
        success: true,
        message: `Test riepilogo ${type} completato con successo`,
        data: {
          type: type,
          userId: result.userId,
          email: result.email,
          periodStart: periodStart,
          periodEnd: periodEnd
        }
      });
    } else {
      console.log(`❌ [SummaryEmailController] Test riepilogo ${type} fallito: ${result.message}`);
      
      return next(new ErrorResponse(result.message, 400, null, result.code));
    }
    
  } catch (error) {
    console.error(`❌ [SummaryEmailController] Errore nel test riepilogo email:`, error);
    return next(new ErrorResponse(`Errore nel test del riepilogo ${type}`, 500));
  }
});
