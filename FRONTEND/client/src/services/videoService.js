// File: FRONTEND/client/src/services/videoService.js (Corretto)

import apiClient from './apiService'; // <-- USA L'API CLIENT UNIFICATO

const getToken = async (mealId) => {
  const response = await apiClient.get(`/video/token/${mealId}`);
  return response.data;
};

// Manteniamo getTwilioToken per retrocompatibilità
const getTwilioToken = async (mealId) => {
  return getToken(mealId);
};

// Funzione per permettere all'host di terminare la chiamata per tutti
const endCall = async (mealId) => {
  const response = await apiClient.post(`/video/meals/${mealId}/end`);
  return response.data;
};

const videoService = {
  getToken,
  getTwilioToken, // Mantenuto per retrocompatibilità
  endCall,
};

export default videoService;