// File: frontend/client/src/services/mealService.js (Corretto)

/**
 * 🍽️ SERVIZIO PASTI (TableTalk®)
 * 
 * Metodi HTTP utilizzati:
 * - GET: Lettura dati
 * - POST: Creazione nuove risorse
 * - PATCH: Aggiornamenti parziali (modifica solo alcuni campi)
 * - DELETE: Rimozione risorse
 * 
 * Nota: PATCH è preferito a PUT per aggiornamenti parziali
 * poiché PUT richiederebbe l'invio dell'intera risorsa
 */

import apiClient from './apiService'; // <-- USA L'API CLIENT UNIFICATO
import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { getPreference, PREFERENCE_KEYS } from '../utils/preferences';
import { API_URL } from '../config/capacitorConfig';

const getMeals = async (params = {}) => {
  const { suppressErrorAlert, ...rest } = params || {};
  const response = await apiClient.get('/meals', { params: rest, suppressErrorAlert });
  return response.data;
};

// 🗺️ Nuova funzione per query geospaziali ottimizzate
const getMealsForMap = async (coords, radius = 50, options = {}) => {
  try {
    console.log('🗺️ [mealService] Ricerca pasti per mappa con coordinate geospaziali');
    console.log('📍 [mealService] Coordinate:', coords, 'Raggio:', radius, 'km');
    
    const params = {
      lat: coords.latitude,
      lng: coords.longitude,
      radius: radius,
      ...options
    };
    
    const response = await apiClient.get('/meals/map', { 
      params, 
      suppressErrorAlert: options.suppressErrorAlert 
    });
    
    console.log('✅ [mealService] Risultati query geospaziale:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [mealService] Errore query geospaziale:', error);
    throw error;
  }
};

// 📊 Nuova funzione per statistiche geospaziali
const getMealsGeoStats = async (coords, radius = 50) => {
  try {
    console.log('📊 [mealService] Richiesta statistiche geospaziali');
    
    const params = {
      lat: coords.latitude,
      lng: coords.longitude,
      radius: radius
    };
    
    const response = await apiClient.get('/meals/geostats', { params });
    console.log('✅ [mealService] Statistiche geospaziali ricevute:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [mealService] Errore statistiche geospaziali:', error);
    throw error;
  }
};

// 🔍 Nuova funzione per ricerca avanzata geospaziale
const advancedGeospatialSearch = async (coords, radius = 50, filters = {}) => {
  try {
    console.log('🔍 [mealService] Ricerca avanzata geospaziale');
    
    const params = {
      lat: coords.latitude,
      lng: coords.longitude,
      radius: radius,
      ...filters
    };
    
    const response = await apiClient.get('/meals/search/advanced', { params });
    console.log('✅ [mealService] Ricerca avanzata completata:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [mealService] Errore ricerca avanzata:', error);
    throw error;
  }
};

