// File: /services/authService.js (Versione Definitiva e Sicura)

/**
 * 🔒 IMPORTANTE: Questo servizio implementa la verifica email obbligatoria
 * - La registrazione NON logga automaticamente l'utente
 * - L'utente deve verificare l'email prima di poter accedere
 * - Solo dopo la verifica email viene generato e salvato il token
 */

import apiClient, { suppressAlertsFor } from './apiService';
import { API_URL } from '../config/capacitorConfig';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { authPreferences } from '../utils/preferences';

// NOTA: Ogni funzione accetta un singolo oggetto 'data' per coerenza

/**
 * Registra un nuovo utente.
 * @param {object} registrationData - Oggetto con { name, surname, email, password }
 * @returns {object} Dati di registrazione SENZA token (utente NON loggato)
 */
export const register = async (registrationData) => {
  // Percorso corretto: /auth/register
  const response = await apiClient.post('/auth/register', registrationData);
  
  // 🔒 SICUREZZA: NON salviamo token né dati utente
  // L'utente deve verificare l'email prima di poter accedere
  
  // Restituiamo solo i dati essenziali per il frontend
  const registrationResult = {
    success: response.data.success,
    message: 'Registrazione quasi completata! Controlla la tua email per attivare il tuo account.',
    user: {
      _id: response.data.user._id,
      email: response.data.user.email,
      name: response.data.user.name,
      surname: response.data.user.surname
    }
  };
  
  return registrationResult;
};

/**
 * Esegue il login di un utente.
 * @param {object} credentials - Oggetto con { email, password }
 */
export const login = async (credentials) => {
  try {
    // Tentativo 1: Axios (Web)
    const response = await apiClient.post('/auth/login', credentials);
    await authPreferences.saveToken(response.data.token);
    await authPreferences.saveUser(response.data.user);
    // Silenzia gli alert per i prossimi 4s mentre partono le richieste di bootstrap
    suppressAlertsFor(4000);
    return response.data;
  } catch (error) {
    const isNetworkError = (error && (error.code === 'ERR_NETWORK' || !error.response));
    const isNative = Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios';

    if (isNetworkError && isNative) {
      // Tentativo 2: CapacitorHttp (nativo) – bypass CORS/WebView
      const url = `${API_URL}/auth/login`;
      const nativeResp = await CapacitorHttp.post({
        url,
        data: credentials,
        headers: { 'Content-Type': 'application/json' },
        connectTimeout: 30000,
        readTimeout: 30000,
      });

      if (nativeResp && nativeResp.data) {
        await authPreferences.saveToken(nativeResp.data.token);
        await authPreferences.saveUser(nativeResp.data.user);
        // Silenzia gli alert per i prossimi 4s mentre partono le richieste di bootstrap (meals/profile/notifiche)
        suppressAlertsFor(4000);
        return nativeResp.data;
      }
    }
    throw error;
  }
};

/**
 * Esegue il logout.
 */
export const logout = async () => {
  try {
    // Prova prima a notificare il server (se il token è ancora valido)
    // Usa suppressErrorAlert per evitare alert e redirect automatici
    // L'interceptor di apiService non aggiungerà il token per /auth/logout
    try {
      await apiClient.post('/auth/logout', {}, { 
        suppressErrorAlert: true,
        // Forza la rimozione del token dall'header se presente
        headers: {
          'Authorization': ''
        }
      });
    } catch (serverError) {
      // Ignora errori del server durante il logout (non è critico)
      console.log('⚠️ [Logout] Errore server non critico (logout locale verrà eseguito comunque):', serverError?.message || serverError);
    }
  } finally {
    // SEMPRE pulisci le credenziali locali, anche se il server ha dato errore
    await authPreferences.clearAuth();
    console.log('✅ [Logout] Credenziali locali rimosse');
  }
};

/**
 * Verifica il token e recupera i dati dell'utente.
 */
export const verifyToken = async () => {
    // Il token viene già aggiunto dall'interceptor di apiService,
    // quindi non dobbiamo passarlo noi.
    
    // IMPORTANTE: Usa suppressErrorAlert per evitare redirect automatici durante la verifica
    // Percorso corretto: /auth/me
    const response = await apiClient.get('/auth/me', { suppressErrorAlert: true });
    await authPreferences.saveUser(response.data.data);
    return response.data.data;
};

/**
 * Richiede il reset della password.
 * @param {object} data - Oggetto con { email }
 */
export const forgotPassword = async (data) => {
  const response = await apiClient.post('/auth/forgot-password', data);
  return response.data;
};

/**
 * Reinvia l'email di verifica per un account non verificato.
 * @param {object} data - Oggetto con { email }
 */
export const resendVerification = async (data) => {
  const response = await apiClient.post('/auth/resend-verification', data);
  return response.data;
};

/**
 * Verifica l'email di un utente tramite token.
 * @param {string} token - Token di verifica ricevuto via email
 */
export const verifyEmail = async (token) => {
  const response = await apiClient.post(`/auth/verify-email/${token}`);
  return response.data;
};

/**
 * Cambia la password dell'utente.
 * @param {object} data - Oggetto con { currentPassword, newPassword }
 */
export const changePassword = async (data) => {
  const response = await apiClient.put('/profile/me/password', data);
  return response.data;
};


const authService = {
  register,
  login,
  logout,
  verifyToken,
  forgotPassword,
  changePassword,
  resendVerification,
  verifyEmail,
};

export default authService;