const express = require('express');
const router = express.Router();

// Importa SOLO il controller buono
const { 
  getPersonalizedRecommendations, 
  trackMealInteraction,
  getUserPreferences,
  updateUserPreferences
} = require('../controllers/aiRecommendationController');

const { protect } = require('../middleware/auth');

router.get('/recommendations', protect, getPersonalizedRecommendations);
router.post('/interaction', protect, trackMealInteraction); // Nuovo endpoint pulito
router.get('/preferences', protect, getUserPreferences);
router.put('/preferences', protect, updateUserPreferences);

module.exports = router;
