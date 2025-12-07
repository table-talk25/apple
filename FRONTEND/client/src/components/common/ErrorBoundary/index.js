// File: FRONTEND/client/src/components/common/ErrorBoundary/index.js
// 🚨 ERROR BOUNDARY CON INTEGRAZIONE SENTRY
// 
// Questo componente cattura automaticamente gli errori di rendering
// e li invia a Sentry per il monitoraggio

import React from 'react';
import { withSentryReactRouterV6Routing } from '@sentry/react';
import { useTranslation } from 'react-i18next';
import errorMonitoringService from '../../../services/errorMonitoringService';
import styles from './ErrorBoundary.module.css';

const ErrorBoundary = (props) => {
  const { t } = useTranslation();
  const [state, setState] = React.useState({
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: null
  });

  const setErrorState = (newState) => {
    setState(prevState => ({ ...prevState, ...newState }));
  };

  const resetError = () => {
    setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  const retry = () => {
    resetError();
    if (props.onRetry) {
      props.onRetry();
    } else {
      window.location.reload();
    }
  };

  const goHome = () => {
    resetError();
    if (props.onGoHome) {
      props.onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  const openSupport = () => {
    if (props.onSupport) {
      props.onSupport(state.errorId);
    } else {
      // Apri email di supporto con dettagli dell'errore
      const subject = encodeURIComponent(t('errorBoundary.supportEmailSubject'));
      const body = encodeURIComponent(t('errorBoundary.supportEmailBody', {
        errorId: state.errorId || 'N/A',
        componentName: props.componentName || 'Sconosciuto',
        date: new Date().toLocaleString('it-IT'),
        url: window.location.href,
        errorMessage: state.error?.message || 'N/A',
        errorStack: state.error?.stack || 'N/A'
      }));
      
      window.open(`mailto:infotabletalk.app@gmail.com?subject=${subject}&body=${body}`);
    }
  };

  const componentDidCatch = (error, errorInfo) => {
    try {
      const errorId = errorMonitoringService.captureError(error, {
        component: props.componentName || 'ErrorBoundary',
        action: 'render_error',
        errorInfo,
        componentStack: errorInfo.componentStack,
        fallback: props.fallback,
        timestamp: new Date().toISOString()
      });
      setErrorState({ error, errorInfo, errorId });
      console.error('🚨 Errore catturato da ErrorBoundary:', { error, errorInfo, errorId, component: props.componentName });
      if (props.onError) { props.onError(error, errorInfo, errorId); }
    } catch (sentryError) {
      console.error('❌ Errore nell\'invio a Sentry:', sentryError);
      console.error('🚨 Errore originale:', error);
    }
  };

  const getDerivedStateFromError = (error) => {
    return { hasError: true };
  };

  // Simula il comportamento di getDerivedStateFromError
  React.useEffect(() => {
    if (state.error) {
      setErrorState({ hasError: true });
    }
  }, [state.error]);

  // Simula componentDidCatch
  const catchError = React.useCallback((error, errorInfo) => {
    componentDidCatch(error, errorInfo);
  }, []);

  // Gestisce gli errori di rendering
  if (state.hasError) {
    // UI di fallback personalizzata
    if (props.fallback) {
      return props.fallback({
        error: state.error,
        errorInfo: state.errorInfo,
        errorId: state.errorId,
        resetError,
        retry,
        goHome,
        openSupport
      });
    }

    // UI di fallback predefinita
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <div className={styles.errorIcon}>
            🚨
          </div>
          
          <h1 className={styles.errorTitle}>
            {t('errorBoundary.title')}
          </h1>
          
          <p className={styles.errorMessage}>
            {t('errorBoundary.message')}
          </p>

          {state.errorId && (
            <div className={styles.errorId}>
              <strong>{t('errorBoundary.errorId')}:</strong> {state.errorId}
            </div>
          )}

          {process.env.NODE_ENV === 'development' && state.error && (
            <details className={styles.errorDetails}>
              <summary>{t('errorBoundary.technicalDetails')}</summary>
              <div className={styles.errorStack}>
                <h4>{t('errorBoundary.errorMessage')}:</h4>
                <pre>{state.error.message}</pre>
                
                <h4>{t('errorBoundary.errorStack')}:</h4>
                <pre>{state.error.stack}</pre>
                
                {state.errorInfo && (
                  <>
                    <h4>{t('errorBoundary.componentStack')}:</h4>
                    <pre>{state.errorInfo.componentStack}</pre>
                  </>
                )}
              </div>
            </details>
          )}

          <div className={styles.errorActions}>
            <button 
              onClick={retry}
              className={styles.actionButton}
            >
              {t('errorBoundary.retry')}
            </button>
            
            <button 
              onClick={goHome}
              className={styles.actionButton}
            >
              {t('errorBoundary.goHome')}
            </button>
            
            <button 
              onClick={openSupport}
              className={styles.actionButton}
            >
              {t('errorBoundary.contactSupport')}
            </button>
          </div>

          <div className={styles.errorFooter}>
            <p>
              Se il problema persiste, contatta il nostro team di supporto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Se non ci sono errori, renderizza i children normalmente
  return props.children;
};

// Wrapper per mantenere la compatibilità con Sentry
const SentryErrorBoundary = withSentryReactRouterV6Routing(ErrorBoundary);

// Wrapper principale che fornisce le props
const ErrorBoundaryWrapper = ({ children, componentName, fallback, onError, onRetry, onGoHome, onSupport, ...props }) => {
  return (
    <SentryErrorBoundary 
      componentName={componentName} 
      fallback={fallback} 
      onError={onError} 
      onRetry={onRetry} 
      onGoHome={onGoHome} 
      onSupport={onSupport} 
      {...props}
    >
      {children}
    </SentryErrorBoundary>
  );
};

export default ErrorBoundaryWrapper;
export { ErrorBoundary, SentryErrorBoundary };
