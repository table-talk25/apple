import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from './Spinner';
import { shouldForceProfileCompletionRedirect } from '../../utils/profileCompletionGate';

const PrivateRoute = ({ children, requireCompleteProfile = false }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner fullscreen label="Caricamento in corso..." />;

  // Se l'utente non è autenticato, reindirizza al login
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // 🔒 ONBOARDING: redirect solo se il profilo è esplicitamente incompleto
  // (`profileCompleted === false` e senza i campi minimi), non su `undefined`
  // (cache vecchia / merge parziale) per evitare redirect continui verso il profilo.
  if (requireCompleteProfile && user && shouldForceProfileCompletionRedirect(user)) {
    // Evita loop se siamo già nella zona profilo/onboarding
    // (in App.js la rotta reale è /impostazioni/profilo, non /profile)
    const path = location.pathname || '';
    const isAlreadyOnProfile =
      path.startsWith('/impostazioni/profilo') ||
      path.startsWith('/profile') ||
      path === '/complete-profile';
    if (!isAlreadyOnProfile) {
      const next = `${location.pathname || ''}${location.search || ''}`;
      return (
        <Navigate
          to={`/impostazioni/profilo?reason=incomplete_profile&next=${encodeURIComponent(next)}`}
          state={{ from: location, reason: 'incomplete_profile' }}
          replace
        />
      );
    }
  }

  return children;
};

export default PrivateRoute;
