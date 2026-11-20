import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import mealService from '../../services/mealService';
import { Button } from '../../components/ui';
import styles from './HomePage.module.css';

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
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [meals, setMeals] = useState([]);
  const shouldRedirect = !authLoading && isAuthenticated;

  // Fetch leggero usato solo per la pill "persone in linea"
  useEffect(() => {
    if (shouldRedirect) return undefined;
    let cancelled = false;

    const loadLiveMeals = async () => {
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
        if (!cancelled) setMeals([]);
      }
    };

    loadLiveMeals();
    return () => {
      cancelled = true;
    };
  }, [shouldRedirect]);

  const livePeopleCount = useMemo(() => computeLivePeopleCount(meals), [meals]);

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

  // Utente già autenticato (anche via auto-login): va direttamente su Esplora
  if (shouldRedirect) {
    return <Navigate to="/meals" replace />;
  }

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
          <Button variant="primary" to="/login">
            {t('home.login', 'Accedi')}
          </Button>
          <Button variant="ghost" to="/register">
            {t('home.registerNow', 'Registrati')}
          </Button>
        </div>
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

      {/* --- BANDA CTA FINALE --- */}
      <section className={styles.finalCta}>
        <h2>{t('home.cta.title')}</h2>
        <p>{t('home.cta.subtitle')}</p>
        <div className={styles.finalCtaActions}>
          <Button variant="white" to="/login">
            {t('home.login', 'Accedi')}
          </Button>
          <Button variant="white" to="/register" className={styles.finalCtaOutline}>
            {t('home.registerNow', 'Registrati')}
          </Button>
        </div>
      </section>

      {/* --- TRUST ROW --- */}
      <section className={styles.trust} aria-label={t('home.trust.ariaLabel', 'Garanzie')}>
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
