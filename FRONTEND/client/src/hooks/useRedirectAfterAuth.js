import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Hook personalizzato per gestire i redirect intelligenti dopo l'autenticazione
 * 
 * @returns {object} Funzioni per gestire i redirect
 * @returns {string} getRedirectPath - Restituisce il percorso di redirect o fallback
 * @returns {function} redirectAfterAuth - Esegue il redirect dopo l'autenticazione
 * @returns {function} clearRedirectPath - Pulisce il percorso di redirect salvato
 */
export const useRedirectAfterAuth = () => {
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Ottiene il percorso di redirect dalla location state o restituisce un fallback
   * @param {string} fallbackPath - Percorso di fallback (default: '/meals')
   * @returns {string} Percorso di redirect
   */
  const getRedirectPath = (fallbackPath = '/meals') => {
    // Controlla se c'è un percorso salvato nella location state
    const savedPath = location.state?.from?.pathname;
    
    if (savedPath) {
      // Verifica che il percorso salvato non sia la pagina di login stessa
      if (savedPath !== '/login' && savedPath !== '/register') {
        console.log(`[useRedirectAfterAuth] Redirect intelligente verso: ${savedPath}`);
        return savedPath;
      }
    }
    
    // Fallback al percorso predefinito
    console.log(`[useRedirectAfterAuth] Fallback verso: ${fallbackPath}`);
    return fallbackPath;
  };

  /**
   * Esegue il redirect dopo l'autenticazione
   * @param {string} fallbackPath - Percorso di fallback (default: '/meals')
   * @param {boolean} replace - Se true, sostituisce la voce nella cronologia
   */
  const redirectAfterAuth = (fallbackPath = '/meals', replace = true) => {
    const redirectPath = getRedirectPath(fallbackPath);
    
    // Usa requestAnimationFrame per assicurarsi che il DOM sia aggiornato
    requestAnimationFrame(() => {
      navigate(redirectPath, { replace });
      console.log(`[useRedirectAfterAuth] Redirect completato verso: ${redirectPath}`);
    });
  };

  /**
   * Pulisce il percorso di redirect salvato
   */
  const clearRedirectPath = () => {
    // Naviga alla stessa pagina senza state per pulire la location
    navigate(location.pathname, { replace: true, state: {} });
  };

  return {
    getRedirectPath,
    redirectAfterAuth,
    clearRedirectPath,
    savedPath: location.state?.from?.pathname
  };
};
