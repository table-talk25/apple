import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import mealService from '../services/mealService';
import { useAuth } from '../contexts/AuthContext';
import { useMeals } from '../contexts/MealsContext';
import { applyOptimisticJoin, applyOptimisticLeave } from '../utils/mealFormat';

const extractServerMeal = (response) => {
  if (response?.data && response.data._id) return response.data;
  if (response && response._id) return response;
  return null;
};

const useOptimisticMealActions = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { upsertMeal } = useMeals();
  const [pendingMealId, setPendingMealId] = useState(null);

  const joinOptimistic = useCallback(
    async (meal, { onUpdate, onToast } = {}) => {
      if (!meal || !meal._id) return null;
      if (!isAuthenticated || !user) {
        const msg = t('detail.loginRequiredJoin', 'Accedi per partecipare a questo t2t.');
        if (onToast) onToast(msg, 'info');
        else toast.info(msg);
        navigate('/login');
        return null;
      }

      const previousMeal = meal;
      const optimisticMeal = applyOptimisticJoin(meal, user);

      setPendingMealId(meal._id);
      if (onUpdate) onUpdate(optimisticMeal);
      upsertMeal(optimisticMeal);

      try {
        const response = await mealService.joinMeal(meal._id);
        const serverMeal = extractServerMeal(response) || optimisticMeal;
        if (onUpdate) onUpdate(serverMeal);
        upsertMeal(serverMeal);
        const successMsg = t('detail.toasts.join', '🎉 Sei dentro! Lo trovi in «I miei t2t».');
        if (onToast) onToast(successMsg, 'success');
        else toast.success(successMsg);
        return serverMeal;
      } catch (err) {
        // Rollback ottimistico completo su errore API
        if (onUpdate) onUpdate(previousMeal);
        upsertMeal(previousMeal);
        const serverMsg = err?.response?.data?.message;
        const errorMsg =
          serverMsg || t('detail.toasts.joinError', 'Impossibile iscriversi al tavolo. Riprova.');
        if (onToast) onToast(errorMsg, 'error');
        else toast.error(errorMsg);
        return null;
      } finally {
        setPendingMealId(null);
      }
    },
    [isAuthenticated, user, navigate, upsertMeal, t]
  );

  const leaveOptimistic = useCallback(
    async (meal, { onUpdate, onToast } = {}) => {
      if (!meal || !meal._id) return null;
      if (!isAuthenticated || !user) {
        navigate('/login');
        return null;
      }

      const previousMeal = meal;
      const optimisticMeal = applyOptimisticLeave(meal, user);

      setPendingMealId(meal._id);
      if (onUpdate) onUpdate(optimisticMeal);
      upsertMeal(optimisticMeal);

      try {
        const response = await mealService.leaveMeal(meal._id);
        const serverMeal = extractServerMeal(response) || optimisticMeal;
        if (onUpdate) onUpdate(serverMeal);
        upsertMeal(serverMeal);
        const successMsg = t(
          'detail.toasts.leave',
          'Hai abbandonato il tavolo. Il posto è tornato libero.'
        );
        if (onToast) onToast(successMsg, 'success');
        else toast.success(successMsg);
        return serverMeal;
      } catch (err) {
        // Rollback ottimistico completo su errore API
        if (onUpdate) onUpdate(previousMeal);
        upsertMeal(previousMeal);
        const serverMsg = err?.response?.data?.message;
        const errorMsg =
          serverMsg || t('detail.toasts.leaveError', 'Impossibile abbandonare il tavolo. Riprova.');
        if (onToast) onToast(errorMsg, 'error');
        else toast.error(errorMsg);
        return null;
      } finally {
        setPendingMealId(null);
      }
    },
    [isAuthenticated, user, navigate, upsertMeal, t]
  );

  return {
    joinOptimistic,
    leaveOptimistic,
    pendingMealId,
    isPending: (mealId) => Boolean(mealId && pendingMealId === mealId),
  };
};

export default useOptimisticMealActions;
