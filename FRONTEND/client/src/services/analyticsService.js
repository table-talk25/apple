import apiClient from './apiService';
import errorMonitoringService from './errorMonitoringService';

// ========================================
// 📊 ANALYTICS SERVICE INTEGRATO CON SENTRY
// ========================================
// Questo servizio combina analytics tradizionali con monitoraggio errori
// per fornire una visione completa delle performance dell'app

/**
 * Statistiche generali delle lingue
 */
export const getLanguageStats = async () => {
  try {
    const response = await apiClient.get('/analytics/languages');
    
    // Traccia il successo dell'API call
    errorMonitoringService.addBreadcrumb(
      'Language stats retrieved successfully',
      'api_success',
      { endpoint: '/analytics/languages', data_points: response.data?.length || 0 }
    );
    
    return response.data;
  } catch (error) {
    // Cattura l'errore per il monitoraggio
    errorMonitoringService.captureError(error, {
      component: 'AnalyticsService',
      action: 'get_language_stats',
      endpoint: '/analytics/languages'
    });
    throw error;
  }
};

/**
 * Statistiche dettagliate per una lingua specifica
 */
export const getLanguageDetails = async (languageCode) => {
  try {
    const response = await apiClient.get(`/analytics/languages/${languageCode}`);
    
    // Traccia il successo dell'API call
    errorMonitoringService.addBreadcrumb(
      'Language details retrieved successfully',
      'api_success',
      { 
        endpoint: `/analytics/languages/${languageCode}`,
        language: languageCode,
        data_points: response.data?.length || 0
      }
    );
    
    return response.data;
  } catch (error) {
    // Cattura l'errore per il monitoraggio
    errorMonitoringService.captureError(error, {
      component: 'AnalyticsService',
      action: 'get_language_details',
      endpoint: `/analytics/languages/${languageCode}`,
      language: languageCode
    });
    throw error;
  }
};

/**
 * Report di priorità traduzioni
 */
export const getTranslationPriority = async () => {
  try {
    const response = await apiClient.get('/analytics/translation-priority');
    
    // Traccia il successo dell'API call
    errorMonitoringService.addBreadcrumb(
      'Translation priority report retrieved successfully',
      'api_success',
      { 
        endpoint: '/analytics/translation-priority',
        priority_items: response.data?.length || 0
      }
    );
    
    return response.data;
  } catch (error) {
    // Cattura l'errore per il monitoraggio
    errorMonitoringService.captureError(error, {
      component: 'AnalyticsService',
      action: 'get_translation_priority',
      endpoint: '/analytics/translation-priority'
    });
    throw error;
  }
};

// ========================================
// 🚨 NUOVE FUNZIONI DI MONITORAGGIO ERRORI
// ========================================

/**
 * Invia metriche di performance al backend
 */
export const sendPerformanceMetrics = async (metrics) => {
  try {
    const response = await apiClient.post('/analytics/performance', metrics);
    
    // Traccia il successo dell'invio metriche
    errorMonitoringService.addBreadcrumb(
      'Performance metrics sent successfully',
      'analytics',
      { 
        endpoint: '/analytics/performance',
        metrics_count: Object.keys(metrics).length,
        timestamp: new Date().toISOString()
      }
    );
    
    return response.data;
  } catch (error) {
    // Cattura l'errore per il monitoraggio
    errorMonitoringService.captureError(error, {
      component: 'AnalyticsService',
      action: 'send_performance_metrics',
      endpoint: '/analytics/performance',
      metrics: metrics
    });
    throw error;
  }
};

/**
 * Invia metriche di utilizzo dell'app
 */
export const sendUsageMetrics = async (usageData) => {
  try {
    const response = await apiClient.post('/analytics/usage', usageData);
    
    // Traccia il successo dell'invio metriche
    errorMonitoringService.addBreadcrumb(
      'Usage metrics sent successfully',
      'analytics',
      { 
        endpoint: '/analytics/usage',
        data_points: Object.keys(usageData).length,
        timestamp: new Date().toISOString()
      }
    );
    
    return response.data;
  } catch (error) {
    // Cattura l'errore per il monitoraggio
    errorMonitoringService.captureError(error, {
      component: 'AnalyticsService',
      action: 'send_usage_metrics',
      endpoint: '/analytics/usage',
      usage_data: usageData
    });
    throw error;
  }
};

/**
 * Invia report di errori aggregati
 */
export const sendErrorReport = async (errorReport) => {
  try {
    const response = await apiClient.post('/analytics/errors', errorReport);
    
    // Traccia il successo dell'invio report errori
    errorMonitoringService.addBreadcrumb(
      'Error report sent successfully',
      'analytics',
      { 
        endpoint: '/analytics/errors',
        error_count: errorReport.errors?.length || 0,
        timestamp: new Date().toISOString()
      }
    );
    
    return response.data;
  } catch (error) {
    // Cattura l'errore per il monitoraggio
    errorMonitoringService.captureError(error, {
      component: 'AnalyticsService',
      action: 'send_error_report',
      endpoint: '/analytics/errors',
      error_report: errorReport
    });
    throw error;
  }
};

