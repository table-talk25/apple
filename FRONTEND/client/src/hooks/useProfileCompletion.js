// File: /src/hooks/useProfileCompletion.js
// Hook per gestire il completamento obbligatorio del profilo

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook per gestire il completamento obbligatorio del profilo
 * @param {boolean} redirectIfIncomplete - Se true, reindirizza alla pagina completamento profilo
 * @param {string} redirectPath - Percorso di fallback se il profilo è completo
 */
export const useProfileCompletion = (redirectIfIncomplete = true, redirectPath = '/meals') => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Solo se l'utente è autenticato
    if (!isAuthenticated || !user) {
      return;
    }

    // Se il profilo non è completo e siamo in modalità redirect
    if (redirectIfIncomplete && !user.profileCompleted) {
      // Non reindirizzare se siamo già nella pagina di completamento profilo
      if (location.pathname !== '/complete-profile') {
        console.log('🔄 [useProfileCompletion] Profilo incompleto, reindirizzamento a /complete-profile');
        navigate('/complete-profile', { 
          replace: true,
          state: { from: location.pathname }
        });
      }
    }
    // Se il profilo è completo e siamo nella pagina di completamento
    else if (user.profileCompleted && location.pathname === '/complete-profile') {
      console.log('✅ [useProfileCompletion] Profilo completo, reindirizzamento a', redirectPath);
      navigate(redirectPath, { replace: true });
    }
  }, [user, isAuthenticated, redirectIfIncomplete, redirectPath, navigate, location]);

  return {
    isProfileComplete: user?.profileCompleted || false,
    shouldCompleteProfile: !user?.profileCompleted,
    redirectToCompleteProfile: () => navigate('/complete-profile', { 
      replace: true,
      state: { from: location.pathname }
    })
  };
};

export default useProfileCompletion;
