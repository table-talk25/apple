// File: BACKEND/utils/geospatial.js

/**
 * Calcola la distanza tra due punti geografici usando la formula di Haversine.
 * @returns {number} Distanza in km.
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Raggio della Terra in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distanza in km
};

/**
 * Valida se le coordinate sono in un range geografico valido.
 * @returns {boolean}
 */
const validateCoordinates = (lat, lng) => {
  return !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180;
};

/**
 * Valida se il raggio è un numero positivo e entro un limite ragionevole.
 * @returns {boolean}
 */
const validateRadius = (radius) => {
  const radiusNum = parseFloat(radius);
  return !isNaN(radiusNum) && radiusNum > 0 && radiusNum <= 1000; // Max 1000 km
};

module.exports = {
  calculateDistance,
  validateCoordinates,
  validateRadius,
};
