// File: /src/pages/Meals/CreateMealPage/index.js (Versione Finale Ristrutturata)

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import mealService from '../../../services/mealService'; 
import { useMeals } from '../../../contexts/MealsContext';
import { toast } from 'react-toastify';
import MealForm from '../../../components/meals/MealForm'; 
import styles from './CreateMealPage.module.css';
import BackButton from '../../../components/common/BackButton';
// import { Capacitor } from '@capacitor/core'; // Non utilizzato direttamente

const CreateMealPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createMeal, fetchMeals, upsertMeal } = useMeals();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 🚀 FLUSSO UNIFICATO: Crea il pasto con l'immagine in una sola richiesta
  const handleCreateSubmit = async (formData) => {
    console.log('🚀 [CreateMeal] Inizio creazione pasto...');
    console.log('🚀 [CreateMeal] FormData ricevuto:', formData);
    
    // Debug: mostra tutti i campi del FormData
    if (formData instanceof FormData) {
      console.log('🚀 [CreateMeal] Campi FormData:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }
    }
    
    setIsLoading(true);
    setError(''); // Pulisci eventuali errori precedenti
    
    try {
      console.log('📡 [CreateMeal] Chiamando createMeal (context)...');
      
      // 🚀 INVIA TUTTO INSIEME: pasto + immagine in una sola richiesta
      const newMeal = await createMeal(formData);
      console.log('✅ [CreateMeal] Pasto creato con successo:', newMeal);
      console.log('✅ [CreateMeal] newMeal._id:', newMeal._id);
      
      // Mostra successo immediato
      toast.success(t('meals.createSuccess'));
      
      // Naviga direttamente al pasto creato
      setTimeout(() => {
        console.log('🚀 [CreateMeal] Eseguendo navigazione...');
        navigate(`/meals/${newMeal._id}`);
      }, 800);
      
    } catch (error) {
      console.error('❌ [CreateMeal] Errore nella creazione:', error);
      console.error('❌ [CreateMeal] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      // Non mostrare toast rosso per errori di rete transitori
      const isTransientNetwork = !error.response?.status && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED');
      const errorMessage = error.response?.data?.message || t('meals.createError');
      setError(errorMessage);
      if (!isTransientNetwork) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione uploadMealImage rimossa - ora inviamo tutto insieme

  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    let subscriptions = [];
    (async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        const { Capacitor } = await import('@capacitor/core');
        
        if (Capacitor.isNativePlatform()) {
          const showSub = Keyboard.addListener('keyboardWillShow', () => setKeyboardOpen(true));
          const hideSub = Keyboard.addListener('keyboardWillHide', () => setKeyboardOpen(false));
          subscriptions.push(showSub, hideSub);
        }
      } catch (_) {}
    })();
    return () => {
      subscriptions.forEach(sub => { try { sub.remove(); } catch (_) {} });
    };
  }, []);

  return (
    <div className={styles.createMealPage} style={keyboardOpen ? { paddingBottom: 90 } : undefined}>
      <div className={styles.topBar}>
        <BackButton className={styles.backButton} />
      </div>
      <header className={styles.createMealHeader}>
        <h1 className={styles.createMealTitle}>{t('meals.createNewTitle')}</h1>
        <p className={styles.createMealSubtitle}>{t('meals.createNewSubtitle')}</p>
      </header>

      <div className={styles.createMealContent}>
        {error && (
          <div className={styles.errorMessage} style={{ 
            color: 'red', 
            backgroundColor: '#ffe6e6', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '20px',
            border: '1px solid #ff9999'
          }}>
            {error}
          </div>
        )}

        <MealForm
          onSubmit={handleCreateSubmit}
          isLoading={isLoading}
          isSubmitting={isLoading}
          submitButtonText={t('meals.createButton')}
        />
      </div>
    </div>
  );
};

export default CreateMealPage;