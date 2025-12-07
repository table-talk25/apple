const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getGeoStats,
  getUserActivity,
  getMealAnalytics,
  getPopularEvents,
  trackEvent
} = require('../controllers/analyticsController');

// @route   GET /api/analytics/dashboard
// @desc    Ottieni statistiche dashboard
// @access  Private (Admin)
router.get('/dashboard', protect, authorize('admin'), getDashboardStats);

// @route   GET /api/analytics/geo
// @desc    Ottieni statistiche geografiche
// @access  Private (Admin)
router.get('/geo', protect, authorize('admin'), getGeoStats);

// @route   GET /api/analytics/user/:userId
// @desc    Ottieni attività utente
// @access  Private
router.get('/user/:userId', protect, getUserActivity);

// @route   GET /api/analytics/meal/:mealId
// @desc    Ottieni analytics per pasto
// @access  Private
router.get('/meal/:mealId', protect, getMealAnalytics);

// @route   GET /api/analytics/popular
// @desc    Ottieni eventi popolari
// @access  Private (Admin)
router.get('/popular', protect, authorize('admin'), getPopularEvents);

// @route   POST /api/analytics/track
// @desc    Traccia evento
// @access  Private
router.post('/track', protect, trackEvent);

module.exports = router;