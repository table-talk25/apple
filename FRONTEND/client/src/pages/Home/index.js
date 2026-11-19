import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import 'dayjs/locale/en';
import { Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import mealService from '../../services/mealService';
import {
  getHostAvatarUrl,
  getMealCoverImageUrl,
} from '../../constants/mealConstants';
import { useMealTranslations } from '../../hooks/useMealTranslations';
import { Button, CardT2t, EmptyState } from '../../components/ui';
import styles from './HomePage.module.css';

const extractCity = (location) => {
  if (!location) return '';
  if (typeof location === 'string') {
    const trimmed = location.trim();
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(trimmed)) return '';
    return trimmed.split(',')[0].trim();
  }
  if (typeof location === 'object') {
    if (location.city) return String(location.city).trim();
    if (location.address) return String(location.address).split(',')[0].trim();
  }
  return '';
};

const formatMealWhen = (dateValue, langCode) => {
  if (!dateValue) return '';
  const locale = (langCode || 'it').toLowerCase().startsWith('en') ? 'en' : 'it';
  const parsed = dayjs(dateValue).locale(locale);
  if (!parsed.isValid()) return '';
  return parsed.format('DD MMM · HH:mm');
};

const computeLivePeopleCount = (meals) => {
  if (!Array.isArray(meals) || meals.length === 0) return 0;
  const uniquePeople = new Set();
  let fallbackCount = 0;

  meals.forEach((meal) => {
    const status = meal?.virtualStatus || meal?.status;
    if (status !== 'ongoing') return;

    const participants = Array.isArray(meal.participants) ? meal.participants : [];
    participants.forEach((p) => {
      const id = typeof p === 'object' ? p?._id || p?.id : p;
      if (id) uniquePeople.add(String(id));
      else fallbackCount += 1;
    });

    const hostId =
      typeof meal.host === 'object' ? meal.host?._id || meal.host?.id : meal.host;
    if (hostId) uniquePeople.add(String(hostId));
  });

  return uniquePeople.size + fallbackCount;
};

