// BACKEND/services/aiRecommendationService.js
const UserPreference = require('../models/UserPreference');
const Meal = require('../models/Meal');

class SmartAIRecommendationService {
  
  // 🎯 MAIN RECOMMENDATION FUNCTION
  async getPersonalizedRecommendations(userId, userLocation, nearbyMeals, limit = 6) {
    try {
      console.log(`🤖 [SmartAI] Generating recommendations for user: ${userId}`);
      
      if (!nearbyMeals || nearbyMeals.length === 0) {
        console.log('⚠️ [SmartAI] No nearby meals found');
        return [];
      }

      // Get user preferences
      const userPrefs = await this.getUserPreferences(userId);
      
      // Smart scoring algorithm
      const scoredMeals = await Promise.all(
        nearbyMeals.map(meal => this.scoreMealForUser(meal, userPrefs, userId, userLocation))
      );
      
      // Sort by AI score and take top results
      const recommendations = scoredMeals
        .sort((a, b) => b.aiScore - a.aiScore)
        .slice(0, limit)
        .map((meal, index) => ({
          ...meal,
          aiRank: index + 1,
          aiProvider: 'smart-internal'
        }));
        
      console.log(`✅ [SmartAI] Generated ${recommendations.length} smart recommendations`);
      return recommendations;
      
    } catch (error) {
      console.error('❌ [SmartAI] Recommendation error:', error);
      return this.fallbackRecommendations(nearbyMeals, limit, userLocation);
    }
  }
  
  // 🧠 SMART SCORING ALGORITHM
  async scoreMealForUser(meal, userPrefs, userId, userLocation) {
    let totalScore = 0;
    const factors = {};
    
    // 🎯 TOPIC MATCH (30% weight) — il segnale piu' forte: matching
    // tra interessi utente e topic della conversazione del meal.
    const topicScore = await this.calculateTopicScore(meal, userId);
    totalScore += topicScore * 0.30;
    factors.topicMatch = topicScore;
    
    // ⏰ TIME COMPATIBILITY (20% weight)
    const timeScore = this.calculateTimeScore(meal, userPrefs);
    totalScore += timeScore * 0.20;
    factors.time = timeScore;
    
    // 💰 PRICE COMPATIBILITY (10% weight)
    const priceScore = this.calculatePriceScore(meal, userPrefs);
    totalScore += priceScore * 0.10;
    factors.price = priceScore;
    
    // 👥 SOCIAL COMPATIBILITY (20% weight)
    const socialScore = this.calculateSocialScore(meal, userPrefs);
    totalScore += socialScore * 0.20;
    factors.social = socialScore;
    
    // 📍 DISTANCE FACTOR (10% weight)
    const distanceScore = this.calculateDistanceScore(meal, userLocation, userPrefs);
    totalScore += distanceScore * 0.10;
    factors.distance = distanceScore;
    
    // 🔥 NOVELTY & POPULARITY BONUS (10% weight)
    const noveltyScore = await this.calculateNoveltyScore(meal, userId);
    totalScore += noveltyScore * 0.10;
    factors.novelty = noveltyScore;
    
    // Generate smart reason
    const aiReason = this.generateSmartReason(factors, meal);
    const aiCompatibility = Math.round(totalScore * 100);
    
    return {
      ...meal.toObject(),
      aiScore: Math.min(Math.max(totalScore, 0), 1), // Clamp 0-1
      aiReason,
      aiCompatibility,
      aiFactors: factors
    };
  }
  
  // 🎯 TOPIC SCORE: cosine-similarity-style match tra user.interests e meal.topics
  async calculateTopicScore(meal, userId) {
    try {
      const mealTopics = Array.isArray(meal.topics) ? meal.topics : [];
      if (mealTopics.length === 0) return 0.4; // neutro-basso: meal senza topic

      // Recupera interests dell'utente. Lazy-require per evitare cicli.
      const User = require('../models/User');
      const user = await User.findById(userId).select('interests');
      const interests = (user && Array.isArray(user.interests)) ? user.interests : [];

      if (interests.length === 0) return 0.5; // utente senza interests: neutro

      // Normalizza per match case-insensitive e trim
      const norm = (s) => String(s || '').trim().toLowerCase();
      const userSet = new Set(interests.map(norm).filter(Boolean));
      const mealSet = new Set(mealTopics.map(norm).filter(Boolean));

      // Jaccard similarity: |A ∩ B| / |A ∪ B|
      const intersection = [...mealSet].filter(t => userSet.has(t));
      const union = new Set([...userSet, ...mealSet]);
      if (union.size === 0) return 0.5;

      const jaccard = intersection.length / union.size;
      // Boost: anche un solo match dovrebbe valere qualcosa, non scendere mai sotto 0.3
      // se c'e' almeno un'intersezione
      if (intersection.length >= 1) {
        return Math.min(1, 0.3 + jaccard * 0.7);
      }
      return Math.max(0.1, jaccard);
    } catch (err) {
      console.error('❌ [SmartAI] Errore calculateTopicScore:', err);
      return 0.5;
    }
  }
  
  // ⏰ TIME SCORING
  calculateTimeScore(meal, userPrefs) {
    const mealDate = new Date(meal.date);
    const mealHour = mealDate.getHours();
    const currentHour = new Date().getHours();
    
    let timeSlot;
    if (mealHour >= 7 && mealHour < 10) timeSlot = 'breakfast';
    else if (mealHour >= 10 && mealHour < 12) timeSlot = 'brunch';
    else if (mealHour >= 12 && mealHour < 15) timeSlot = 'lunch';
    else if (mealHour >= 17 && mealHour < 19) timeSlot = 'aperitivo';
    else if (mealHour >= 19 && mealHour <= 23) timeSlot = 'dinner';
    else return 0.3; // Default score for odd hours
    
    const userTimeScore = userPrefs.timePreferences?.[timeSlot] || 0;
    const normalizedScore = (userTimeScore + 1) / 2;
    
    // Boost if meal is soon but not too soon
    const timeDiff = mealDate.getTime() - Date.now();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    let timeBoost = 0;
    if (hoursDiff >= 2 && hoursDiff <= 24) timeBoost = 0.1; // Perfect timing
    else if (hoursDiff >= 1 && hoursDiff <= 48) timeBoost = 0.05; // Good timing
    
    return Math.min(normalizedScore + timeBoost, 1);
  }
  
  // 💰 PRICE SCORING
  calculatePriceScore(meal, userPrefs) {
    const price = (meal.estimatedCost == null) ? 25 : Number(meal.estimatedCost);
    let priceRange;
    
    if (price <= 20) priceRange = 'budget';
    else if (price <= 40) priceRange = 'moderate';
    else priceRange = 'upscale';
    
    const userPriceScore = userPrefs.priceRange?.[priceRange] || 0;
    return (userPriceScore + 1) / 2;
  }
  
  // 👥 SOCIAL SCORING
  calculateSocialScore(meal, userPrefs) {
    const participantCount = meal.participants?.length || 0;
    const maxParticipants = meal.maxParticipants || 8;
    const availableSpots = maxParticipants - participantCount;
    
    // Boost meals with few spots left (urgency)
    let urgencyBoost = 0;
    if (availableSpots <= 2 && availableSpots > 0) urgencyBoost = 0.2;
    else if (availableSpots <= 4) urgencyBoost = 0.1;
    
    // Group size preference
    const groupPrefs = userPrefs.socialPreferences?.groupSize;
    let groupSizeScore = 0.5; // Default
    
    if (groupPrefs) {
      if (maxParticipants <= 4) groupSizeScore = ((groupPrefs.intimate ?? 0) + 1) / 2;
      else if (maxParticipants <= 8) groupSizeScore = ((groupPrefs.medium ?? 0) + 1) / 2;
      else groupSizeScore = ((groupPrefs.large ?? 0) + 1) / 2;
    }
    
    return Math.min(groupSizeScore + urgencyBoost, 1);
  }
  
