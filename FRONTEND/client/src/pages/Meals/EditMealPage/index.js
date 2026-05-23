// File: src/pages/Meals/EditMealPage/index.js (Versione Corretta)

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router-dom';
import mealService from '../../../services/mealService';
import { toast } from 'react-toastify';
import { Card, Spinner, Alert, Button } from 'react-bootstrap';
import MealForm from '../../../components/meals/MealForm';
import styles from './EditMealPage.module.css';
import { useMeals } from '../../../contexts/MealsContext';
import BackButton from '../../../components/common/BackButton';

const EditMealPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const fetchMealData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await mealService.getMealById(id);
      // getMealById restituisce response.data già estratto da apiClient
      // la struttura è { success, data: { ...meal } } oppure direttamente il meal
      const meal = response?.data ?? response;
      setInitialData(meal);
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

  const handleEditSubmit = async (formData) => {
    setIsUpdating(true);
    try {
      const response = await mealService.updateMeal(id, formData);
      toast.success(t('meals.updateSuccess'));
      // ✅ FIX: updateMeal ritorna response.data = { success, data: { ...meal } }
      // quindi l'_id si trova in response.data._id oppure response._id
      const updatedId = response?.data?._id ?? response?._id ?? id;
      navigate(`/meals/${updatedId}`);
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
