const Meal = require('../models/Meal');
const User = require('../models/User');

// Helper functions per validazione e calcolo distanza
const validateCoordinates = (lat, lng) => {
  return !isNaN(lat) && !isNaN(lng) && 
         lat >= -90 && lat <= 90 && 
         lng >= -180 && lng <= 180;
};

const validateRadius = (radius) => {
  const radiusNum = parseFloat(radius);
  return !isNaN(radiusNum) && radiusNum > 0 && radiusNum <= 1000;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raggio della Terra in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distanza in km
};

const normalizeMealLocation = (meal) => {
  if (meal && meal.location) {
    if (Array.isArray(meal.location.coordinates) && meal.location.coordinates.length === 2) {
      return meal;
    } else if (meal.location.latitude && meal.location.longitude) {
      return {
        ...meal,
        location: {
          ...meal.location,
          coordinates: [meal.location.longitude, meal.location.latitude],
          latitude: undefined,
          longitude: undefined
        }
      };
    } else {
      return {
        ...meal,
        location: {
          ...meal.location,
          coordinates: undefined
        }
      };
    }
  }
  return meal;
};

/**
 * Ottiene i pasti entro un certo raggio per la mappa
 * @param {Array} coordinates - [longitude, latitude] o {latitude, longitude}
 * @param {number} radiusKm - Raggio in km
 * @param {Object} filters - Filtri opzionali {mealType, status}
 * @returns {Promise<Object>} - {data: Array, count: number}
 */
const getMealsForMap = async (coordinates, radiusKm, filters = {}) => {
  try {
    // Normalizza le coordinate
    let latitude, longitude;
    if (Array.isArray(coordinates)) {
      [longitude, latitude] = coordinates;
    } else if (coordinates.latitude && coordinates.longitude) {
      latitude = coordinates.latitude;
      longitude = coordinates.longitude;
    } else if (coordinates.coordinates && Array.isArray(coordinates.coordinates)) {
      [longitude, latitude] = coordinates.coordinates;
    } else {
      throw new Error('Coordinate non valide');
    }

    if (!validateCoordinates(latitude, longitude)) {
      throw new Error('Coordinate non valide. Lat: -90 a 90, Lng: -180 a 180');
    }

    if (!validateRadius(radiusKm)) {
      throw new Error('Raggio non valido. Deve essere tra 0 e 1000 km');
    }

    const radiusInRad = radiusKm / 6371;

    const baseQuery = {
      mealType: filters.mealType || 'physical',
      status: { $in: (filters.status || 'upcoming,ongoing').split(',') },
      'location.coordinates': { $exists: true, $ne: null }
    };

    const geoQuery = {
      ...baseQuery,
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInRad]
        }
      }
    };

    const meals = await Meal.find(geoQuery)
      .select('_id title description date duration mealType location host maxParticipants participants status imageUrl topics estimatedCost')
      .populate('host', 'nickname profileImage')
      .lean()
      .exec();

    const mealsWithDistance = meals.map(meal => {
      const mealData = normalizeMealLocation(meal);
      
      if (mealData.location && mealData.location.coordinates) {
        const [mealLng, mealLat] = mealData.location.coordinates;
        const distance = calculateDistance(latitude, longitude, mealLat, mealLng);
        
        return {
          ...mealData,
          distanceKm: Math.round(distance * 100) / 100,
          distance: Math.round(distance * 100) / 100,
          distanceFormatted: `${Math.round(distance * 100) / 100} km`
        };
      }
      
      return mealData;
    });

    mealsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    return {
      success: true,
      count: mealsWithDistance.length,
      data: mealsWithDistance,
      searchParams: {
        center: { lat: latitude, lng: longitude },
        radius: radiusKm,
        mealType: filters.mealType || 'physical',
        status: filters.status || 'upcoming,ongoing'
      }
    };
  } catch (error) {
    console.error('❌ [MealService] Errore in getMealsForMap:', error);
    throw error;
  }
};

module.exports = {
  getMealsForMap,
  calculateDistance,
  validateCoordinates,
  validateRadius,
  normalizeMealLocation
};

