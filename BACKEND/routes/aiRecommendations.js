const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPersonalizedRecommendations,
  getUserPreferences,
  updateUserPreferences,
  getRecommendationInsights,
  resetPreferences,
  trackMealInteraction
} = require('../controllers/aiRecommendationController');

// ===== RACCOMANDAZIONI AI =====

// @route   POST /api/ai/recommendations
// @desc    Ottieni raccomandazioni personalizzate AI
// @access  Private
router.post('/recommendations', protect, getPersonalizedRecommendations);

// @route   GET /api/ai/preferences
// @desc    Ottieni le preferenze dell'utente
// @access  Private
router.get('/preferences', protect, getUserPreferences);

// @route   PUT /api/ai/preferences
// @desc    Aggiorna le preferenze dell'utente
// @access  Private
router.put('/preferences', protect, updateUserPreferences);

// @route   GET /api/ai/insights
// @desc    Ottieni insights sulle raccomandazioni
// @access  Private
router.get('/insights', protect, getRecommendationInsights);

// @route   DELETE /api/ai/preferences
// @desc    Ripristina le preferenze ai valori di default
// @access  Private
router.delete('/preferences', protect, resetPreferences);

// @route   POST /api/ai/track
// @desc    Registra un'interazione per l'apprendimento
// @access  Private
router.post('/track', protect, trackMealInteraction);

module.exports = router;
