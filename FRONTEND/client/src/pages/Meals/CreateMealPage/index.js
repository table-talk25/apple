import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useMeals } from '../../../contexts/MealsContext';
import MealForm from '../../../components/meals/MealForm';
import MemberPicker from '../../../components/tribe/MemberPicker';
import tribeService from '../../../services/tribeService';
import styles from './CreateMealPage.module.css';

const CreateMealPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createMeal } = useMeals();
  const location = useLocation();

  // t2t privato: membri della tribù da invitare (preselezionati da scheda contatto / tribù / lista)
  const initialInvitees = Array.isArray(location.state?.inviteeIds)
    ? location.state.inviteeIds.map(String)
    : null;
  const [privateMode, setPrivateMode] = useState(initialInvitees !== null);
  const [inviteeIds, setInviteeIds] = useState(initialInvitees || []);
  const [tribeMembers, setTribeMembers] = useState([]);
  const [tribeLists, setTribeLists] = useState([]);

  useEffect(() => {
    if (!privateMode) return;
    (async () => {
      try {
        const [tribe, lists] = await Promise.all([tribeService.getMyTribe(), tribeService.getLists()]);
        setTribeMembers(Array.isArray(tribe?.members) ? tribe.members : []);
        setTribeLists(lists);
      } catch (_) {}
    })();
  }, [privateMode]);

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
      if (privateMode && inviteeIds.length > 0) {
        formData.set('isPublic', 'false');
        formData.set('invitedUserIds', JSON.stringify(inviteeIds));
      }
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

      <section style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={privateMode}
            onChange={(e) => setPrivateMode(e.target.checked)}
          />
          {t('create.privateToggle', '🔒 t2t privato: invita persone della mia tribù')}
        </label>
        {privateMode && (
          <div style={{ marginTop: 10 }}>
            <MemberPicker
              members={tribeMembers}
              selectedIds={inviteeIds}
              onChange={setInviteeIds}
              lists={tribeLists}
              defaultOpen={inviteeIds.length === 0}
            />
            <p style={{ fontSize: '0.85rem', opacity: 0.75, margin: '6px 0 0' }}>
              {t(
                'create.privateHint',
                'Solo le persone selezionate vedranno il t2t e potranno unirsi.'
              )}
            </p>
          </div>
        )}
      </section>

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
