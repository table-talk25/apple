// File: FRONTEND/client/src/services/errorMonitoringService.js
// 🚨 SERVIZIO DI MONITORAGGIO ERRORI CON SENTRY
// 
// Questo servizio integra Sentry per il monitoraggio automatico degli errori
// e fornisce funzionalità di logging e reporting per i tester

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

class ErrorMonitoringService {
  constructor() {
    this.isInitialized = false;
    this.userContext = null;
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Inizializza Sentry per il monitoraggio degli errori
   */
  initialize() {
    try {
      // Verifica se le variabili d'ambiente sono configurate
      const dsn = process.env.REACT_APP_SENTRY_DSN;
      const environment = process.env.REACT_APP_SENTRY_ENVIRONMENT || this.environment;
      
      if (!dsn) {
        console.warn('⚠️  Sentry DSN non configurato. Il monitoraggio degli errori è disabilitato.');
        return false;
      }

      // Configurazione Sentry
      Sentry.init({
        dsn,
        environment,
        integrations: [
          new BrowserTracing({
            // Traccia le performance delle route
            // routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            //   history => history.listen
            // ),
          }),
        ],
        
        // Configurazione per l'ambiente di sviluppo
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
          
          // Aggiungi tag per categorizzazione
          event.tags = {
            ...event.tags,
            app: 'TableTalk',
            version: process.env.REACT_APP_VERSION || '1.0.0',
            platform: 'web'
          };
          
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
          'Token expired'
        ],
        
        // Configurazione per performance
        maxBreadcrumbs: 50,
        
        // Configurazione per sessioni
        autoSessionTracking: true,
        
        // Configurazione per breadcrumbs
        beforeBreadcrumb(breadcrumb) {
          // Filtra breadcrumbs sensibili
          if (breadcrumb.category === 'navigation') {
            // Non tracciare navigazioni a pagine sensibili
            const sensitivePaths = ['/admin', '/settings', '/profile'];
            if (sensitivePaths.some(path => breadcrumb.data?.url?.includes(path))) {
              return null;
            }
          }
          
          return breadcrumb;
        }
      });

      this.isInitialized = true;
      console.log('✅ Sentry inizializzato correttamente per il monitoraggio degli errori');
      
      // Imposta il contesto dell'utente se disponibile
      this.setUserContext(this.userContext);
      
      return true;
    } catch (error) {
      console.error('❌ Errore nell\'inizializzazione di Sentry:', error);
      return false;
    }
  }

  /**
   * Imposta il contesto dell'utente per il monitoraggio
   */
  setUserContext(user) {
    if (!this.isInitialized) return;
    
    try {
      if (user) {
        this.userContext = user;
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
        
        console.log('👤 Contesto utente impostato per Sentry');
      } else {
        // Rimuovi contesto utente
        Sentry.setUser(null);
        this.userContext = null;
        console.log('👤 Contesto utente rimosso da Sentry');
      }
    } catch (error) {
      console.error('❌ Errore nell\'impostazione del contesto utente:', error);
    }
  }

