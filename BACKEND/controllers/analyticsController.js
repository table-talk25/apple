const AnalyticsService = require('../services/analyticsService');
const asyncHandler = require('express-async-handler');

// @desc    Ottieni statistiche dashboard
// @route   GET /api/analytics/dashboard
// @access  Private (Admin)
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const { range = 'week' } = req.query;
  
  try {
    const stats = await AnalyticsService.getDashboardStats(range);
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('❌ Errore dashboard analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nel recupero delle statistiche' 
    });
  }
});

// @desc    Ottieni statistiche geografiche
// @route   GET /api/analytics/geo
// @access  Private (Admin)
exports.getGeoStats = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 50 } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ 
      success: false, 
      message: 'Coordinate lat e lng richieste' 
    });
  }
  
  try {
    const centerPoint = [parseFloat(lng), parseFloat(lat)];
    const geoStats = await AnalyticsService.getGeoStats(centerPoint, parseInt(radius));
    
    res.status(200).json(geoStats);
  } catch (error) {
    console.error('❌ Errore geo analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nel recupero delle statistiche geografiche' 
    });
  }
});

// @desc    Ottieni attività utente
// @route   GET /api/analytics/user/:userId
// @access  Private
exports.getUserActivity = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { range = 'week' } = req.query;
  
  // Verifica che l'utente possa accedere ai propri dati o sia admin
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Non autorizzato' 
    });
  }
  
  try {
    const userStats = await AnalyticsService.getUserActivity(userId, range);
    
    res.status(200).json(userStats);
  } catch (error) {
    console.error('❌ Errore user analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nel recupero delle statistiche utente' 
    });
  }
});

// @desc    Ottieni analytics per pasto
// @route   GET /api/analytics/meal/:mealId
// @access  Private
exports.getMealAnalytics = asyncHandler(async (req, res) => {
  const { mealId } = req.params;
  
  try {
    const mealStats = await AnalyticsService.getMealAnalytics(mealId);
    
    res.status(200).json(mealStats);
  } catch (error) {
    console.error('❌ Errore meal analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nel recupero delle statistiche pasto' 
    });
  }
});

// @desc    Ottieni eventi popolari
// @route   GET /api/analytics/popular
// @access  Private (Admin)
exports.getPopularEvents = asyncHandler(async (req, res) => {
  const { range = 'week', limit = 10 } = req.query;
  
  try {
    const popularEvents = await AnalyticsService.getPopularEvents(range, parseInt(limit));
    
    res.status(200).json(popularEvents);
  } catch (error) {
    console.error('❌ Errore popular events:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nel recupero degli eventi popolari' 
    });
  }
});

// @desc    Traccia evento
// @route   POST /api/analytics/track
// @access  Private
exports.trackEvent = asyncHandler(async (req, res) => {
  const { type, event, data = {} } = req.body;
  
  if (!type || !event) {
    return res.status(400).json({ 
      success: false, 
      message: 'Tipo ed evento sono richiesti' 
    });
  }
  
  try {
    // Aggiungi userId automaticamente se non fornito
    const trackingData = {
      ...data,
      userId: data.userId || req.user.id
    };
    
    await AnalyticsService.trackEvent(type, event, trackingData);
    
    res.status(200).json({ 
      success: true, 
      message: 'Evento tracciato con successo' 
    });
  } catch (error) {
    console.error('❌ Errore tracking evento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nel tracciamento dell\'evento' 
    });
  }
});