// ========================================
// 📈 FUNZIONI DI TRACKING AUTOMATICO
// ========================================

/**
 * Traccia automaticamente le performance di un'operazione
 */
export const trackOperationPerformance = async (operationName, operation, context = {}) => {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    
    const duration = performance.now() - startTime;
    
    // Invia metriche di performance
    await sendPerformanceMetrics({
      operation: operationName,
      duration: duration,
      success: true,
      timestamp: new Date().toISOString(),
      ...context
    });
    
    // Aggiungi breadcrumb per Sentry
    errorMonitoringService.addBreadcrumb(
      `Operation ${operationName} completed successfully`,
      'performance',
      { 
        operation: operationName,
        duration: duration,
        success: true,
        ...context
      }
    );
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    // Invia metriche di performance (con errore)
    await sendPerformanceMetrics({
      operation: operationName,
      duration: duration,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      ...context
    });
    
    // Cattura l'errore per il monitoraggio
    errorMonitoringService.captureError(error, {
      component: 'AnalyticsService',
      action: 'track_operation_performance',
      operation: operationName,
      duration: duration,
      context: context
    });
    
    throw error;
  }
};

/**
 * Traccia automaticamente l'utilizzo di una funzionalità
 */
export const trackFeatureUsage = async (featureName, action, data = {}) => {
  try {
    // Invia metriche di utilizzo
    await sendUsageMetrics({
      feature: featureName,
      action: action,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      url: window.location.href,
      ...data
    });
    
    // Aggiungi breadcrumb per Sentry
    errorMonitoringService.addBreadcrumb(
      `Feature ${featureName} used`,
      'feature_usage',
      { 
        feature: featureName,
        action: action,
        ...data
      }
    );
    
    return true;
  } catch (error) {
    // Cattura l'errore per il monitoraggio
    errorMonitoringService.captureError(error, {
      component: 'AnalyticsService',
      action: 'track_feature_usage',
      feature: featureName,
      action_type: action,
      data: data
    });
    
    // Non bloccare l'app per errori di tracking
    console.warn('Failed to track feature usage:', error);
    return false;
  }
};

/**
 * Traccia automaticamente gli errori dell'app
 */
export const trackAppError = async (error, context = {}) => {
  try {
    // Invia report di errore
    await sendErrorReport({
      errors: [{
        message: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        user_agent: navigator.userAgent,
        ...context
      }]
    });
    
    // Aggiungi breadcrumb per Sentry
    errorMonitoringService.addBreadcrumb(
      'App error tracked',
      'error_tracking',
      { 
        error_message: error.message,
        error_name: error.name,
        ...context
      }
    );
    
    return true;
  } catch (trackingError) {
    // Cattura l'errore per il monitoraggio
    errorMonitoringService.captureError(trackingError, {
      component: 'AnalyticsService',
      action: 'track_app_error',
      original_error: error.message,
      context: context
    });
    
    // Non bloccare l'app per errori di tracking
    console.warn('Failed to track app error:', trackingError);
    return false;
  }
};

// ========================================
// 🔧 FUNZIONI DI UTILITY
// ========================================

/**
 * Ottiene statistiche complete dell'app
 */
export const getAppAnalytics = async () => {
  try {
    const [languageStats, translationPriority] = await Promise.all([
      getLanguageStats(),
      getTranslationPriority()
    ]);
    
    // Traccia il successo dell'operazione
    errorMonitoringService.addBreadcrumb(
      'Complete app analytics retrieved successfully',
      'analytics',
      { 
        language_stats_count: languageStats?.length || 0,
        translation_priority_count: translationPriority?.length || 0,
        timestamp: new Date().toISOString()
      }
    );
    
    return {
      languages: languageStats,
      translations: translationPriority,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Cattura l'errore per il monitoraggio
    errorMonitoringService.captureError(error, {
      component: 'AnalyticsService',
      action: 'get_app_analytics'
    });
    throw error;
  }
};

/**
 * Testa la connessione ai servizi analytics
 */
export const testAnalyticsConnection = async () => {
  try {
    const startTime = performance.now();
    
    // Testa le API analytics
    await getLanguageStats();
    
    const duration = performance.now() - startTime;
    
    // Traccia il test di connessione
    errorMonitoringService.addBreadcrumb(
      'Analytics connection test successful',
      'connection_test',
      { 
        duration: duration,
        timestamp: new Date().toISOString()
      }
    );
    
    return {
      success: true,
      duration: duration,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Cattura l'errore per il monitoraggio
    errorMonitoringService.captureError(error, {
      component: 'AnalyticsService',
      action: 'test_analytics_connection'
    });
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// ========================================
// 📊 ESPORTAZIONE FUNZIONI
// ========================================

const analyticsService = {
  // Funzioni originali
  getLanguageStats,
  getLanguageDetails,
  getTranslationPriority,
  
  // Nuove funzioni di monitoraggio
  sendPerformanceMetrics,
  sendUsageMetrics,
  sendErrorReport,
  
  // Funzioni di tracking automatico
  trackOperationPerformance,
  trackFeatureUsage,
  trackAppError,
  
  // Funzioni di utility
  getAppAnalytics,
  testAnalyticsConnection
};

export default analyticsService; 