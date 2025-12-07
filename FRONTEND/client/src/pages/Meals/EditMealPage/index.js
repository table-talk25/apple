// File: src/pages/Meals/EditMealPage/index.js (Versione Corretta)

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router-dom';
import mealService from '../../../services/mealService';
import { toast } from 'react-toastify';
import { Card, Spinner, Alert, Button } from 'react-bootstrap';
import MealForm from '../../../components/meals/MealForm';
import styles from './EditMealPage.module.css';
import { useMeals } from '../../../contexts/MealsContext'; // <-- 1. IMPORTA L'HOOK
import BackButton from '../../../components/common/BackButton';

const EditMealPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

          // Carichiamo i dati del TableTalk® da modificare
  const fetchMealData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await mealService.getMealById(id);
      setInitialData(response.data); // Salviamo i dati per pre-compilare il form
    } catch (err) {
      setError(err.message || t('meals.loadError'));
              toast.error(t('meals.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchMealData();
  }, [fetchMealData]);

  // Gestiamo il salvataggio delle modifiche
  const handleEditSubmit = async (formData) => {
    setIsUpdating(true);
    try {
      const response = await mealService.updateMeal(id, formData);
              toast.success(t('meals.updateSuccess'));
      navigate(`/meals/${response.data._id}`);
    } catch (err) {
      toast.error(err.message || t('meals.updateError'));
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <div className={styles.loadingContainer}><Spinner animation="border" /></div>;
  if (error) return <div className={styles.errorContainer}><Alert variant="danger">{error}</Alert></div>;

  return (
    <div className={styles.editPage}>
      <div className={styles.topBar}>
        <BackButton className={styles.backButton} />
      </div>
      <Card className={styles.card}>
        <Card.Body className="p-4 p-md-5">
          <h2 className={styles.title}>{t('meals.editMeal')}</h2>
          {initialData ? (
            <MealForm
              initialData={initialData}
              onSubmit={handleEditSubmit}
              isLoading={isUpdating}
              submitButtonText={t('forms.saveChanges')}
            />
          ) : (
            <Alert variant="warning">{t('meals.noMeals')}</Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default EditMealPage;