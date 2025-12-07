// File: src/components/meals/EditMealButton/index.js (Versione Finale e Pulita)

import React from 'react';
import { Link } from 'react-router-dom';
import styles from './EditMealButton.module.css';

const EditMealButton = ({ mealId }) => {
  return (
    <Link to={`/meals/edit/${mealId}`} className={styles.editButton}>
              Modifica TableTalk®
    </Link>
  );
};

export default EditMealButton;