const getMealById = async (id) => {
  const response = await apiClient.get(`/meals/${id}`);
  return response.data;
};

  const createMeal = async (formData) => { // formData qui è un oggetto FormData
  try {
    console.log('📡 [mealService] Invio richiesta POST /meals...');
    console.log('📡 [mealService] FormData:', formData);
    
    const response = await apiClient.post('/meals', formData, {
      // Non impostare Content-Type per FormData: il browser aggiunge il boundary
      suppressErrorAlert: true,
    });
    
    console.log('✅ [mealService] Risposta ricevuta:', response);
    console.log('✅ [mealService] Response data:', response.data);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ [mealService] Errore nella richiesta:', error);
    console.error('❌ [mealService] Error response:', error.response);
    console.error('❌ [mealService] Error status:', error.response?.status);
    console.error('❌ [mealService] Error data:', error.response?.data);
    console.error('❌ [mealService] Error message:', error.response?.data?.message);
    // Fallback nativo su errori di rete/timeout: invia JSON (senza immagine)
    const isTransientNetwork = error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED' || typeof error?.response?.status !== 'number';
    if (isTransientNetwork) {
      try {
        // Estrai i campi dal FormData e costruisci un JSON equivalente (ignora coverImage)
        const plain = {};
        const topics = [];
        for (const [key, value] of formData.entries()) {
          // Non includere dati pesanti nell'emergenza
          if (key === 'image' || key === 'imageBase64' || key === 'imageLocalUri') continue;
          if (key === 'topics[]') {
            topics.push(value);
          } else if (key === 'location') {
            plain.location = value; // già stringificato dal form
          } else {
            plain[key] = value;
          }
        }
        if (topics.length) plain.topics = topics;

        // IMPORTANTE: Recupera sempre il token per le richieste native
        const token = await getPreference(PREFERENCE_KEYS.TOKEN, '');
        if (!token) {
          console.warn('[mealService] Token non trovato per richiesta nativa POST /meals');
        }
        const url = `${API_URL.replace(/\/$/, '')}/meals`;
        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('[mealService] Token incluso nella richiesta nativa POST /meals');
        }
        const nativeResp = await CapacitorHttp.post({
          url,
          headers,
          data: plain,
          connectTimeout: 20000,
          readTimeout: 20000,
        });
        if (nativeResp?.data?.success) {
          return nativeResp.data.data;
        }
      } catch (nativeErr) {
        console.error('❌ [mealService] Fallback nativo POST /meals fallito:', nativeErr);
      }
    }
    throw error;
  }
};

  // 🔄 Aggiorna un pasto esistente (aggiornamenti parziali supportati)
  // mealData è già un FormData costruito dal chiamante — lo passiamo direttamente
  const updateMeal = async (id, mealData) => {
    // ✅ FIX: Su piattaforma nativa Capacitor, axios intercetta FormData e
    // CapacitorHttp non gestisce multipart nativo → usa CapacitorHttp direttamente
    // convertendo il FormData in base64 per il campo image.
    if (Capacitor.isNativePlatform() && mealData instanceof FormData) {
      try {
        const token = await getPreference(PREFERENCE_KEYS.TOKEN, '');
        const url = `${API_URL.replace(/\/$/, '')}/meals/${id}`;

        // Separa il file dagli altri campi
        let imageFile = null;
        const plainFields = {};
        const topicsArr = [];

        for (const [key, value] of mealData.entries()) {
          if (key === 'image' && value instanceof File) {
            imageFile = value;
          } else if (key === 'topics') {
            topicsArr.push(value);
          } else {
            plainFields[key] = value;
          }
        }
        if (topicsArr.length) plainFields.topics = topicsArr;

        // Se c'è un'immagine, costruisci il multipart manualmente come base64
        if (imageFile) {
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              // strip "data:image/jpeg;base64," prefix
              const result = reader.result;
              const b64 = result.split(',')[1];
              resolve(b64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });

          // CapacitorHttp supporta multipart tramite l'oggetto files
          const headers = { 'Content-Type': 'multipart/form-data' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const nativeResp = await CapacitorHttp.patch({
            url,
            headers,
            data: {
              ...plainFields,
              image: {
                data: base64,
                type: imageFile.type || 'image/jpeg',
                filename: imageFile.name || `cover_${Date.now()}.jpg`,
              },
            },
            connectTimeout: 30000,
            readTimeout: 30000,
          });

          console.log('✅ [mealService] updateMeal nativo con immagine:', nativeResp.data);
          if (!nativeResp.data?.success) {
            throw new Error(nativeResp.data?.message || 'Errore aggiornamento pasto');
          }
          return nativeResp.data;
        } else {
          // Nessuna immagine: invia JSON semplice
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const nativeResp = await CapacitorHttp.patch({
            url,
            headers,
            data: plainFields,
            connectTimeout: 20000,
            readTimeout: 20000,
          });

          console.log('✅ [mealService] updateMeal nativo senza immagine:', nativeResp.data);
          if (!nativeResp.data?.success) {
            throw new Error(nativeResp.data?.message || 'Errore aggiornamento pasto');
          }
          return nativeResp.data;
        }
      } catch (nativeErr) {
        console.error('❌ [mealService] updateMeal nativo fallito:', nativeErr);
        throw nativeErr;
      }
    }

    // Web: axios gestisce FormData correttamente, il Content-Type viene rimosso
    // dall'interceptor di apiService per permettere al browser di aggiungere il boundary
    try {
      const response = await apiClient.patch(`/meals/${id}`, mealData, {
        suppressErrorAlert: true,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating meal:', error);
      throw error;
    }
  };

const deleteMeal = async (id) => {
  const response = await apiClient.delete(`/meals/${id}`);
  return response.data;
};

const joinMeal = async (id) => {
  try {
    const response = await apiClient.post(`/meals/${id}/participants`, {}, {
      suppressErrorAlert: true,
    });
    return response.data;
  } catch (error) {
    const isTransientNetwork = error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED' || typeof error?.response?.status !== 'number';
    if (isTransientNetwork) {
      try {
        // IMPORTANTE: Recupera sempre il token per le richieste native
        const token = await getPreference(PREFERENCE_KEYS.TOKEN, '');
        if (!token) {
          console.warn('[mealService] Token non trovato per richiesta nativa POST /meals/participants');
        }
        const url = `${API_URL.replace(/\/$/, '')}/meals/${id}/participants`;
        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('[mealService] Token incluso nella richiesta nativa POST /meals/participants');
        }
        const nativeResp = await CapacitorHttp.post({
          url,
          headers,
          data: {},
          connectTimeout: 20000,
          readTimeout: 20000,
        });
        return nativeResp.data;
      } catch (nativeErr) {
        // Continua con l'errore originale
      }
    }
    throw error;
  }
};

const leaveMeal = async (mealId) => {
  const response = await apiClient.delete(`/meals/${mealId}/participants`);
  return response.data;
};

const searchMeals = async (searchTerm, options = {}) => {
  const params = { q: searchTerm };
  if (options.lat != null && options.lng != null) {
    params.lat = options.lat;
    params.lng = options.lng;
    if (options.radius) params.radius = options.radius;
  }
  const response = await apiClient.get('/meals/search', {
    params,
    suppressErrorAlert: true,
  });
  // Backend ritorna { success, count, total, page, pages, data: [...] }
  // Estraiamo l'array; back-compat se mai cambiasse a ritornare l'array diretto
  return Array.isArray(response.data) ? response.data : (response.data?.data || []);
};

const getUserMeals = async (params = {}) => {
  const { suppressErrorAlert, ...rest } = params || {};
  const response = await apiClient.get('/meals/user/all', { params: rest, suppressErrorAlert });
  return response.data;
};

// ✅ NUOVO: Converti URL immagine pasto a URL completo
// Riconosce URL Firebase e li usa direttamente (senza prefisso)
const getFullMealImageUrl = (imageUrl) => {
  console.log('🍽️ [mealService] getFullMealImageUrl called with:', imageUrl);

  // ✅ Se l'URL è già un URL Firebase completo, restituiscilo così com'è
  if (imageUrl && imageUrl.includes('storage.googleapis.com')) {
    console.log('🍽️ [mealService] Using Firebase URL:', imageUrl);
    return imageUrl;
  }

  if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') {
    // Nessuna immagine
    console.log('🍽️ [mealService] No image provided');
    return null;
  }

  // Per le immagini caricate localmente, usa l'URL completo del backend
  const baseUrl = (apiClient.defaults.baseURL || '').replace('/api', '');
  const timestamp = new Date().getTime();
  const fullUrl = `${baseUrl}/${imageUrl}?t=${timestamp}`;
  console.log('🍽️ [mealService] Using local image URL:', fullUrl);
  return fullUrl;
};

const mealService = {
  getMeals,
  getMealById,
  createMeal,
  updateMeal,
  deleteMeal,
  joinMeal,
  leaveMeal,
  searchMeals,
  getUserMeals,
  getFullMealImageUrl, // ✅ NUOVO: funzione helper per URL immagini
  // 🗺️ Nuove funzioni geospaziali
  getMealsForMap,
  getMealsGeoStats,
  advancedGeospatialSearch
};

export default mealService;
