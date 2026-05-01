const asyncHandler = require('express-async-handler');
const aiRecommendationService = require('../services/aiRecommendationService');
const UserPreference = require('../models/UserPreference');
const mealService = require('../services/mealService');

// 🎯 GET PERSONALIZED RECOMMENDATIONS
exports.getPersonalizedRecommendations = asyncHandler(async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) ? String(req.user._id || req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Utente non autenticato' });
    }
    const { limit = 6, radius = 15 } = req.query;
    
    console.log(`🤖 [AI Controller] Getting recommendations for user: ${userId}`);
    
    let userLocation = null;

    // 1) Query params (formato frontend)
    const qLat = parseFloat(req.query.latitude);
    const qLng = parseFloat(req.query.longitude);
    if (!Number.isNaN(qLat) && !Number.isNaN(qLng)) {
      userLocation = {
        latitude: qLat,
        longitude: qLng,
        coordinates: [qLng, qLat], // GeoJSON ordering per uniformita'
      };
    }

    // 2) Body (back-compat)
    if (!userLocation && req.body && req.body.userLocation) {
      const b = req.body.userLocation;
      if (b.coordinates && Array.isArray(b.coordinates) && b.coordinates.length === 2) {
        userLocation = {
          latitude: b.coordinates[1],
          longitude: b.coordinates[0],
          coordinates: b.coordinates,
        };
      } else if (b.latitude != null && b.longitude != null) {
        userLocation = {
          latitude: Number(b.latitude),
          longitude: Number(b.longitude),
          coordinates: [Number(b.longitude), Number(b.latitude)],
        };
      }
    }

    // 3) Fallback profilo
    if (!userLocation && req.user.location && Array.isArray(req.user.location.coordinates) && req.user.location.coordinates.length === 2) {
      const c = req.user.location.coordinates;
      userLocation = {
        latitude: c[1],
        longitude: c[0],
        coordinates: c,
      };
    }

    if (!userLocation) {
      return res.status(400).json({
        success: false,
        message: 'Posizione utente richiesta per le raccomandazioni'
      });
    }
    
    // Get nearby meals using existing service
    const nearbyMealsResult = await mealService.getMealsForMap(
      userLocation.coordinates,
      parseInt(radius),
      {
        mealType: 'physical',
        status: 'upcoming,ongoing'
      }
    );
    
    // Il servizio restituisce {success, count, data, searchParams}
    const nearbyMeals = nearbyMealsResult.data || [];
    
    if (!nearbyMeals || nearbyMeals.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'Nessun pasto trovato nelle vicinanze'
      });
    }
    
    // Get AI recommendations
    const recommendations = await aiRecommendationService.getPersonalizedRecommendations(
      userId,
      userLocation,
      nearbyMeals,
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: recommendations,
      meta: {
        totalFound: nearbyMeals.length,
        recommended: recommendations.length,
        radius: parseInt(radius),
        aiProvider: 'smart-internal'
      }
    });
    
  } catch (error) {
    console.error('❌ [AI Controller] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel generare le raccomandazioni',
      error: error.message
    });
  }
});

// 📊 GET USER PREFERENCES
exports.getUserPreferences = asyncHandler(async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) ? String(req.user._id || req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Utente non autenticato' });
    }
    
    const preferences = await UserPreference.findOne({ userId });
    
    if (!preferences) {
      // Create default preferences
      const defaultPrefs = await aiRecommendationService.getUserPreferences(userId);
      return res.json({
        success: true,
        data: defaultPrefs,
        message: 'Preferenze di default create'
      });
    }
    
    res.json({
      success: true,
      data: preferences
    });
    
  } catch (error) {
    console.error('❌ [AI Controller] Error getting preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare le preferenze',
      error: error.message
    });
  }
});

// 🔄 UPDATE USER PREFERENCES
exports.updateUserPreferences = asyncHandler(async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) ? String(req.user._id || req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Utente non autenticato' });
    }
    const updates = req.body;
    
    console.log(`🔄 [AI Controller] Updating preferences for user: ${userId}`);
    
    // Remove fields that shouldn't be updated directly
    delete updates.userId;
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    
    const preferences = await UserPreference.findOneAndUpdate(
      { userId },
      { 
        ...updates,
        lastUpdated: new Date()
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );
    
    res.json({
      success: true,
      data: preferences,
      message: 'Preferenze aggiornate con successo'
    });
    
  } catch (error) {
    console.error('❌ [AI Controller] Error updating preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento delle preferenze',
      error: error.message
    });
  }
});

// 🎯 GET RECOMMENDATION INSIGHTS
exports.getRecommendationInsights = asyncHandler(async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) ? String(req.user._id || req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Utente non autenticato' });
    }
    
    const preferences = await UserPreference.findOne({ userId });
    
    if (!preferences) {
      return res.json({
        success: true,
        data: {
          hasPreferences: false,
          message: 'Nessuna preferenza configurata'
        }
      });
    }
    
    // Generate insights based on preferences
    const insights = {
      hasPreferences: true,
      topCuisines: Object.entries(preferences.cuisinePreferences)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([cuisine, score]) => ({ cuisine, score: Math.round(score * 100) })),
      
      preferredTimeSlots: Object.entries(preferences.timePreferences)
        .sort(([,a], [,b]) => b - a)
        .map(([time, score]) => ({ time, score: Math.round(score * 100) })),
      
      pricePreference: Object.entries(preferences.priceRange)
        .sort(([,a], [,b]) => b - a)[0],
      
      socialPreference: preferences.socialPreferences?.groupSize ? 
        Object.entries(preferences.socialPreferences.groupSize)
          .sort(([,a], [,b]) => b - a)[0] : null,
      
      activityStats: preferences.activityScores,
      
      lastUpdated: preferences.lastUpdated,
      learningEnabled: preferences.learningEnabled
    };
    
    res.json({
      success: true,
      data: insights
    });
    
  } catch (error) {
    console.error('❌ [AI Controller] Error getting insights:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare le informazioni',
      error: error.message
    });
  }
});

// 🔄 RESET PREFERENCES
exports.resetPreferences = asyncHandler(async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) ? String(req.user._id || req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Utente non autenticato' });
    }
    
    await UserPreference.findOneAndDelete({ userId });
    
    // Create fresh default preferences
    const newPreferences = await aiRecommendationService.getUserPreferences(userId);
    
    res.json({
      success: true,
      data: newPreferences,
      message: 'Preferenze ripristinate ai valori di default'
    });
    
  } catch (error) {
    console.error('❌ [AI Controller] Error resetting preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel ripristino delle preferenze',
      error: error.message
    });
  }
});

// 📈 TRACK MEAL INTERACTION (for learning)
exports.trackMealInteraction = asyncHandler(async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id)) ? String(req.user._id || req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Utente non autenticato' });
    }
    const { mealId, interactionType, mealData } = req.body;
    
    // Valid interaction types
    const validTypes = ['viewed', 'joined', 'created', 'declined', 'favorited'];
    
    if (!validTypes.includes(interactionType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo di interazione non valido'
      });
    }
    
    // Update preferences based on interaction
    const preferences = await UserPreference.findOne({ userId });
    
    if (preferences && preferences.learningEnabled) {
      await preferences.updateFromActivity(interactionType, mealData);
    }
    
    res.json({
      success: true,
      message: 'Interazione registrata per l\'apprendimento'
    });
    
  } catch (error) {
    console.error('❌ [AI Controller] Error tracking interaction:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel registrare l\'interazione',
      error: error.message
    });
  }
});
