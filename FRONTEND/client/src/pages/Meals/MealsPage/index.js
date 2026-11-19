import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import mealService from '../../../services/mealService';
import { useMeals } from '../../../contexts/MealsContext';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getHostAvatarUrl,
  getMealCoverImageUrl,
} from '../../../constants/mealConstants';
import { useMealTranslations } from '../../../hooks/useMealTranslations';
import {
  extractCity,
  formatMealWhen,
  getMealRoleState,
} from '../../../utils/mealFormat';
import { CardT2t, EmptyState, Toast } from '../../../components/ui';
import MealDetailModal from '../../../components/meals/MealDetailModal';
import ShareMealModal from '../../../components/meals/ShareMealModal';
import styles from './MealsPage.module.css';

const FILTER_CHIPS = [
  { id: 'all', i18nKey: 'explore.chips.all', fallback: 'Tutti', kind: 'all' },
  { id: 'lunch', i18nKey: 'explore.chips.lunch', fallback: 'Pranzo', kind: 'type' },
  { id: 'dinner', i18nKey: 'explore.chips.dinner', fallback: 'Cena', kind: 'type' },
  { id: 'aperitif', i18nKey: 'explore.chips.aperitif', fallback: 'Aperitivo', kind: 'type' },
  { id: 'breakfast', i18nKey: 'explore.chips.breakfast', fallback: 'Colazione', kind: 'type' },
  { id: 'virtual', i18nKey: 'explore.chips.video', fallback: '💻 Video', kind: 'mode' },
  { id: 'physical', i18nKey: 'explore.chips.inPerson', fallback: '📍 Dal vivo', kind: 'mode' },
];

const MealsPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { meals, loading, error, fetchMeals, upsertMeal } = useMeals();
  const { getMealTypeText } = useMealTranslations();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [remoteResults, setRemoteResults] = useState(null);
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [shareMeal, setShareMeal] = useState(null);
  const [toastState, setToastState] = useState({ message: '', tone: 'success', visible: false });

  const showToast = useCallback((message, tone = 'success') => {
    setToastState({ message, tone, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToastState((prev) => ({ ...prev, visible: false }));
  }, []);

  // Caricamento feed reale (funziona sia da autenticato che da ospite)
  useEffect(() => {
    fetchMeals({ status: 'upcoming,ongoing' });
  }, [fetchMeals, isAuthenticated]);

  // Ricerca remota debounced (integrata col filtro locale istantaneo)
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setRemoteResults(null);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await mealService.searchMeals(trimmed);
        if (cancelled) return;
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : [];
        setRemoteResults(list);
      } catch (_) {
        if (!cancelled) setRemoteResults(null);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Pool combinato (context + eventuali risultati remoti di ricerca)
  const allMeals = useMemo(() => {
    const map = new Map();
    const base = Array.isArray(meals) ? meals : [];
    base.forEach((m) => {
      if (m && m._id) map.set(m._id, m);
    });
    if (Array.isArray(remoteResults)) {
      remoteResults.forEach((m) => {
        if (m && m._id && !map.has(m._id)) {
          map.set(m._id, m);
        }
      });
    }
    return Array.from(map.values())
      .filter((m) => {
        const status = m.virtualStatus || m.status;
        return status !== 'completed' && status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }, [meals, remoteResults]);

  // Filtro combinato: chips (categoria/formato) + ricerca (titolo, descrizione, tag, lingua, host, città)
  const filteredMeals = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return allMeals.filter((meal) => {
      const chip = FILTER_CHIPS.find((c) => c.id === activeFilter);
      let okFilter = true;
      if (chip && chip.kind === 'type') {
        okFilter = String(meal.type || '').toLowerCase() === chip.id;
      } else if (chip && chip.kind === 'mode') {
        okFilter = String(meal.mealType || '').toLowerCase() === chip.id;
      }

      if (!okFilter) return false;
      if (!q) return true;

      const haystack = [
        meal.title,
        meal.description,
        Array.isArray(meal.topics) ? meal.topics.join(' ') : '',
        meal.language,
        meal.host?.nickname,
        meal.host?.name,
        extractCity(meal.location),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [allMeals, activeFilter, searchTerm]);

  const selectedMeal = useMemo(
    () => (selectedMealId ? allMeals.find((m) => m._id === selectedMealId) || null : null),
    [allMeals, selectedMealId]
  );

  const handleMealChange = useCallback(
    (updated) => {
      if (updated && updated._id) {
        upsertMeal(updated);
      }
    },
    [upsertMeal]
  );

  const hasActiveFilters = activeFilter !== 'all' || searchTerm.trim().length > 0;

  const handleResetFilters = () => {
    setActiveFilter('all');
    setSearchTerm('');
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1>{t('explore.title', 'Esplora i t2t')}</h1>
        <p>{t('explore.subtitle', 'Trova il tuo prossimo tavolo: in video o dal vivo.')}</p>
      </header>

      <div className={styles.searchbar}>
        <Search size={18} strokeWidth={2} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t(
            'explore.searchPlaceholder',
            'Cerca per titolo, argomento o lingua…'
          )}
          aria-label={t(
            'explore.searchPlaceholder',
            'Cerca per titolo, argomento o lingua…'
          )}
          className={styles.searchInput}
        />
        {searchTerm && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => setSearchTerm('')}
            aria-label={t('explore.clearSearch', 'Cancella ricerca')}
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        )}
      </div>

      <div className={styles.chips} role="tablist" aria-label={t('meals.filters.title', 'Filtri')}>
        {FILTER_CHIPS.map((chip) => {
          const active = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.chip} ${active ? styles.chipActive : ''}`}
              onClick={() => setActiveFilter(chip.id)}
              data-filter={chip.id}
            >
              {t(chip.i18nKey, chip.fallback)}
            </button>
          );
        })}
      </div>

      {loading && allMeals.length === 0 ? (
        <div className={styles.grid} aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className={styles.skeletonCard} aria-hidden="true">
              <div className={styles.skeletonCover} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonWide} />
                <div className={styles.skeletonMid} />
                <div className={styles.skeletonShort} />
              </div>
            </div>
          ))}
        </div>
      ) : error && allMeals.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title={t('explore.loadError', 'Impossibile caricare i t2t. Riprova tra poco.')}
          actionLabel={t('common.back', 'Riprova')}
          onAction={() => fetchMeals({ status: 'upcoming,ongoing' })}
        />
      ) : filteredMeals.length > 0 ? (
        <div className={styles.grid}>
          {filteredMeals.map((meal) => {
            const roleState = getMealRoleState(meal, user);
            const hostName = meal.host?.nickname || meal.host?.name || '';
            const coverSrc = meal.imageUrl ? getMealCoverImageUrl(meal.imageUrl) : '';
            const hostAvatarSrc = meal.host?.profileImage
              ? getHostAvatarUrl(meal.host.profileImage)
              : '';
            const seatsFilled = Array.isArray(meal.participants)
              ? meal.participants.length
              : 0;

            return (
              <CardT2t
                key={meal._id}
                title={meal.title}
                coverSrc={coverSrc}
                category={meal.type || 'dinner'}
                categoryLabel={getMealTypeText(meal.type || 'dinner')}
                format={meal.mealType || 'virtual'}
                hostName={hostName}
                hostAvatarSrc={hostAvatarSrc}
                hostVerified={Boolean(
                  meal.host?.isVerified || meal.host?.isEmailVerified
                )}
                when={formatMealWhen(meal.date, i18n.language)}
                duration={meal.duration || 60}
                language={meal.language || ''}
                city={extractCity(meal.location)}
                tags={Array.isArray(meal.topics) ? meal.topics : []}
                seatsFilled={seatsFilled}
                seatsTotal={meal.maxParticipants || 0}
                ctaState={roleState}
                onCardClick={() => setSelectedMealId(meal._id)}
                onActionClick={(state) => {
                  if (state === 'organizer') {
                    navigate('/my-meals');
                  } else {
                    setSelectedMealId(meal._id);
                  }
                }}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="🔍"
          title={
            hasActiveFilters
              ? t(
                  'explore.emptyFiltered',
                  'Nessun t2t trovato. Prova a togliere qualche filtro.'
                )
              : t('explore.emptyAll', 'Nessun t2t in programma al momento.')
          }
          actionLabel={
            hasActiveFilters
              ? t('explore.resetFilters', 'Reimposta filtri')
              : t('explore.createCta', 'Crea un t2t')
          }
          onAction={hasActiveFilters ? handleResetFilters : undefined}
          actionTo={hasActiveFilters ? null : '/meals/create'}
          actionVariant={hasActiveFilters ? 'ghost' : 'primary'}
        />
      )}

      <MealDetailModal
        meal={selectedMeal}
        isOpen={Boolean(selectedMeal)}
        onClose={() => setSelectedMealId(null)}
        onMealChange={handleMealChange}
        onOpenShare={(mealToShare) => setShareMeal(mealToShare)}
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
        tone={toastState.tone}
        visible={toastState.visible}
        onClose={hideToast}
      />
    </div>
  );
};

export default MealsPage;
