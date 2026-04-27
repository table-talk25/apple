// File: /services/authService.js (Versione Soft: l'utente entra subito + banner conferma email)

/**
 * 📩 Strategia "Soft" per Google Play:
 * - La registrazione logga l'utente immediatamente (token salvato)
 * - In parallelo il backend invia un'email di verifica
 * - Finché user.isEmailVerified === false, il Layout mostra un banner non bloccante
 * - Niente azioni bloccate per ora (decisione Soft, scelta in fase di onboarding)
 */

import apiClient, { suppressAlertsFor } from './apiService';
import { API_URL } from '../config/capacitorConfig';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { authPreferences } from '../utils/preferences';

// NOTA: Ogni funzione accetta un singolo oggetto 'data' per coerenza

/**
 * Registra un nuovo utente e lo logga immediatamente.
 * @param {object} registrationData - { name, surname, email, password, confirmPassword, dateOfBirth, terms }
 * @returns {object} { success, token, user, message, requiresEmailVerification }
 *
 * 🛌 RENDER COLD START: Render free tier mette il backend in sleep dopo ~15min
 * di inattività. La prima chiamata può metterci 50-60s a svegliare il servizio.
 * Per non far andare in timeout la registrazione, qui usiamo 75s di timeout.
 */
export const register = async (registrationData) => {
  const response = await apiClient.post('/auth/register', registrationData, {
    timeout: 75000, // 75s per gestire il cold start di Render
  });

  // 📩 STRATEGIA SOFT: salviamo subito token e user, l'utente entra direttamente.
  // L'email di verifica arriva in parallelo. Il banner "Conferma email" nel Layout
  // ricorderà all'utente di completare la verifica.
  if (response.data && response.data.token) {
    await authPreferences.saveToken(response.data.token);
    await authPreferences.saveUser(response.data.user);
    suppressAlertsFor(4000);

    // Invia il token FCM pendente se presente (parallelo al login)
    await sendPendingFcmToken();
  }

  return response.data;
};

/**
 * Esegue il login di un utente.
 * @param {object} credentials - Oggetto con { email, password }
 */
export const login = async (credentials) => {
  try {
    // Tentativo 1: Axios (Web) — 75s per gestire il cold start di Render free tier
    const response = await apiClient.post('/auth/login', credentials, { timeout: 75000 });
    await authPreferences.saveToken(response.data.token);
    await authPreferences.saveUser(response.data.user);
    // Silenzia gli alert per i prossimi 4s mentre partono le richieste di bootstrap
    suppressAlertsFor(4000);
    
    // Invia il token FCM pendente se presente
    await sendPendingFcmToken();
    
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
        
        // Invia il token FCM pendente se presente
        await sendPendingFcmToken();
        
        return nativeResp.data;
      }
    }
    throw error;
  }
};

/**
 * Invia il token FCM pendente al backend dopo il login
 */
async function sendPendingFcmToken() {
  try {
    const pendingToken = localStorage.getItem('pending_fcm_token');
    if (pendingToken) {
      console.log('🔥 [Auth] Invio token FCM pendente dopo login...');
      await apiClient.post('/profile/me/fcm-token', { token: pendingToken }, { suppressErrorAlert: true });
      localStorage.removeItem('pending_fcm_token');
      console.log('✅ [Auth] Token FCM pendente inviato con successo');
    }
  } catch (error) {
    console.error('❌ [Auth] Errore nell\'invio token FCM pendente:', error);
    // Non bloccare il login se l'invio del token fallisce
  }
}

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
 *
 * 🛌 Cold start Render: stesso pattern di login/register, 75s di timeout.
 */
export const forgotPassword = async (data) => {
  const response = await apiClient.post('/auth/forgot-password', data, { timeout: 75000 });
  return response.data;
};

/**
 * Reinvia l'email di verifica per un account non verificato.
 * @param {object} data - Oggetto con { email }
 *
 * 🛌 Cold start Render: 75s anche qui per non far fallire chi clicca "Reinvia"
 * dopo che il backend è andato in sleep.
 */
export const resendVerification = async (data) => {
  const response = await apiClient.post('/auth/resend-verification', data, { timeout: 75000 });
  return response.data;
};

/**
 * Verifica l'email di un utente tramite token.
 * @param {string} token - Token di verifica ricevuto via email
 *
 * 🛌 75s perché spesso questa è la PRIMA chiamata fatta dall'utente che riapre
 * l'app dopo aver atteso l'email (= backend potenzialmente in sleep).
 */
export const verifyEmail = async (token) => {
  // L'endpoint backend è GET /auth/verify-email?token=...
  const response = await apiClient.get(`/auth/verify-email`, { params: { token }, timeout: 75000 });
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