// File: FRONTEND/client/src/utils/preferences.js
// Utility centralizzata per gestire le preferenze con @capacitor/preferences

import { Preferences } from '@capacitor/preferences';

// Chiavi per le preferenze
export const PREFERENCE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  SESSION: 'session',
  SETTINGS: 'settings',
  THEME: 'theme',
  LANGUAGE: 'language',
  LAST_LOGIN_EMAIL: 'lastLoginEmail'
};

/**
 * Salva un valore nelle preferenze
 * @param {string} key - Chiave della preferenza
 * @param {any} value - Valore da salvare (verrà convertito in stringa se necessario)
 */
export const savePreference = async (key, value) => {
  try {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await Preferences.set({ key, value: stringValue });
    console.log(`[Preferences] Salvato '${key}':`, typeof value === 'string' ? '***' : typeof value);
    // Verifica che il salvataggio sia andato a buon fine
    const verify = await Preferences.get({ key });
    if (verify.value === stringValue) {
      console.log(`[Preferences] Verifica salvataggio '${key}': OK`);
    } else {
      console.warn(`[Preferences] Verifica salvataggio '${key}': FALLITA`);
    }
  } catch (error) {
    console.error(`[Preferences] Errore nel salvare ${key}:`, error);
    throw error;
  }
};

/**
 * Recupera un valore dalle preferenze
 * @param {string} key - Chiave della preferenza
 * @param {any} defaultValue - Valore di default se non trovato
 * @returns {any} Il valore recuperato o il default
 */
export const getPreference = async (key, defaultValue = null) => {
  try {
    const { value } = await Preferences.get({ key });
    if (value === null || value === undefined) {
      console.log(`[Preferences] Chiave '${key}' non trovata, uso default`);
      return defaultValue;
    }
    
    // Prova a parsare come JSON, se fallisce restituisce la stringa
    try {
      const parsed = JSON.parse(value);
      console.log(`[Preferences] Recuperato '${key}':`, typeof parsed === 'string' ? '***' : 'object');
      return parsed;
    } catch {
      console.log(`[Preferences] Recuperato '${key}' come stringa`);
      return value;
    }
  } catch (error) {
    console.error(`[Preferences] Errore nel recuperare ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Rimuove una preferenza
 * @param {string} key - Chiave della preferenza da rimuovere
 */
export const removePreference = async (key) => {
  try {
    await Preferences.remove({ key });
    console.log(`[Preferences] Rimosso: ${key}`);
  } catch (error) {
    console.error(`[Preferences] Errore nel rimuovere ${key}:`, error);
    throw error;
  }
};

/**
 * Rimuove tutte le preferenze
 */
export const clearAllPreferences = async () => {
  try {
    await Preferences.clear();
    console.log('[Preferences] Tutte le preferenze rimosse');
  } catch (error) {
    console.error('[Preferences] Errore nel rimuovere tutte le preferenze:', error);
    throw error;
  }
};

/**
 * Ottiene tutte le chiavi delle preferenze
 * @returns {string[]} Array delle chiavi
 */
export const getPreferenceKeys = async () => {
  try {
    const { keys } = await Preferences.keys();
    return keys;
  } catch (error) {
    console.error('[Preferences] Errore nel recuperare le chiavi:', error);
    return [];
  }
};

// Funzioni specifiche per l'autenticazione
export const authPreferences = {
  /**
   * Salva il token di autenticazione
   */
  saveToken: async (token) => {
    return await savePreference(PREFERENCE_KEYS.TOKEN, token);
  },

  /**
   * Recupera il token di autenticazione
   */
  getToken: async () => {
    return await getPreference(PREFERENCE_KEYS.TOKEN);
  },

  /**
   * Rimuove il token di autenticazione
   */
  removeToken: async () => {
    return await removePreference(PREFERENCE_KEYS.TOKEN);
  },

  /**
   * Salva i dati dell'utente
   */
  saveUser: async (user) => {
    return await savePreference(PREFERENCE_KEYS.USER, user);
  },

  /**
   * Recupera i dati dell'utente
   */
  getUser: async () => {
    return await getPreference(PREFERENCE_KEYS.USER);
  },

  /**
   * Rimuove i dati dell'utente
   */
  removeUser: async () => {
    return await removePreference(PREFERENCE_KEYS.USER);
  },

  /**
   * Salva i dati di sessione
   */
  saveSession: async (session) => {
    return await savePreference(PREFERENCE_KEYS.SESSION, session);
  },

  /**
   * Recupera i dati di sessione
   */
  getSession: async () => {
    return await getPreference(PREFERENCE_KEYS.SESSION);
  },

  /**
   * Rimuove i dati di sessione
   */
  removeSession: async () => {
    return await removePreference(PREFERENCE_KEYS.SESSION);
  },

  /**
   * Rimuove tutti i dati di autenticazione
   */
  clearAuth: async () => {
    await removePreference(PREFERENCE_KEYS.TOKEN);
    await removePreference(PREFERENCE_KEYS.USER);
    await removePreference(PREFERENCE_KEYS.SESSION);
  }
};

export default {
  savePreference,
  getPreference,
  removePreference,
  clearAllPreferences,
  getPreferenceKeys,
  authPreferences,
  PREFERENCE_KEYS
}; 