// File: frontend/client/src/services/profileService.js (Versione Corretta)

import apiClient from './apiService';

const getProfile = async () => {
  try {
    console.log('[ProfileService] Caricamento profilo...');
    const response = await apiClient.get('/profile/me', { suppressErrorAlert: true });
    console.log('[ProfileService] Risposta ricevuta:', {
      status: response.status,
      hasData: !!response.data,
      hasNestedData: !!response.data?.data,
      dataKeys: response.data ? Object.keys(response.data) : []
    });
    
    if (!response.data) {
      console.error('[ProfileService] ❌ Risposta senza data');
      throw new Error('Risposta del server non valida');
    }
    
    if (!response.data.data) {
      console.error('[ProfileService] ❌ Risposta senza data.data:', response.data);
      return response.data;
    }
    
    console.log('[ProfileService] ✅ Profilo caricato con successo');
    return response.data.data;
  } catch (error) {
    console.error('[ProfileService] ❌ Errore nel caricamento profilo:', {
      message: error.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      url: error?.config?.url
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
  const response = await apiClient.delete('/profile/me', {
    data: { password }
  });
  return response.data;
};

const getFullImageUrl = (imageName) => {
  console.log('🖼️ [ProfileService] getFullImageUrl called with:', imageName);

  // URL Firebase completo: restituiscilo così com'è (niente timestamp)
  if (imageName && imageName.includes('storage.googleapis.com')) {
    console.log('🖼️ [ProfileService] Using Firebase URL:', imageName);
    return imageName;
  }

  if (!imageName || imageName === 'null' || imageName === 'undefined' || imageName.includes('default-avatar.jpg')) {
    const baseUrl = (apiClient.defaults.baseURL || '').replace('/api', '');
    const defaultUrl = `${baseUrl}/uploads/profile-images/default-avatar.jpg`;
    console.log('🖼️ [ProfileService] Using default avatar:', defaultUrl);
    return defaultUrl;
  }

  // Immagine locale backend: URL stabile, SENZA ?t=timestamp
  // (il timestamp causava un nuovo fetch ad ogni render, loop di ricaricamento)
  const baseUrl = (apiClient.defaults.baseURL || '').replace('/api', '');
  const fullUrl = `${baseUrl}/${imageName}`;
  console.log('🖼️ [ProfileService] Using custom avatar:', fullUrl);
  return fullUrl;
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