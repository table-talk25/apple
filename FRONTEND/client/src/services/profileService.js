// File: frontend/client/src/services/profileService.js (Versione Corretta)

import apiClient from './apiService';

const getProfile = async () => {
  try {
    console.log('[ProfileService] Caricamento profilo...');
    // CORRETTO: Rimosso /api dall'inizio
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
      // Prova a restituire response.data se non c'è data.data
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
  // CORRETTO: Rimosso /api dall'inizio
  const response = await apiClient.get(`/profile/public/${userId}`);
  return response.data.data;
};

const updateProfile = async (profileData) => {
  // Evita dialog di "errore di rete" globali: gestiamo noi a livello di UI
  const response = await apiClient.put('/profile/me', profileData, { suppressErrorAlert: true });
  return response.data.data;
};

const updateProfileImage = async (formData) => {
  // Evita dialog di "errore di rete" globali su upload immagine
  const response = await apiClient.put('/profile/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    suppressErrorAlert: true,
  });
  return response.data.data;
};

const deleteAccount = async (password) => {
  // CORRETTO: Rimosso /api dall'inizio
  const response = await apiClient.delete('/profile/me', {
    data: { password }
  });
  return response.data;
};

const getFullImageUrl = (imageName) => {
  console.log('🖼️ [ProfileService] getFullImageUrl called with:', imageName);

  // ✅ NUOVO: Se l'URL è già un URL Firebase completo, restituiscilo così com'è
  if (imageName && imageName.includes('storage.googleapis.com')) {
    console.log('🖼️ [ProfileService] Using Firebase URL:', imageName);
    return imageName;
  }

  if (!imageName || imageName === 'null' || imageName === 'undefined' || imageName.includes('default-avatar.jpg')) {
    // Per l'immagine di default, usa l'URL completo del backend
    const baseUrl = (apiClient.defaults.baseURL || '').replace('/api', '');
    const defaultUrl = `${baseUrl}/uploads/profile-images/default-avatar.jpg`;
    console.log('🖼️ [ProfileService] Using default avatar:', defaultUrl);
    return defaultUrl;
  }
  // Per le immagini caricate localmente, usa l'URL completo del backend
  const baseUrl = (apiClient.defaults.baseURL || '').replace('/api', '');
  // Aggiungi timestamp per forzare il refresh dell'immagine
  const timestamp = new Date().getTime();
  const fullUrl = `${baseUrl}/${imageName}?t=${timestamp}`;
  console.log('🖼️ [ProfileService] Using custom avatar:', fullUrl);
  return fullUrl;
};

const updateUserLocation = async (locationData) => {
  // CORRETTO: Rimosso /api dall'inizio
  const response = await apiClient.put('/users/me/location', locationData);
  return response.data;
};

const getNearbyUsers = async (params) => {
  // CORRETTO: Rimosso /api dall'inizio
  const response = await apiClient.get('/users/nearby', { params });
  return response.data.data;
};

const updateLocationFromCoords = async (locationData) => {
  // locationData sarà un oggetto { latitude, longitude }
  const response = await apiClient.put('/users/me/location-from-coords', locationData);
  return response.data.data;
};

const removeUserLocation = async () => {
  // Rimuove la posizione dell'utente quando l'app si chiude
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