  /**
   * Cattura un errore e lo invia a Sentry
   */
  captureError(error, context = {}) {
    if (!this.isInitialized) {
      console.error('🚨 Errore non tracciato (Sentry non inizializzato):', error);
      return;
    }

    try {
      // Aggiungi contesto aggiuntivo
      const enhancedContext = {
        ...context,
        tags: {
          ...context.tags,
          component: context.component || 'Unknown',
          action: context.action || 'Unknown',
          timestamp: new Date().toISOString()
        },
        extra: {
          ...context.extra,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      };

      // Cattura l'errore
      const eventId = Sentry.captureException(error, enhancedContext);
      
      console.log('🚨 Errore catturato e inviato a Sentry. Event ID:', eventId);
      
      // Invia anche al backend per logging locale
      this.sendErrorToBackend(error, enhancedContext, eventId);
      
      return eventId;
    } catch (sentryError) {
      console.error('❌ Errore nell\'invio a Sentry:', sentryError);
      console.error('🚨 Errore originale:', error);
    }
  }

  /**
   * Cattura un messaggio di errore
   */
  captureMessage(message, level = 'error', context = {}) {
    if (!this.isInitialized) {
      console.log(`🚨 Messaggio non tracciato (Sentry non inizializzato): ${message}`);
      return;
    }

    try {
      const enhancedContext = {
        ...context,
        tags: {
          ...context.tags,
          level,
          timestamp: new Date().toISOString()
        }
      };

      const eventId = Sentry.captureMessage(message, level, enhancedContext);
      console.log(`🚨 Messaggio catturato e inviato a Sentry. Event ID: ${eventId}`);
      
      return eventId;
    } catch (error) {
      console.error('❌ Errore nell\'invio del messaggio a Sentry:', error);
    }
  }

  /**
   * Aggiunge breadcrumb per tracciare le azioni dell'utente
   */
  addBreadcrumb(message, category = 'info', data = {}) {
    if (!this.isInitialized) return;

    try {
      Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
        timestamp: Date.now() / 1000
      });
    } catch (error) {
      console.error('❌ Errore nell\'aggiunta del breadcrumb:', error);
    }
  }

  /**
   * Traccia le performance di un'operazione
   */
  startTransaction(name, operation) {
    if (!this.isInitialized) return null;

    try {
      // const transaction = Sentry.startTransaction({
      //   name,
      //   op: operation
      // });
      
      // Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));
      
      // return transaction;
      return null; // Temporaneamente disabilitato per compatibilità
    } catch (error) {
      console.error('❌ Errore nell\'avvio della transazione:', error);
      return null;
    }
  }

  /**
   * Invia l'errore al backend per logging locale
   */
  async sendErrorToBackend(error, context, sentryEventId) {
    try {
      const errorData = {
        message: error.message || 'Errore sconosciuto',
        stack: error.stack,
        name: error.name,
        sentryEventId,
        context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };

      // Usa fetch per evitare dipendenze circolari
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(errorData)
      });
    } catch (fetchError) {
      console.error('❌ Errore nell\'invio al backend:', fetchError);
    }
  }

  /**
   * Configura il monitoraggio per componenti React specifici
   */
  configureComponentMonitoring(componentName, options = {}) {
    if (!this.isInitialized) return;

    try {
      // Sentry.configureScope(scope => {
      //   scope.setTag('component', componentName);
      //   scope.setContext('component', {
      //     name: componentName,
      //     ...options
      //   });
      // });
    } catch (error) {
      console.error('❌ Errore nella configurazione del componente:', error);
    }
  }

  /**
   * Monitora le performance di un'API call
   */
  async monitorApiCall(apiCall, context = {}) {
    if (!this.isInitialized) {
      return await apiCall();
    }

    // const transaction = this.startTransaction('API Call', 'http');
    
    try {
      const result = await apiCall();
      
      // if (transaction) {
      //   transaction.setTag('api.success', true);
      //   transaction.finish();
      // }
      
      return result;
    } catch (error) {
      // if (transaction) {
      //   transaction.setTag('api.success', false);
      //   transaction.setTag('api.error', error.message);
      //   transaction.finish();
      // }
      
      // Cattura l'errore
      this.captureError(error, {
        ...context,
        tags: {
          ...context.tags,
          type: 'api_error',
          api_endpoint: context.endpoint || 'unknown'
        }
      });
      
      throw error;
    }
  }

  /**
   * Monitora le performance di un'operazione asincrona
   */
  async monitorAsyncOperation(operation, name, context = {}) {
    if (!this.isInitialized) {
      return await operation();
    }

    // const transaction = this.startTransaction(name, 'async');
    
    try {
      const result = await operation();
      
      // if (transaction) {
      //   transaction.setTag('operation.success', true);
      //   transaction.finish();
      // }
      
      return result;
    } catch (error) {
      // if (transaction) {
      //   transaction.setTag('operation.success', false);
      //   transaction.setTag('operation.error', error.message);
      //   transaction.finish();
      // }
      
      this.captureError(error, {
        ...context,
        tags: {
          ...context.tags,
          type: 'async_operation_error',
          operation_name: name
        }
      });
      
      throw error;
    }
  }

  /**
   * Ottiene statistiche sugli errori
   */
  getErrorStats() {
    if (!this.isInitialized) return null;

    try {
      return {
        isInitialized: this.isInitialized,
        environment: this.environment,
        userContext: this.userContext ? 'set' : 'not_set',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Errore nel recupero delle statistiche:', error);
      return null;
    }
  }

  /**
   * Testa la connessione a Sentry
   */
  testConnection() {
    if (!this.isInitialized) {
      console.warn('⚠️  Sentry non inizializzato');
      return false;
    }

    try {
      // Invia un messaggio di test
      const eventId = this.captureMessage('Test di connessione Sentry', 'info', {
        tags: {
          type: 'connection_test',
          source: 'manual_test'
        }
      });
      
      console.log('✅ Test di connessione Sentry completato. Event ID:', eventId);
      return true;
    } catch (error) {
      console.error('❌ Test di connessione Sentry fallito:', error);
      return false;
    }
  }
}

// Esporta un'istanza singleton
const errorMonitoringService = new ErrorMonitoringService();

export default errorMonitoringService;

// Esporta anche la classe per test
export { ErrorMonitoringService };
