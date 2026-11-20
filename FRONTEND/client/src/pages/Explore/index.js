import React from 'react';
import { useTranslation } from 'react-i18next';
import { Utensils, Users, Shuffle, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui';
import styles from './ExplorePage.module.css';

/**
 * Hub "Esplora": tre macro-sezioni.
 * 1. Mangiamo assieme  → lista t2t disponibili / crea un t2t (attiva)
 * 2. Tribù             → tavoli privati su invito tra amici (prossimamente)
 * 3. Talk a sorpresa   → 1 a 1 casuale filtrato per lingua/interessi (prossimamente)
 */
function ExplorePage() {
  const { t } = useTranslation();
  const soon = t('exploreHub.comingSoon', 'Prossimamente');

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1>{t('exploreHub.title', 'Esplora')}</h1>
        <p>{t('exploreHub.subtitle', 'Scegli come vuoi sederti a tavola oggi.')}</p>
      </header>

      <div className={styles.sections}>
        {/* --- 1. MANGIAMO ASSIEME --- */}
        <section className={`${styles.card} ${styles.cardPrimary}`}>
          <div className={styles.cardIcon} aria-hidden="true">
            <Utensils size={26} strokeWidth={2} />
          </div>
          <div className={styles.cardBody}>
            <h2>{t('exploreHub.together.title', 'Mangiamo assieme')}</h2>
            <p>
              {t(
                'exploreHub.together.description',
                'Unisciti a un t2t già in programma o apparecchia tu un nuovo tavolo aperto alla community.'
              )}
            </p>
            <div className={styles.cardActions}>
              <Button variant="primary" to="/meals">
                {t('exploreHub.together.browse', 'Vedi i t2t disponibili')}
              </Button>
              <Button variant="ghost" to="/meals/create">
                {t('exploreHub.together.create', 'Crea un t2t')}
              </Button>
            </div>
          </div>
        </section>

        {/* --- 2. TRIBÙ --- */}
        <section className={`${styles.card} ${styles.cardSoon}`}>
          <span className={styles.soonBadge}>{soon}</span>
          <div className={styles.cardIcon} aria-hidden="true">
            <Users size={26} strokeWidth={2} />
          </div>
          <div className={styles.cardBody}>
            <h2>{t('exploreHub.tribe.title', 'Tribù')}</h2>
            <p>
              {t(
                'exploreHub.tribe.description',
                'La tua mangiata tra amici: tavoli privati, solo su invito, con il tuo gruppo fisso.'
              )}
            </p>
            <div className={styles.metaRow}>
              <Lock size={14} aria-hidden="true" />
              <span>{t('exploreHub.tribe.meta', 'Solo su invito')}</span>
            </div>
          </div>
        </section>

        {/* --- 3. TALK A SORPRESA --- */}
        <section className={`${styles.card} ${styles.cardSoon}`}>
          <span className={styles.soonBadge}>{soon}</span>
          <div className={styles.cardIcon} aria-hidden="true">
            <Shuffle size={26} strokeWidth={2} />
          </div>
          <div className={styles.cardBody}>
            <h2>{t('exploreHub.surprise.title', 'Talk a sorpresa')}</h2>
            <p>
              {t(
                'exploreHub.surprise.description',
                'Un faccia a faccia in video con una persona a caso, scelta per lingua e interessi.'
              )}
            </p>
            <div className={styles.metaRow}>
              <ShieldCheck size={14} aria-hidden="true" />
              <span>
                {t(
                  'exploreHub.surprise.meta',
                  'Solo maggiorenni verificati · segnala e blocca'
                )}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ExplorePage;
