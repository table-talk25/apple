import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from './Spinner';

const PrivateRoute = ({ children, requireCompleteProfile = false }) => {
  const { isAuthenticated, loading } = useAuth();
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

  // Strategia "Soft": l'onboarding è gestito dal banner del Layout e dalla
  // welcome screen di /impostazioni/profilo, non da un gate di route.
  // `requireCompleteProfile` è accettata come prop per compat ma è un no-op.
  void requireCompleteProfile;

  return children;
};

export default PrivateRoute;
