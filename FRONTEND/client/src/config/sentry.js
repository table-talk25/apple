// File: FRONTEND/client/src/config/sentry.js
// 🚨 CONFIGURAZIONE SENTRY PER TABLE TALK
// 
// Questo file configura Sentry per il monitoraggio degli errori
// e delle performance dell'app

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

/**
 * Inizializza Sentry per il monitoraggio degli errori
 */
export const initializeSentry = () => {
  try {
    // Verifica se le variabili d'ambiente sono configurate
    const dsn = process.env.REACT_APP_SENTRY_DSN;
    const environment = process.env.REACT_APP_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
    
    if (!dsn) {
      console.warn('⚠️  Sentry DSN non configurato. Il monitoraggio degli errori è disabilitato.');
      return false;
    }

    console.log('🚀 [Sentry] Inizializzazione in corso...');
    console.log('🌍 [Sentry] Ambiente:', environment);

    // Configurazione Sentry
    Sentry.init({
      dsn,
      environment,
      
      // Integrazioni
      integrations: [
        new BrowserTracing({
          // Traccia le performance delle route
          // routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          //   history => history.listen
          // ),
        }),
      ],
      
      // Configurazione per l'ambiente
      debug: environment === 'development',
      
      // Campioni di errori da inviare (100% in development, 10% in production)
      tracesSampleRate: environment === 'development' ? 1.0 : 0.1,
      
      // Configurazione per React
      beforeSend(event) {
        // Filtra eventi sensibili
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['authorization'];
        }
        
        // Filtra URL sensibili
        if (event.request?.url) {
          const sensitivePaths = ['/admin', '/settings', '/profile'];
          if (sensitivePaths.some(path => event.request.url.includes(path))) {
            return null; // Non inviare eventi sensibili
          }
        }
        
        // Aggiungi tag per categorizzazione
        event.tags = {
          ...event.tags,
          app: 'TableTalk',
          version: process.env.REACT_APP_VERSION || '1.0.0',
          platform: 'web',
          environment: environment
        };
        
        console.log('📤 [Sentry] Evento inviato:', event.event_id);
        return event;
      },
      
      // Configurazione per errori non critici
      ignoreErrors: [
        // Errori comuni del browser che non sono critici
        'ResizeObserver loop limit exceeded',
        'Script error.',
        'Script error',
        'Uncaught Error: Script error.',
        'Uncaught Error: Script error',
        // Errori di rete comuni
        'Network Error',
        'Failed to fetch',
        'Request timeout',
        // Errori di autenticazione (non critici per il monitoraggio)
        'Unauthorized',
        'Forbidden',
        'Token expired',
        // Errori specifici di TableTalk
        'User not authenticated',
        'Meal not found',
        'Chat room not accessible'
      ],
      
      // Configurazione per performance
      maxBreadcrumbs: 50,
      
      // Configurazione per sessioni
      autoSessionTracking: true,
      
      // Configurazione per breadcrumbs
      beforeBreadcrumb(breadcrumb) {
        // Filtra breadcrumbs sensibili
        if (breadcrumb.category === 'navigation') {
          const sensitivePaths = ['/admin', '/settings', '/profile', '/payment'];
          if (sensitivePaths.some(path => breadcrumb.data?.url?.includes(path))) {
            return null;
          }
        }
        
        // Filtra breadcrumbs con dati sensibili
        if (breadcrumb.data) {
          const sensitiveFields = ['password', 'token', 'credit_card', 'ssn'];
          sensitiveFields.forEach(field => {
            if (breadcrumb.data[field]) {
              breadcrumb.data[field] = '[REDACTED]';
            }
          });
        }
        
        return breadcrumb;
      },

      // Configurazione per PII (Personal Identifiable Information)
      sendDefaultPii: false, // Disabilitato per privacy
      
      // Configurazione per release tracking
      release: process.env.REACT_APP_VERSION || '1.0.0',
      
      // Configurazione per sampling
      replaysSessionSampleRate: environment === 'development' ? 1.0 : 0.1,
      replaysOnErrorSampleRate: 1.0,
    });

    console.log('✅ [Sentry] Inizializzato correttamente!');
    console.log('🔗 [Sentry] DSN configurato per ambiente:', environment);
    
    // Test di connessione
    Sentry.captureMessage('Sentry inizializzato correttamente', 'info');
    
    return true;
  } catch (error) {
    console.error('❌ [Sentry] Errore nell\'inizializzazione:', error);
    return false;
  }
};

/**
 * Configura il contesto dell'utente per il monitoraggio
 */
export const setUserContext = (user) => {
  try {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.nickname || user.name,
        // Non includere dati sensibili
        // password, token, etc. sono esclusi
      });
      
      // Aggiungi tag per l'utente
      Sentry.setTag('user.role', user.role || 'user');
      Sentry.setTag('user.language', user.language || 'it');
      Sentry.setTag('user.verified', user.isEmailVerified || false);
      
      console.log('👤 [Sentry] Contesto utente impostato:', user.email);
    } else {
      // Rimuovi contesto utente
      Sentry.setUser(null);
      console.log('👤 [Sentry] Contesto utente rimosso');
    }
  } catch (error) {
    console.error('❌ [Sentry] Errore nell\'impostazione del contesto utente:', error);
  }
};

/**
 * Configura il contesto del pasto per il monitoraggio
 */
export const setMealContext = (meal) => {
  try {
    if (meal) {
      Sentry.setContext('meal', {
        id: meal.id,
        title: meal.title,
        type: meal.mealType,
        status: meal.status,
        date: meal.date,
        location: meal.location?.address ? 'physical' : 'virtual',
        participants_count: meal.participants?.length || 0
      });
      
      Sentry.setTag('meal.type', meal.mealType);
      Sentry.setTag('meal.status', meal.status);
      Sentry.setTag('meal.location', meal.location?.address ? 'physical' : 'virtual');
      
      console.log('🍽️ [Sentry] Contesto pasto impostato:', meal.title);
    } else {
      Sentry.setContext('meal', null);
      console.log('🍽️ [Sentry] Contesto pasto rimosso');
    }
  } catch (error) {
    console.error('❌ [Sentry] Errore nell\'impostazione del contesto pasto:', error);
  }
};

/**
 * Testa la connessione a Sentry
 */
export const testSentryConnection = () => {
  try {
    const eventId = Sentry.captureMessage('Test di connessione Sentry', 'info', {
      tags: {
        type: 'connection_test',
        source: 'manual_test',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('✅ [Sentry] Test di connessione completato. Event ID:', eventId);
    return { success: true, eventId };
  } catch (error) {
    console.error('❌ [Sentry] Test di connessione fallito:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Ottiene informazioni sulla configurazione Sentry
 */
export const getSentryInfo = () => {
  try {
    return {
      isInitialized: true,
      environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      version: process.env.REACT_APP_VERSION || '1.0.0',
      dsn: process.env.REACT_APP_SENTRY_DSN ? 'Configured' : 'Not configured',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ [Sentry] Errore nel recupero delle informazioni:', error);
    return null;
  }
};

// Esporta le funzioni principali
export default {
  initialize: initializeSentry,
  setUser: setUserContext,
  setMeal: setMealContext,
  test: testSentryConnection,
  info: getSentryInfo
};
