// File: BACKEND/routes/videoCall.js (Versione Semplificata e Sicura)

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth'); // Assumendo che questo sia il percorso corretto
const { getVideoToken } = require('../controllers/videoCallController');

/**
 * @desc    Ottieni token per videochiamata
 * @route   GET /api/video/token/:mealId
 * @access  Private
 */
router.route('/token/:mealId').get(protect, getVideoToken);

module.exports = router;