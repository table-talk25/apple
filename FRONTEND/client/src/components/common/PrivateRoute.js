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

  // 🔄 NUOVA LOGICA: Non reindirizziamo più a /complete-profile
  // Ora la pagina profilo gestisce internamente la schermata di benvenuto
  // per i profili incompleti
  
  // Se requireCompleteProfile è true, permettiamo comunque l'accesso
  // perché la pagina profilo gestirà la logica internamente
  return children;
};

export default PrivateRoute; 