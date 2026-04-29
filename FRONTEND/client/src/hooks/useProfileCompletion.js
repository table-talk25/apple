// File: /src/hooks/useProfileCompletion.js
// Hook opzionale: il gating lato route è in PrivateRoute (/impostazioni/profilo).
// `redirectIfIncomplete` è false di default così un import dimenticato non rompe la navigazione.

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  shouldForceProfileCompletionRedirect,
  meetsMinimumProfileFields,
} from '../utils/profileCompletionGate';

const PROFILE_PATH = '/impostazioni/profilo';

/**
 * @param {boolean} redirectIfIncomplete - se true, allinea il redirect a PrivateRoute (stessa logica)
 * @param {string} redirectPath - destinazione dopo onboarding se il profilo risulta completo
 */
export const useProfileCompletion = (redirectIfIncomplete = false, redirectPath = '/meals') => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const path = location.pathname || '';
    const onProfileArea =
      path.startsWith(PROFILE_PATH) ||
      path.startsWith('/profile') ||
      path === '/complete-profile';

    if (redirectIfIncomplete && shouldForceProfileCompletionRedirect(user) && !onProfileArea) {
      const next = `${path}${location.search || ''}`;
      navigate(`${PROFILE_PATH}?reason=incomplete_profile&next=${encodeURIComponent(next)}`, {
        replace: true,
        state: { from: location, reason: 'incomplete_profile' },
      });
      return;
    }

    // La vecchia rotta /complete-profile non esiste in App.js: smista verso il profilo o home
    if (path === '/complete-profile') {
      if (user.profileCompleted === true || meetsMinimumProfileFields(user)) {
        navigate(redirectPath, { replace: true });
      } else {
        navigate(`${PROFILE_PATH}?reason=incomplete_profile`, { replace: true });
      }
    }
  }, [user, isAuthenticated, redirectIfIncomplete, redirectPath, navigate, location]);

  return {
    isProfileComplete: Boolean(
      user && (user.profileCompleted === true || meetsMinimumProfileFields(user))
    ),
    shouldCompleteProfile: Boolean(user && shouldForceProfileCompletionRedirect(user)),
    redirectToCompleteProfile: () => {
      const next = `${location.pathname || ''}${location.search || ''}`;
      navigate(`${PROFILE_PATH}?reason=incomplete_profile&next=${encodeURIComponent(next)}`, {
        replace: true,
        state: { from: location, reason: 'incomplete_profile' },
      });
    },
  };
};

export default useProfileCompletion;
