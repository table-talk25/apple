// File: BACKEND/routes/summaryEmails.js
// 📧 ROUTE PER EMAIL DI RIEPILOGO
// 
// Questo file definisce tutte le route per la gestione delle email di riepilogo:
// - Invio manuale di riepiloghi
// - Gestione delle preferenze utente
// - Statistiche e monitoraggio
// - Controllo dei job schedulati

const express = require('express');
const router = express.Router();
const summaryEmailController = require('../controllers/summaryEmailController');

// Middleware di autenticazione e autorizzazione
const { protect, authorize } = require('../middleware/auth');

// ========================================
// ROUTE PER INVIO MANUALE DI RIEPILOGHI
// ========================================

// Riepilogo settimanale per un singolo utente (solo admin)
router.post('/weekly/:userId', 
  protect, 
  authorize('admin'), 
  summaryEmailController.sendWeeklySummary
);

// Riepilogo mensile per un singolo utente (solo admin)
router.post('/monthly/:userId', 
  protect, 
  authorize('admin'), 
  summaryEmailController.sendMonthlySummary
);

// Riepilogo settimanale per tutti gli utenti attivi (solo admin)
router.post('/weekly-all', 
  protect, 
  authorize('admin'), 
  summaryEmailController.sendWeeklySummaryToAll
);

// Riepilogo mensile per tutti gli utenti attivi (solo admin)
router.post('/monthly-all', 
  protect, 
  authorize('admin'), 
  summaryEmailController.sendMonthlySummaryToAll
);

// ========================================
// ROUTE PER STATISTICHE E MONITORAGGIO
// ========================================

// Statistiche dei job di riepilogo email (solo admin)
router.get('/stats', 
  protect, 
  authorize('admin'), 
  summaryEmailController.getSummaryEmailStats
);

// Stato dei job di riepilogo email (solo admin)
router.get('/status', 
  protect, 
  authorize('admin'), 
  summaryEmailController.getSummaryEmailStatus
);

// ========================================
// ROUTE PER CONFIGURAZIONE E CONTROLLO
// ========================================

// Aggiorna configurazione dei job (solo admin)
router.put('/config', 
  protect, 
  authorize('admin'), 
  summaryEmailController.updateSummaryEmailConfig
);

// Controlla avvio/fermata dei job (solo admin)
router.post('/control', 
  protect, 
  authorize('admin'), 
  summaryEmailController.controlSummaryEmailJobs
);

// ========================================
// ROUTE PER GESTIONE PREFERENZE UTENTE
// ========================================

// Ottieni preferenze riepilogo email per un utente
// - Admin può vedere preferenze di qualsiasi utente
// - Utente può vedere solo le proprie preferenze
router.get('/preferences/:userId', 
  protect, 
  summaryEmailController.getSummaryEmailPreferences
);

// Aggiorna preferenze riepilogo email per un utente
// - Admin può modificare preferenze di qualsiasi utente
// - Utente può modificare solo le proprie preferenze
router.put('/preferences/:userId', 
  protect, 
  summaryEmailController.updateSummaryEmailPreferences
);

// ========================================
// ROUTE PER TEST E DEBUG
// ========================================

// Test invio riepilogo email (solo admin)
router.post('/test', 
  protect, 
  authorize('admin'), 
  summaryEmailController.testSummaryEmail
);

// ========================================
// ROUTE PER DOCUMENTAZIONE E INFO
// ========================================

// Informazioni sui tipi di riepilogo disponibili
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'Informazioni sui riepiloghi email disponibili',
    data: {
      types: {
        weekly: {
          description: 'Riepilogo settimanale delle attività',
          schedule: 'Ogni lunedì alle 9:00',
          content: [
            'Statistiche della settimana',
            'Pasti recenti e imminenti',
            'Nuove connessioni',
            'Inviti in attesa',
            'Fatti divertenti'
          ]
        },
        monthly: {
          description: 'Riepilogo mensile completo',
          schedule: 'Primo del mese alle 10:00',
          content: [
            'Statistiche del mese',
            'Confronto con mese precedente',
            'Achievement e milestone',
            'Top pasti del mese',
            'Crescita sociale',
            'Anteprima prossimo mese'
          ]
        }
      },
      features: [
        'Personalizzazione per ogni utente',
        'Gestione preferenze email',
        'Invio in batch per performance',
        'Logging completo per audit',
        'Configurazione flessibile',
        'Controllo manuale per admin'
      ],
      configuration: {
        environmentVariables: [
          'ENABLE_WEEKLY_SUMMARY',
          'ENABLE_MONTHLY_SUMMARY',
          'WEEKLY_SUMMARY_SCHEDULE',
          'MONTHLY_SUMMARY_SCHEDULE',
          'SUMMARY_EMAILS_BATCH_SIZE',
          'SUMMARY_EMAILS_BATCH_DELAY'
        ],
        defaultSchedules: {
          weekly: '0 9 * * 1', // Lunedì alle 9:00
          monthly: '0 10 1 * *' // Primo del mese alle 10:00
        }
      }
    }
  });
});

// ========================================
// ROUTE PER HEALTH CHECK
// ========================================

// Health check dei job di riepilogo email
router.get('/health', (req, res) => {
  try {
    const summaryEmailJobs = require('../jobs/summaryEmailJobs');
    const status = summaryEmailJobs.getStatus();
    
    res.json({
      success: true,
      message: 'Health check riepilogo email completato',
      data: {
        timestamp: new Date().toISOString(),
        status: status,
        isHealthy: status.isRunning && 
                  (status.weeklyJob === 'Running' || status.weeklyJob === 'Stopped') &&
                  (status.monthlyJob === 'Running' || status.monthlyJob === 'Stopped')
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Errore nel health check riepilogo email',
      error: error.message
    });
  }
});

module.exports = router;
