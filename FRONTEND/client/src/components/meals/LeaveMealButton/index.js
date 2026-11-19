import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMeals } from '../../../contexts/MealsContext';
import { Button } from '../../ui';

const LeaveMealButton = ({ mealId, onSuccess, className = '' }) => {
  const { t } = useTranslation();
  const { leaveMeal, isActionLoading } = useMeals();
  const [confirming, setConfirming] = useState(false);
  const isLeaving = isActionLoading(mealId);

  const handleConfirmLeave = async () => {
    setConfirming(false);
    try {
      const updatedMeal = await leaveMeal(mealId);
      if (onSuccess) {
        onSuccess(updatedMeal);
      }
    } catch (error) {
      console.error('Fallimento leaveMeal nel componente:', error);
    }
  };

  if (confirming) {
    return (
      <div
        role="region"
        aria-live="polite"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '10px',
          borderRadius: 'var(--tt-radius-md)',
          border: '1px solid var(--tt-border)',
          backgroundColor: 'var(--tt-background)',
        }}
      >
        <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--tt-text)' }}>
          {t('detail.leaveConfirmQuestion', 'Vuoi davvero abbandonare questo t2t?')}
        </span>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={isLeaving}
          >
            {t('detail.leaveConfirmCancel', 'Annulla')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirmLeave}
            disabled={isLeaving}
          >
            {isLeaving
              ? t('detail.leaving', 'Uscita…')
              : t('detail.leaveConfirmYes', 'Sì, abbandona')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="danger"
      fullWidth
      className={className}
      onClick={() => setConfirming(true)}
      disabled={isLeaving}
    >
      {isLeaving
        ? t('detail.leaving', 'Uscita…')
        : t('detail.leave', 'Abbandona')}
    </Button>
  );
};

export default LeaveMealButton;
