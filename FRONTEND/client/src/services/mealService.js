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
import { CapacitorHttp } from '@capacitor/core';
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
  // Utilizza PATCH per comunicare l'intento di modificare solo alcuni campi
  const updateMeal = async (id, mealData) => {
    try {
      const formData = new FormData();
      Object.keys(mealData).forEach(key => {
        // Gestisce correttamente anche gli array come i topics
        if (Array.isArray(mealData[key])) {
          mealData[key].forEach(item => formData.append(key, item));
        } else {
          formData.append(key, mealData[key]);
        }
      });

      const response = await apiClient.patch(`/meals/${id}`, formData, { // 🔄 Cambiato da .put() a .patch()
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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

const searchMeals = async (searchTerm) => {
  const response = await apiClient.get('/meals/search', {
    params: { q: searchTerm },
    suppressErrorAlert: true,
  });
  // Il backend ritorna { success, data: [...] }: estraiamo l'array
  // (back-compat: se mai venisse cambiato a ritornare l'array direttamente)
  return Array.isArray(response.data) ? response.data : (response.data?.data || []);
};

const getUserMeals = async (params = {}) => {
  const { suppressErrorAlert, ...rest } = params || {};
  const response = await apiClient.get('/meals/user/all', { params: rest, suppressErrorAlert });
  return response.data;
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
  // 🗺️ Nuove funzioni geospaziali
  getMealsForMap,
  getMealsGeoStats,
  advancedGeospatialSearch
};

export default mealService;