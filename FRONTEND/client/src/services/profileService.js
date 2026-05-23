// File: frontend/client/src/services/profileService.js

import apiClient from './apiService';

const DEFAULT_AVATAR = 'https://storage.googleapis.com/tabletalk-social.firebasestorage.app/profile-images/default-avatar.jpg';

const getProfile = async () => {
  try {
    const response = await apiClient.get('/profile/me', { suppressErrorAlert: true });
    if (!response.data) throw new Error('Risposta del server non valida');
    if (!response.data.data) return response.data;
    return response.data.data;
  } catch (error) {
    console.error('[ProfileService] ❌ Errore nel caricamento profilo:', {
      message: error.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    throw error;
  }
};

const getPublicProfileById = async (userId) => {
  const response = await apiClient.get(`/profile/public/${userId}`);
  return response.data.data;
};

const updateProfile = async (profileData) => {
  const response = await apiClient.put('/profile/me', profileData, { suppressErrorAlert: true });
  return response.data.data;
};

const updateProfileImage = async (formData) => {
  const response = await apiClient.put('/profile/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    suppressErrorAlert: true,
  });
  return response.data.data;
};

const deleteAccount = async (password) => {
  const response = await apiClient.delete('/profile/me', { data: { password } });
  return response.data;
};

/**
 * Restituisce l'URL completo dell'immagine profilo.
 * - URL Firebase (https://...) → restituito invariato
 * - null / undefined / "null" / "undefined" / qualsiasi path relativo con "default-avatar" → DEFAULT_AVATAR costante
 * - Path relativo locale (es. "uploads/profile-images/abc.jpg") → baseUrl + path
 */
const getFullImageUrl = (imageName) => {
  // Casi invalidi → avatar di default statico (nessuna chiamata al backend)
  if (
    !imageName ||
    imageName === 'null' ||
    imageName === 'undefined' ||
    imageName.includes('default-avatar')
  ) {
    return DEFAULT_AVATAR;
  }

  // URL assoluto (Firebase o altro CDN) → usalo direttamente
  if (imageName.startsWith('http://') || imageName.startsWith('https://')) {
    return imageName;
  }

  // Path relativo locale → costruisci URL dal backend (senza /api)
  const baseUrl = (apiClient.defaults.baseURL || '').replace('/api', '');
  return `${baseUrl}/${imageName}`;
};

const updateUserLocation = async (locationData) => {
  const response = await apiClient.put('/users/me/location', locationData);
  return response.data;
};

const getNearbyUsers = async (params) => {
  const response = await apiClient.get('/users/nearby', { params });
  return response.data.data;
};

const updateLocationFromCoords = async (locationData) => {
  const response = await apiClient.put('/users/me/location-from-coords', locationData);
  return response.data.data;
};

const removeUserLocation = async () => {
  const response = await apiClient.delete('/users/me/location');
  return response.data;
};

const profileService = {
  getProfile,
  getPublicProfileById,
  updateProfile,
  updateProfileImage,
  deleteAccount,
  getFullImageUrl,
  updateUserLocation,
  getNearbyUsers,
  updateLocationFromCoords,
  removeUserLocation,
};

export default profileService;
