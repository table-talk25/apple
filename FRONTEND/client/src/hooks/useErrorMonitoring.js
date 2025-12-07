// File: FRONTEND/client/src/hooks/useErrorMonitoring.js
// 🚨 HOOK PER MONITORAGGIO ERRORI
// 
// Questo hook fornisce un'interfaccia semplice per integrare
// il monitoraggio degli errori nei componenti React

import { useEffect, useCallback, useRef } from 'react';
import errorMonitoringService from '../services/errorMonitoringService';

/**
 * Hook per il monitoraggio degli errori nei componenti React
 * @param {Object} options - Opzioni di configurazione
 * @param {string} options.componentName - Nome del componente per il monitoraggio
 * @param {boolean} options.enableMonitoring - Abilita/disabilita il monitoraggio
 * @param {boolean} options.enablePerformance - Abilita il monitoraggio delle performance
 * @param {Object} options.context - Contesto aggiuntivo per il monitoraggio
 */
export const useErrorMonitoring = (options = {}) => {
  const {
    componentName = 'UnknownComponent',
    enableMonitoring = true,
    enablePerformance = true,
    context = {}
  } = options;

  const transactionRef = useRef(null);
  const errorBoundaryRef = useRef(null);

  // Configura il monitoraggio del componente
  useEffect(() => {
    if (enableMonitoring && componentName) {
      errorMonitoringService.configureComponentMonitoring(componentName, context);
    }
  }, [componentName, enableMonitoring, context]);

  // Avvia il monitoraggio delle performance
  useEffect(() => {
    if (enablePerformance && enableMonitoring) {
      transactionRef.current = errorMonitoringService.startTransaction(
        `Component: ${componentName}`,
        'react'
      );
    }

    return () => {
      if (transactionRef.current) {
        transactionRef.current.finish();
      }
    };
  }, [componentName, enablePerformance, enableMonitoring]);

  // Funzione per catturare errori
  const captureError = useCallback((error, additionalContext = {}) => {
    if (!enableMonitoring) return;

    const fullContext = {
      ...context,
      ...additionalContext,
      component: componentName,
      action: additionalContext.action || 'component_error'
    };

    return errorMonitoringService.captureError(error, fullContext);
  }, [enableMonitoring, componentName, context]);

  // Funzione per catturare messaggi
  const captureMessage = useCallback((message, level = 'info', additionalContext = {}) => {
    if (!enableMonitoring) return;

    const fullContext = {
      ...context,
      ...additionalContext,
      component: componentName,
      action: additionalContext.action || 'component_message'
    };

    return errorMonitoringService.captureMessage(message, level, fullContext);
  }, [enableMonitoring, componentName, context]);

  // Funzione per aggiungere breadcrumb
  const addBreadcrumb = useCallback((message, category = 'info', data = {}) => {
    if (!enableMonitoring) return;

    errorMonitoringService.addBreadcrumb(message, category, {
      ...data,
      component: componentName
    });
  }, [enableMonitoring, componentName]);

  // Funzione per monitorare API call
  const monitorApiCall = useCallback(async (apiCall, apiContext = {}) => {
    if (!enableMonitoring) {
      return await apiCall();
    }

    const fullContext = {
      ...context,
      ...apiContext,
      component: componentName,
      action: 'api_call'
    };

    return await errorMonitoringService.monitorApiCall(apiCall, fullContext);
  }, [enableMonitoring, componentName, context]);

  // Funzione per monitorare operazioni asincrone
  const monitorAsyncOperation = useCallback(async (operation, operationName, operationContext = {}) => {
    if (!enableMonitoring) {
      return await operation();
    }

    const fullContext = {
      ...context,
      ...operationContext,
      component: componentName,
      action: 'async_operation'
    };

    return await errorMonitoringService.monitorAsyncOperation(operation, operationName, fullContext);
  }, [enableMonitoring, componentName, context]);

  // Funzione per tracciare eventi utente
  const trackUserEvent = useCallback((eventName, eventData = {}) => {
    if (!enableMonitoring) return;

    addBreadcrumb(`User Event: ${eventName}`, 'user_action', {
      eventName,
      ...eventData
    });
  }, [enableMonitoring, addBreadcrumb]);

  // Funzione per tracciare navigazione
  const trackNavigation = useCallback((from, to, navigationData = {}) => {
    if (!enableMonitoring) return;

    addBreadcrumb('Navigation', 'navigation', {
      from,
      to,
      ...navigationData
    });
  }, [enableMonitoring, addBreadcrumb]);

  // Funzione per tracciare performance
  const trackPerformance = useCallback((metricName, value, unit = 'ms') => {
    if (!enableMonitoring || !enablePerformance) return;

    if (transactionRef.current) {
      transactionRef.current.setMeasurement(metricName, value, unit);
    }

    addBreadcrumb(`Performance: ${metricName}`, 'performance', {
      metricName,
      value,
      unit
    });
  }, [enableMonitoring, enablePerformance, addBreadcrumb]);

  // Funzione per gestire errori di rendering
  const handleRenderError = useCallback((error, errorInfo) => {
    if (!enableMonitoring) return;

    captureError(error, {
      action: 'render_error',
      errorInfo,
      componentStack: errorInfo.componentStack
    });
  }, [enableMonitoring, captureError]);

  // Funzione per gestire errori di lifecycle
  const handleLifecycleError = useCallback((error, phase) => {
    if (!enableMonitoring) return;

    captureError(error, {
      action: 'lifecycle_error',
      phase,
      lifecycle: phase
    });
  }, [enableMonitoring, captureError]);

  // Funzione per testare la connessione
  const testConnection = useCallback(() => {
    return errorMonitoringService.testConnection();
  }, []);

  // Funzione per ottenere statistiche
  const getStats = useCallback(() => {
    return errorMonitoringService.getErrorStats();
  }, []);

  return {
    // Funzioni principali
    captureError,
    captureMessage,
    addBreadcrumb,
    
    // Monitoraggio performance
    monitorApiCall,
    monitorAsyncOperation,
    trackPerformance,
    
    // Tracciamento eventi
    trackUserEvent,
    trackNavigation,
    
    // Gestione errori specifici
    handleRenderError,
    handleLifecycleError,
    
    // Utility
    testConnection,
    getStats,
    
    // Stato
    isMonitoringEnabled: enableMonitoring,
    isPerformanceEnabled: enablePerformance,
    componentName
  };
};

export default useErrorMonitoring;
