// File: src/components/meals/MealFilters/index.js (Versione Corretta)

import React, { useState } from 'react';
import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import styles from './MealFilters.module.css';
import { MEAL_MODES } from '../../../constants/mealConstants';
import { useMealTranslations } from '../../../hooks/useMealTranslations';

// Il componente ora riceve i filtri e la funzione onFilterChange come props
const MealFilters = ({ filters, onFilterChange }) => {
  const { t } = useTranslation();
  const { getMealTypeOptions, getMealModeOptions } = useMealTranslations();

  // Funzione interna per gestire il cambiamento e notificare il genitore
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Chiamiamo la funzione del genitore passandogli i nuovi valori
    onFilterChange(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
  };

  // Funzione per resettare tutti i filtri ai valori di default
  const handleReset = () => {
    onFilterChange(() => ({
      type: '',
      mealType: '', // Reset anche il tipo di TableTalk®
      status: '',
      sortBy: 'date',
    }));
  };

  const [expanded, setExpanded] = useState(true);

  return (
    <div className={styles.filtersCard}> 
      <div className={styles.filtersHeader}>
        <h4>{t('meals.filters.title')}</h4>
        <div>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setExpanded(prev => !prev)}
            aria-expanded={expanded}
          >
            {expanded ? 'Nascondi' : 'Mostra filtri'}
          </button>
          <button type="button" className={styles.resetButton} onClick={handleReset}>
            {t('meals.filters.resetFilters')}
          </button>
        </div>
      </div>

      {/* Mostra la barra compatta solo quando i filtri sono chiusi */}
      {!expanded && (
        <div className={styles.compactBar}>
          <span className={styles.chip}>{t('meals.filters.mealType')}: <span className={styles.chipValue}>{filters.type || t('meals.filters.allTypes')}</span></span>
          <span className={styles.chip}>{t('meals.filters.mode')}: <span className={styles.chipValue}>{filters.mealType || t('meals.filters.allModes')}</span></span>
          <span className={styles.chip}>{t('meals.filters.status')}: <span className={styles.chipValue}>{filters.status || t('meals.filters.allStatus')}</span></span>
          <span className={styles.chip}>{t('meals.filters.sortBy')}: <span className={styles.chipValue}>{filters.sortBy === 'participants' ? t('meals.filters.participantsMost') : t('meals.filters.dateClosest')}</span></span>
        </div>
      )}

      {expanded && (
      <Form>
        <div className={styles.filtersGrid}>
        <Form.Group>
          <Form.Label>{t('meals.filters.mealType')}</Form.Label>
          <Form.Select className={styles.select} name="type" value={filters.type} onChange={handleChange}>
            <option value="">{t('meals.filters.allTypes')}</option>
            {getMealTypeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group>
          <Form.Label>{t('meals.filters.mode')}</Form.Label>
          <Form.Select className={styles.select} name="mealType" value={filters.mealType} onChange={handleChange}>
            <option value="">{t('meals.filters.allModes')}</option>
            {getMealModeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label} {option.value === MEAL_MODES.VIRTUAL ? '🎥' : '📍'}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group>
          <Form.Label>{t('meals.filters.status')}</Form.Label>
          <Form.Select className={styles.select} name="status" value={filters.status} onChange={handleChange}>
            <option value="">{t('meals.filters.allStatus')}</option>
            <option value="upcoming">{t('meals.mealStatus.upcoming')}</option>
            <option value="ongoing">{t('meals.mealStatus.ongoing')}</option>
          </Form.Select>
        </Form.Group>

        <Form.Group>
          <Form.Label>{t('meals.filters.sortBy')}</Form.Label>
          <Form.Select className={styles.select} name="sortBy" value={filters.sortBy} onChange={handleChange}>
            <option value="date">{t('meals.filters.dateClosest')}</option>
            <option value="participants">{t('meals.filters.participantsMost')}</option>
          </Form.Select>
        </Form.Group>
        </div>
      </Form>
      )}
    </div>
  );
};

export default MealFilters;