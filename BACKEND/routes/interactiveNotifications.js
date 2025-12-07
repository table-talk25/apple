const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
    handleNotificationAction,
    testInteractiveNotification,
    getNotificationConfig,
    getSupportedTypes,
    executeActionImmediately
} = require('../controllers/interactiveNotificationController');

// Tutte le route richiedono autenticazione
router.use(protect);

// Route per gestione azioni notifiche
router.route('/action')
    .post(handleNotificationAction);

// Route per test notifiche
router.route('/test')
    .post(testInteractiveNotification);

// Route per configurazione
router.route('/config/:type')
    .get(getNotificationConfig);

// Route per tipi supportati
router.route('/types')
    .get(getSupportedTypes);

// Route per esecuzione immediata azioni
router.route('/execute-action')
    .post(executeActionImmediately);

module.exports = router;