function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const { t, i18n } = useTranslation();
  const { getMealTypeText } = useMealTranslations();
  const navigate = useNavigate();

  const [meals, setMeals] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadHomeMeals = async () => {
      setLoadingMeals(true);
      try {
        const response = await mealService.getMeals({
          status: 'upcoming,ongoing',
          limit: 24,
          suppressErrorAlert: true,
        });
        if (cancelled) return;
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : [];
        setMeals(list);
      } catch (_) {
        if (!cancelled) {
          setMeals([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingMeals(false);
        }
      }
    };

    loadHomeMeals();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const livePeopleCount = useMemo(() => computeLivePeopleCount(meals), [meals]);

  const featuredMeals = useMemo(() => {
    const active = meals.filter((meal) => {
      if (!meal || !meal._id) return false;
      const status = meal.virtualStatus || meal.status;
      return status !== 'completed' && status !== 'cancelled';
    });
    return active.slice(0, 6);
  }, [meals]);

  const currentUserId = user?.id || user?._id || null;

  const getCtaState = (meal) => {
    const hostId =
      typeof meal.host === 'object' ? meal.host?._id || meal.host?.id : meal.host;
    if (currentUserId && hostId && String(hostId) === String(currentUserId)) {
      return 'organizer';
    }
    const participants = Array.isArray(meal.participants) ? meal.participants : [];
    const isJoined =
      currentUserId &&
      participants.some((p) => {
        const pid = typeof p === 'object' ? p?._id || p?.id : p;
        return pid && String(pid) === String(currentUserId);
      });
    if (isJoined) return 'joined';

    const maxP = Number(meal.maxParticipants) || 0;
    if (maxP > 0 && participants.length >= maxP) return 'full';

    return 'available';
  };

  const handleScrollToTables = (e) => {
    e.preventDefault();
    const target = document.getElementById('home-tavoli');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const steps = [
    {
      num: t('home.howItWorks.step1.num', '01'),
      title: t('home.howItWorks.step1.title'),
      description: t('home.howItWorks.step1.description'),
    },
    {
      num: t('home.howItWorks.step2.num', '02'),
      title: t('home.howItWorks.step2.title'),
      description: t('home.howItWorks.step2.description'),
    },
    {
      num: t('home.howItWorks.step3.num', '03'),
      title: t('home.howItWorks.step3.title'),
      description: t('home.howItWorks.step3.description'),
    },
  ];

  const values = [
    {
      icon: '☕',
      title: t('home.whyTableTalk.feature1.title'),
      description: t('home.whyTableTalk.feature1.description'),
    },
    {
      icon: '🌍',
      title: t('home.whyTableTalk.feature2.title'),
      description: t('home.whyTableTalk.feature2.description'),
    },
    {
      icon: '🛡️',
      title: t('home.whyTableTalk.feature3.title'),
      description: t('home.whyTableTalk.feature3.description'),
    },
  ];

  const trustItems = [
    t('home.trust.verifiedProfiles', 'Profili verificati'),
    t('home.trust.protectedChatVideo', 'Chat e video protetti'),
    t('home.trust.adultsOnly', 'Solo maggiorenni'),
  ];

  return (
    <div className={styles.home}>
      {/* --- HERO --- */}
      <section className={styles.hero}>
        {livePeopleCount > 0 && (
          <div className={styles.livePill} role="status">
            <span className={styles.liveDot} aria-hidden="true" />
            <span>{t('home.livePill', { count: livePeopleCount })}</span>
          </div>
        )}

        <h1 className={styles.heroTitle}>
          {t('home.heroTitlePrefix', 'Condividi un')}{' '}
          <em>{t('home.heroTitleAccent', 'table2Talk.')}</em>
          <br />
          {t('home.heroTitleSecondLine', 'Crea una connessione.')}
        </h1>

        <p className={styles.heroSubtitle}>{t('home.heroSubtitle')}</p>

        <div className={styles.heroCta}>
          {isAuthenticated ? (
            <>
              <Button variant="primary" to="/meals/create">
                {t('home.createTableTalk')}
              </Button>
              <Button variant="ghost" to="/meals">
                {t('home.exploreTableTalk')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" to="/register">
                {t('home.registerNow')}
              </Button>
              <Button variant="ghost" to="/login">
                {t('home.login')}
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className={styles.heroLink}
          onClick={handleScrollToTables}
        >
          {t('home.seeTodayTables', 'Guarda i tavoli di oggi ↓')}
        </button>
      </section>

      {/* --- STEP 01 / 02 / 03 --- */}
      <section className={styles.steps} aria-label={t('home.howItWorks.title')}>
        <div className={styles.stepsGrid}>
          {steps.map((step) => (
            <div key={step.num} className={styles.step}>
              <div className={styles.stepNum}>{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- PERCHÉ TABLE2TALK? --- */}
      <section className={styles.why}>
        <h2>{t('home.whyTableTalk.title')}</h2>
        <div className={styles.whyGrid}>
          {values.map((item) => (
            <div key={item.title} className={styles.value}>
              <div className={styles.valueIco} aria-hidden="true">
                {item.icon}
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- TAVOLI DI OGGI --- */}
      <section className={styles.discover} id="home-tavoli">
        <div className={styles.secHead}>
          <h2>{t('home.todayTables.title', 'Tavoli di oggi')}</h2>
          <Link to="/meals" className={styles.seeAll}>
            {t('home.todayTables.seeAll', 'Vedi tutti →')}
          </Link>
        </div>

        {loadingMeals ? (
          <div className={styles.grid} aria-busy="true">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className={styles.skeletonCard} aria-hidden="true">
                <div className={styles.skeletonCover} />
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonLineWide} />
                  <div className={styles.skeletonLineMid} />
                  <div className={styles.skeletonLineShort} />
                </div>
              </div>
            ))}
          </div>
        ) : featuredMeals.length > 0 ? (
          <div className={styles.grid}>
            {featuredMeals.map((meal) => {
              const ctaState = getCtaState(meal);
              const hostName =
                meal.host?.nickname || meal.host?.name || '';
              const coverSrc = meal.imageUrl
                ? getMealCoverImageUrl(meal.imageUrl)
                : '';
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
                  ctaState={ctaState}
                  onCardClick={() => navigate(`/meals/${meal._id}`)}
                  onActionClick={(state) => {
                    if (state === 'organizer') {
                      navigate('/my-meals');
                    } else {
                      navigate(`/meals/${meal._id}`);
                    }
                  }}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="🍽️"
            title={t(
              'home.todayTables.emptyTitle',
              'Nessun tavolo in programma adesso'
            )}
            description={t(
              'home.todayTables.emptyDescription',
              'Apparecchia tu il primo tavolo e invita la community.'
            )}
            actionLabel={t('home.todayTables.emptyCta', 'Crea un t2t')}
            actionTo="/meals/create"
          />
        )}
      </section>

      {/* --- BANDA CTA FINALE --- */}
      <section className={styles.finalCta}>
        <h2>{t('home.cta.title')}</h2>
        <p>
          {isAuthenticated
            ? t('home.cta.subtitleAuth', t('home.cta.subtitle'))
            : t('home.cta.subtitle')}
        </p>
        <Button
          variant="white"
          to={isAuthenticated ? '/meals/create' : '/register'}
        >
          {isAuthenticated
            ? t('home.cta.organizeTableTalk')
            : t('home.cta.startNow')}
        </Button>
      </section>

      {/* --- TRUST ROW --- */}
      <section className={styles.trust} aria-label="Garanzie">
        {trustItems.map((label) => (
          <div key={label} className={styles.trustItem}>
            <Check size={16} strokeWidth={2.5} className={styles.trustIcon} aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

export default HomePage;
