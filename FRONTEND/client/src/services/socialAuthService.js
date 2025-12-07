import { GOOGLE_AUTH_CONFIG } from '../config/googleAuth';
import apiService from './apiService';

/**
 * Servizio per l'autenticazione social (Google e Apple)
 */

// Inizializza Google Auth con la configurazione
export const initializeGoogleAuth = () => {
  // Per Capacitor, la configurazione viene gestita nel capacitor.config.js
  console.log('Google Auth configurato per:', GOOGLE_AUTH_CONFIG.webClientId);
  return true;
};

// Login con Google
export const loginWithGoogle = async (googleUser) => {
  try {
    console.log('Tentativo di login con Google...');
    
    // Invia i dati al backend per la verifica
    const response = await apiService.post('/auth/google', {
      idToken: googleUser.authentication.idToken,
      user: {
        email: googleUser.email,
        name: googleUser.displayName,
        profileImage: googleUser.photoURL
      }
    });

    if (response.data.success) {
      // Salva il token JWT
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      console.log('Login Google completato con successo');
      return {
        success: true,
        user: response.data.user,
        token: response.data.token
      };
    }
  } catch (error) {
    console.error('Errore durante il login Google:', error);
    throw new Error(error.response?.data?.message || 'Errore durante il login con Google');
  }
};

// Login con Apple
export const loginWithApple = async (appleUser) => {
  try {
    console.log('Tentativo di login con Apple...');
    
    // Invia i dati al backend per la verifica
    const response = await apiService.post('/auth/apple', {
      identityToken: appleUser.identityToken,
      authorizationCode: appleUser.authorizationCode,
      user: {
        email: appleUser.email,
        name: appleUser.fullName?.givenName + ' ' + appleUser.fullName?.familyName
      }
    });

    if (response.data.success) {
      // Salva il token JWT
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      console.log('Login Apple completato con successo');
      return {
        success: true,
        user: response.data.user,
        token: response.data.token
      };
    }
  } catch (error) {
    console.error('Errore durante il login Apple:', error);
    throw new Error(error.response?.data?.message || 'Errore durante il login con Apple');
  }
};

// Logout da Google
export const logoutFromGoogle = async () => {
  try {
    // Rimuovi i dati locali
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    console.log('Logout Google completato');
    return { success: true };
  } catch (error) {
    console.error('Errore durante il logout Google:', error);
    throw error;
  }
};

// Controlla lo stato dell'autenticazione social
export const checkSocialAuthStatus = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    return {
      isAuthenticated: true,
      user: JSON.parse(user),
      token: token
    };
  }
  
  return {
    isAuthenticated: false,
    user: null,
    token: null
  };
};

export default {
  initializeGoogleAuth,
  loginWithGoogle,
  loginWithApple,
  logoutFromGoogle,
  checkSocialAuthStatus
};
