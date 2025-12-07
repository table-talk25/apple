const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

const {
    getNotificationPreferences,
    updateNotificationPreferences,
    resetNotificationPreferences,
    checkNotificationPermission,
    testNotificationPreferences,
    getNotificationPreferencesStats,
    getUserNotificationPreferences,
    updateUserNotificationPreferences,
    hasCustomPreferences
} = require('../controllers/notificationPreferencesController');

// Route per utenti autenticati
router.use(protect);

// Route per preferenze utente corrente
router.route('/')
    .get(getNotificationPreferences)
    .put(updateNotificationPreferences);

// Route per reset preferenze
router.route('/reset')
    .post(resetNotificationPreferences);

// Route per verifica permessi
router.route('/check')
    .post(checkNotificationPermission);

// Route per test notifiche
router.route('/test')
    .post(testNotificationPreferences);

// Route per amministratori
router.use(authorize('admin'));

// Route per statistiche
router.route('/stats')
    .get(getNotificationPreferencesStats);

// Route per gestione utenti specifici
router.route('/:userId')
    .get(getUserNotificationPreferences)
    .put(updateUserNotificationPreferences);

// Route per verificare preferenze personalizzate
router.route('/:userId/custom')
    .get(hasCustomPreferences);

module.exports = router;
