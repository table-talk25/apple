// File: src/components/profile/MealHistory/index.js (Versione di sola anteprima)
import React from 'react';
import MealCard from '../../meals/MealCard';
import styles from './MealHistory.module.css';

const MealHistory = ({ createdMeals = [], participatedMeals = [] }) => {
  return (
    <div className={styles.mealHistoryContainer}>
      <div className={styles.mealsSectionsWrapper}>
        <div className={styles.createdMeals}>
          <h3>TableTalk® creati da te</h3>
          <div className={styles.mealsList}>
            {createdMeals.length > 0 ? (
              createdMeals.slice(0, 3).map(meal => <MealCard key={meal._id} meal={meal} />)
            ) : (
              <p className={styles.noMeals}>Non hai ancora creato nessun TableTalk®.</p>
            )}
          </div>
        </div>

        <div className={styles.participatedMeals}>
          <h3>TableTalk® a cui hai partecipato</h3>
          <div className={styles.mealsList}>
            {participatedMeals.length > 0 ? (
              participatedMeals.slice(0, 3).map(meal => <MealCard key={meal._id} meal={meal} />)
            ) : (
              <p className={styles.noMeals}>Non hai ancora partecipato a nessun TableTalk®.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealHistory;