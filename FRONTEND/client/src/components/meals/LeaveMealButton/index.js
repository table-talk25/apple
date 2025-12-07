// File: src/components/meals/LeaveMealButton/index.js (Versione Finale)

import React from 'react';
import { useMeals } from '../../../contexts/MealsContext';
import { Button, Spinner } from 'react-bootstrap';

const LeaveMealButton = ({ mealId, onSuccess }) => {
  const { leaveMeal, loading } = useMeals();

  const handleLeave = async () => {
          if (window.confirm('Sei sicuro di voler abbandonare questo TableTalk®?')) {
      try {
        const updatedMeal = await leaveMeal(mealId); // Questa funzione ora restituisce il TableTalk® aggiornato
        if (onSuccess) {
          onSuccess(updatedMeal); // Passiamo l'INTERO TableTalk® aggiornato al genitore
        }
      } catch (error) {
        // Il toast di errore è già gestito dal context
        console.error("Fallimento leaveMeal nel componente:", error);
      }
    }
  };

  return (
    <Button variant="outline-danger" className="w-100" onClick={handleLeave} disabled={loading}>
      {loading ? (
        <>
          <Spinner as="span" animation="border" size="sm" />
          <span> Uscita in corso...</span>
        </>
      ) : (
        'Abbandona il TableTalk®'
      )}
    </Button>
  );
};

export default LeaveMealButton;