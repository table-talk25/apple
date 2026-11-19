import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import mealService from '../../../services/mealService';
import { getMealCoverImageUrl } from '../../../constants/mealConstants';
import { useAuth } from '../../../contexts/AuthContext';
import { useChatDrawer } from '../../../contexts/ChatDrawerContext';
import useOptimisticMealActions from '../../../hooks/useOptimisticMealActions';
import {
  extractCity,
  formatMealWhen,
  isUserHost,
  isUserParticipant,
} from '../../../utils/mealFormat';
import { Button, Cover, EmptyState, Seats, Toast } from '../../../components/ui';
import MealDetailModal from '../../../components/meals/MealDetailModal';
import ShareMealModal from '../../../components/meals/ShareMealModal';
import styles from './MealHistoryPage.module.css';

const MealHistoryPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openChat, openDrawer } = useChatDrawer();
  const { leaveOptimistic, isPending } = useOptimisticMealActions();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allMeals, setAllMeals] = useState([]);
  const [activeTab, setActiveTab] = useState('organizing'); // 'organizing' | 'participating'
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [shareMeal, setShareMeal] = useState(null);
  const [confirmingLeaveId, setConfirmingLeaveId] = useState(null);
  const [toastState, setToastState] = useState({ message: '', tone: 'success', visible: false });

  const showToast = useCallback((message, tone = 'success') => {
    setToastState({ message, tone, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToastState((prev) => ({ ...prev, visible: false }));
  }, []);

  const loadMeals = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await mealService.getUserMeals({ suppressErrorAlert: true });
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];
      setAllMeals(list);
    } catch (err) {
      console.error('Errore caricamento t2t:', err);
      setError(
        t('mine.loadError', 'Impossibile caricare i tuoi t2t. Riprova.')
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) {
      loadMeals();
    } else {
      setLoading(false);
    }
  }, [user, loadMeals]);

  const myHostedMeals = useMemo(
    () => allMeals.filter((meal) => isUserHost(meal, user)),
    [allMeals, user]
  );

  const myJoinedMeals = useMemo(
    () =>
      allMeals.filter(
        (meal) =>
          !isUserHost(meal, user) &&
          (!Array.isArray(meal.participants) || isUserParticipant(meal, user))
      ),
    [allMeals, user]
  );

  const visibleMeals = activeTab === 'organizing' ? myHostedMeals : myJoinedMeals;

  const selectedMeal = useMemo(
    () => (selectedMealId ? allMeals.find((m) => m._id === selectedMealId) || null : null),
    [allMeals, selectedMealId]
  );

  const handleMealChange = useCallback((updated) => {
    if (!updated || !updated._id) return;
    setAllMeals((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
  }, []);

  const handleOpenChat = (meal) => {
    const chatId = typeof meal.chatId === 'object' ? meal.chatId?._id : meal.chatId;
    if (chatId) {
      openChat(chatId);
    } else {
      openDrawer();
    }
  };

  const handleConfirmLeave = async (meal) => {
    setConfirmingLeaveId(null);
    await leaveOptimistic(meal, {
      onUpdate: handleMealChange,
      onToast: showToast,
    });
  };

  const handleCardKeyDown = (e, mealId) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedMealId(mealId);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1>{t('mine.title', 'I miei t2t')}</h1>
        <p>
          {t(
            'mine.subtitle',
            'I tavoli che organizzi e quelli a cui partecipi.'
          )}
        </p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label={t('mine.title', 'I miei t2t')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'organizing'}
          className={`${styles.tab} ${activeTab === 'organizing' ? styles.tabActive : ''}`}
          onClick={() => {
            setConfirmingLeaveId(null);
            setActiveTab('organizing');
          }}
          data-testid="tab-organizing"
        >
          {t('mine.tabOrganizing', 'Organizzo io')}
          <span className={styles.tabCount}>({myHostedMeals.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'participating'}
          className={`${styles.tab} ${activeTab === 'participating' ? styles.tabActive : ''}`}
          onClick={() => {
            setConfirmingLeaveId(null);
            setActiveTab('participating');
          }}
          data-testid="tab-participating"
        >
          {t('mine.tabParticipating', 'Partecipo')}
          <span className={styles.tabCount}>({myJoinedMeals.length})</span>
        </button>
      </div>

      {loading ? (
        <div className={styles.mineList} aria-busy="true">
          {[0, 1].map((idx) => (
            <div key={idx} className={styles.skeletonCard}>
              <div className={styles.skeletonThumb} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonWide} />
                <div className={styles.skeletonMid} />
                <div className={styles.skeletonShort} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title={error}
          actionLabel={t('mine.retry', 'Riprova')}
          onAction={loadMeals}
          actionVariant="ghost"
        />
      ) : visibleMeals.length === 0 ? (
        <EmptyState
          title={t('mine.emptyTitle', 'Ancora nessun t2t qui.')}
          actionLabel={t('mine.emptyCta', 'Crea il primo →')}
          actionTo="/meals/create"
          actionVariant="primary"
        />
      ) : (
        <div className={styles.mineList} role="tabpanel">
          {visibleMeals.map((meal) => {
            const coverSrc = meal.imageUrl ? getMealCoverImageUrl(meal.imageUrl) : '';
            const city = meal.mealType === 'physical' ? extractCity(meal.location) : '';
            const seatsFilled = Array.isArray(meal.participants) ? meal.participants.length : 0;
            const seatsTotal = Number(meal.maxParticipants) || 0;
            const isOrganizer = activeTab === 'organizing';
            const pending = isPending(meal._id);
            const confirmingThis = confirmingLeaveId === meal._id;

            return (
              <article
                key={meal._id}
                className={styles.mineCard}
                onClick={() => setSelectedMealId(meal._id)}
                onKeyDown={(e) => handleCardKeyDown(e, meal._id)}
                tabIndex={0}
                data-testid={`mine-card-${meal._id}`}
              >
                <Cover
                  mini
                  src={coverSrc}
                  alt={meal.title}
                  category={meal.type || 'dinner'}
                  format={meal.mealType || 'virtual'}
                  showBadges={false}
                />

                <div className={styles.mineBody}>
                  <h2 className={styles.cardTitle}>{meal.title}</h2>

                  <div className={styles.meta}>
                    <span>🕒 {formatMealWhen(meal.date, i18n.language)}</span>
                    <span>
                      ⏱ {meal.duration || 60} {t('ui.card.minutes', 'min')}
                    </span>
                    <span>🌍 {meal.language || 'Italiano'}</span>
                    {city && <span>📍 {city}</span>}
                  </div>

                  <div className={styles.seatsRow}>
                    <Seats filled={seatsFilled} total={seatsTotal} />
                  </div>

                  {isOrganizer ? (
                    <div
                      className={styles.mineActions}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShareMeal(meal)}
                        data-testid={`mine-invite-btn-${meal._id}`}
                      >
                        {t('mine.invite', 'Invita')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/meals/edit/${meal._id}`)}
                        data-testid={`mine-edit-btn-${meal._id}`}
                      >
                        {t('mine.edit', 'Modifica')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShareMeal(meal)}
                        data-testid={`mine-share-btn-${meal._id}`}
                      >
                        {t('mine.share', 'Condividi')}
                      </Button>
                    </div>
                  ) : confirmingThis ? (
                    <div
                      className={styles.confirmBar}
                      role="region"
                      aria-live="polite"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className={styles.confirmText}>
                        {t('mine.leaveConfirmShort', 'Vuoi abbandonare questo t2t?')}
                      </p>
                      <div className={styles.confirmBtns}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingLeaveId(null)}
                          disabled={pending}
                        >
                          {t('mine.cancel', 'Annulla')}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleConfirmLeave(meal)}
                          disabled={pending}
                          data-testid={`mine-confirm-leave-btn-${meal._id}`}
                        >
                          {t('mine.leaveConfirmYes', 'Sì, abbandona')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={styles.mineActions}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="green"
                        size="sm"
                        onClick={() => handleOpenChat(meal)}
                        data-testid={`mine-chat-btn-${meal._id}`}
                      >
                        {t('mine.openChat', 'Apri chat')}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmingLeaveId(meal._id)}
                        disabled={pending}
                        data-testid={`mine-leave-btn-${meal._id}`}
                      >
                        {t('mine.leave', 'Abbandona')}
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <MealDetailModal
        meal={selectedMeal}
        isOpen={Boolean(selectedMeal)}
        onClose={() => setSelectedMealId(null)}
        onMealChange={handleMealChange}
        onOpenShare={(targetMeal) => setShareMeal(targetMeal)}
        onToast={showToast}
      />

      <ShareMealModal
        meal={shareMeal}
        isOpen={Boolean(shareMeal)}
        onClose={() => setShareMeal(null)}
        onToast={showToast}
      />

      <Toast
        message={toastState.message}
        visible={toastState.visible}
        tone={toastState.tone}
        onClose={hideToast}
      />
    </div>
  );
};

export default MealHistoryPage;
