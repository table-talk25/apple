import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useMeals } from '../../../contexts/MealsContext';
import MealForm from '../../../components/meals/MealForm';
import styles from './CreateMealPage.module.css';

const CreateMealPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createMeal } = useMeals();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const subscriptions = [];
    (async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const showSub = await Keyboard.addListener('keyboardWillShow', () =>
            setKeyboardOpen(true)
          );
          const hideSub = await Keyboard.addListener('keyboardWillHide', () =>
            setKeyboardOpen(false)
          );
          subscriptions.push(showSub, hideSub);
        }
      } catch (_) {}
    })();

    return () => {
      subscriptions.forEach((sub) => {
        try {
          sub.remove();
        } catch (_) {}
      });
    };
  }, []);

  const handleCreateSubmit = async (formData) => {
    setIsLoading(true);
    setError('');

    try {
      await createMeal(formData);
      toast.success(
        t('create.successToast', '🎉 Il tuo t2t è online! Invita i primi commensali.')
      );
      navigate('/my-meals');
    } catch (err) {
      const isTransientNetwork =
        !err.response?.status &&
        (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED');
      const errorMessage =
        err.response?.data?.message ||
        t('create.errorToast', 'Impossibile creare il t2t. Controlla i campi e riprova.');
      setError(errorMessage);
      if (!isTransientNetwork) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={styles.page}
      style={keyboardOpen ? { paddingBottom: 96 } : undefined}
    >
      <header className={styles.pageHead}>
        <h1>{t('create.title', 'Crea un t2t')}</h1>
        <p>
          {t(
            'create.subtitle',
            "Apparecchia il tuo tavolo: bastano un minuto e un'idea."
          )}
        </p>
      </header>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <MealForm
        onSubmit={handleCreateSubmit}
        isLoading={isLoading}
        isSubmitting={isLoading}
        submitButtonText={t('create.submitCta', 'Crea il t2t')}
      />
    </div>
  );
};

export default CreateMealPage;
