const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

const {
    updateGeolocationSettings,
    getGeolocationSettings,
    testGeolocationNotifications,
    getServiceStats,
    executeJobManually,
    getJobStatus,
    updateJobConfig,
    testConnection
} = require('../controllers/geolocationController');

// Route per utenti autenticati
router.use(protect);

// Route per impostazioni utente
router.route('/settings')
    .get(getGeolocationSettings)
    .put(updateGeolocationSettings);

// Route per test notifiche
router.route('/test')
    .post(testGeolocationNotifications);

// Route per amministratori
router.use(authorize('admin'));

// Route per statistiche e gestione servizio
router.route('/stats')
    .get(getServiceStats);

router.route('/execute-job')
    .post(executeJobManually);

router.route('/job-status')
    .get(getJobStatus);

router.route('/job-config')
    .put(updateJobConfig);

router.route('/test-connection')
    .post(testConnection);

module.exports = router;
