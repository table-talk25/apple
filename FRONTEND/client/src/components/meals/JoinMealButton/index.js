// File: src/components/meals/JoinMealButton/index.js (Versione Finale e Corretta)
import React from 'react';
import { useMeals } from '../../../contexts/MealsContext';
import { Button, Spinner } from 'react-bootstrap';
import styles from './JoinMealButton.module.css';

const JoinMealButton = ({ mealId, onSuccess }) => {
  // Prendiamo la funzione e lo stato di caricamento direttamente dal context!
  const { joinMeal, loading } = useMeals();

  const handleJoinClick = async () => {
    try {
      const updatedMeal = await joinMeal(mealId);
      if (updatedMeal && onSuccess) {
        onSuccess(updatedMeal);
      }
    } catch (error) {
      // L'errore è già gestito e mostrato dal toast nel context
      console.error("Fallimento joinMeal nel componente:", error);
    }
  };

  return (
    <Button
      className={styles.joinButton}
      onClick={handleJoinClick}
      disabled={loading}
    >
      {loading ? (
        <>
          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
          <span> Attendi...</span>
        </>
              ) : 'Unisciti al TableTalk®'}
    </Button>
  );
};

export default JoinMealButton;