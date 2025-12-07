// File: src/components/meals/MealsList/index.js (Versione Carosello)

import React from 'react';
import { useTranslation } from 'react-i18next';
import MealCard from '../MealCard'; // Importiamo la nostra card
import styles from './MealsList.module.css'; // Useremo il suo stile dedicato

const MealsList = ({ meals }) => {
  const { t } = useTranslation();
  
  if (!meals || meals.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3>{t('meals.emptyState.title')}</h3>
        <p>{t('meals.emptyState.description')}</p>
      </div>
    );
  }

  // Il nostro contenitore ora è un 'carousel'
  return (
    <div className={styles.carousel}>
      {meals.map(meal => (
        // Ogni card è un 'carouselItem'
        <div key={meal._id} className={styles.carouselItem}>
          <MealCard meal={meal} compact />
        </div>
      ))}
    </div>
  );
};

export default MealsList;