  // 📍 DISTANCE SCORING
  calculateDistanceScore(meal, userLocation, userPrefs) {
    if (!meal.distanceKm && meal.location?.coordinates && userLocation) {
      // Calculate distance using Haversine formula
      const lat1 = userLocation.latitude;
      const lon1 = userLocation.longitude;
      const lat2 = meal.location.coordinates[1];
      const lon2 = meal.location.coordinates[0];
      
      const R = 6371; // Earth's radius in km
      const dLat = this.toRad(lat2 - lat1);
      const dLon = this.toRad(lon2 - lon1);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      meal.distanceKm = R * c;
    }
    
    const distance = meal.distanceKm || 5;
    const maxDistance = userPrefs.locationPreferences?.maxDistance || 10;
    
    if (distance > maxDistance) return 0.2;
    
    // Perfect score for very close meals
    if (distance <= 1) return 1.0;
    if (distance <= 3) return 0.9;
    
    return Math.max(0.2, 1 - (distance / maxDistance));
  }
  
  // 🔥 NOVELTY & POPULARITY SCORING
  async calculateNoveltyScore(meal, userId) {
    try {
      // Check if user has been to this restaurant before
      const visitHistory = await Meal.countDocuments({
        $or: [
          { host: userId },
          { participants: userId }
        ],
        'location.address': meal.location?.address,
        _id: { $ne: meal._id }
      });
      
      // Boost for new places
      const noveltyScore = visitHistory === 0 ? 0.8 : Math.max(0.2, 0.8 - (visitHistory * 0.1));
      
      // Boost for popular restaurants (many past events)
      const popularityCount = await Meal.countDocuments({
        'location.address': meal.location?.address,
        status: { $in: ['completed', 'ongoing'] }
      });
      
      const popularityScore = Math.min(0.3, popularityCount * 0.05);
      
      return Math.min(noveltyScore + popularityScore, 1);
      
    } catch (error) {
      return 0.5; // Default score on error
    }
  }
  
  // 💭 GENERATE SMART REASON
  generateSmartReason(factors, meal) {
    // Find the top 2 factors
    const sortedFactors = Object.entries(factors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2);
    
    const reasonMap = {
      topicMatch: ['Argomenti che ti interessano', 'Topic perfetti per te', 'Conversazione nelle tue corde'],
      time: ['Orario ideale per te', 'Timing perfetto', 'Momento giusto'],
      price: ['Prezzo conveniente', 'Ottimo rapporto qualità-prezzo', 'Nel tuo budget'],
      social: ['Gruppo della tua dimensione', 'Atmosfera sociale giusta', 'Compagnia perfetta'],
      distance: ['Vicinissimo a te', 'Zona comoda', 'Facile da raggiungere'],
      novelty: ['Posto nuovo da scoprire', 'Esperienza originale', 'Location interessante']
    };
    
    const reasons = sortedFactors.map(([factor]) => {
      const options = reasonMap[factor] || ['Consigliato per te'];
      return options[Math.floor(Math.random() * options.length)];
    });
    
    // Add urgency if few spots left
    const availableSpots = (meal.maxParticipants || 8) - (meal.participants?.length || 0);
    if (availableSpots <= 2) {
      reasons.unshift(`Solo ${availableSpots} posti rimasti`);
    }
    
    return reasons.slice(0, 2).join(' • ');
  }
  
  // 🧮 HELPER: Degrees to Radians
  toRad(value) {
    return value * Math.PI / 180;
  }
  
  // 📊 GET OR CREATE USER PREFERENCES  
  async getUserPreferences(userId) {
    try {
      let prefs = await UserPreference.findOne({ userId });
      
      if (!prefs) {
        prefs = new UserPreference({ 
          userId,
          cuisinePreferences: {
            italian: 0.6,
            japanese: 0.1,
            mexican: 0,
            indian: 0.1,
            chinese: 0.1,
            mediterranean: 0.4,
            american: 0,
            vegetarian: 0.2,
            vegan: 0.1
          },
          timePreferences: {
            breakfast: 0.1,
            lunch: 0.4,
            aperitivo: 0.3,
            dinner: 0.6
          },
          priceRange: {
            budget: 0.4,
            moderate: 0.6,
            upscale: 0.2
          },
          socialPreferences: {
            groupSize: {
              intimate: 0.6,
              medium: 0.4,
              large: 0.1
            }
          },
          locationPreferences: {
            maxDistance: 15
          },
          activityScores: {
            totalMeals: 0,
            totalHosts: 0,
            totalJoins: 0
          }
        });
        
        await prefs.save();
        console.log(`📊 [SmartAI] Created smart preferences for user: ${userId}`);
      }
      
      return prefs;
      
    } catch (error) {
      console.error('❌ [SmartAI] Error getting preferences:', error);
      return this.getDefaultPreferences(userId);
    }
  }
  
  // 🎯 DEFAULT PREFERENCES
  getDefaultPreferences(userId) {
    return {
      userId,
      cuisinePreferences: { italian: 0.6, mediterranean: 0.4 },
      timePreferences: { lunch: 0.4, dinner: 0.6 },
      priceRange: { budget: 0.4, moderate: 0.6, upscale: 0.2 },
      socialPreferences: { groupSize: { intimate: 0.6, medium: 0.4, large: 0.1 } },
      locationPreferences: { maxDistance: 15 }
    };
  }
  
  // 🛡️ FALLBACK RECOMMENDATIONS (basato sulla distanza)
  fallbackRecommendations(meals, limit, userLocation = null) {
    console.log('🔄 [SmartAI] Using distance-based fallback logic');
    
    // Se non abbiamo la posizione, restituiamo i pasti così come sono
    if (!userLocation || !userLocation.coordinates) {
      return meals.slice(0, limit).map((meal, index) => ({
        ...meal.toObject(),
        aiScore: 0.5,
        aiRank: index + 1,
        aiReason: 'Disponibile nella tua zona',
        aiProvider: 'basic-distance',
        aiCompatibility: 50
      }));
    }
    
    // Calcola distanza e punteggio per ogni pasto
    const mealsWithDistance = meals.map(meal => {
      let distanceKm = meal.distanceKm;
      
      // Calcola distanza se non presente
      if (!distanceKm && meal.location?.coordinates && userLocation.coordinates) {
        const lat1 = userLocation.coordinates[1] || userLocation.latitude;
        const lon1 = userLocation.coordinates[0] || userLocation.longitude;
        const lat2 = meal.location.coordinates[1];
        const lon2 = meal.location.coordinates[0];
        
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distanceKm = R * c;
      }
      
      // Punteggio basato sulla distanza (più vicino = punteggio più alto)
      // Distanza 0-1km = 1.0, 1-3km = 0.9, 3-5km = 0.8, 5-10km = 0.6, >10km = 0.4
      let distanceScore = 0.5; // Default
      if (distanceKm <= 1) distanceScore = 1.0;
      else if (distanceKm <= 3) distanceScore = 0.9;
      else if (distanceKm <= 5) distanceScore = 0.8;
      else if (distanceKm <= 10) distanceScore = 0.6;
      else distanceScore = 0.4;
      
      return {
        ...meal.toObject(),
        distanceKm: distanceKm || 999,
        aiScore: distanceScore,
        aiCompatibility: Math.round(distanceScore * 100)
      };
    });
    
    // Ordina per distanza (più vicini prima)
    const sorted = mealsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    
    // Prendi i primi 'limit' e aggiungi rank e reason
    return sorted.slice(0, limit).map((meal, index) => ({
      ...meal,
      aiRank: index + 1,
      aiReason: meal.distanceKm <= 3 
        ? 'Vicinissimo a te' 
        : meal.distanceKm <= 10 
          ? 'Nella tua zona' 
          : 'Disponibile nelle vicinanze',
      aiProvider: 'basic-distance'
    }));
  }
}

module.exports = new SmartAIRecommendationService();
