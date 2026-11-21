import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shuffle, ShieldCheck, Globe } from 'lucide-react';
import { Button } from '../../components/ui';
import styles from './SurpriseTalkPage.module.css';

function SurpriseTalkPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span className={styles.badge}>{t('exploreHub.comingSoon', 'Prossimamente')}</span>
        <div className={styles.iconWrap} aria-hidden="true">
          <Shuffle size={30} strokeWidth={2} />
        </div>
        <h1>{t('exploreHub.surprise.title', 'Talk a sorpresa')}</h1>
        <p className={styles.lead}>
          {t(
            'exploreHub.surprise.description',
            'Un faccia a faccia in video con una persona a caso, scelta per lingua e interessi.'
          )}
        </p>

        <ul className={styles.rules}>
          <li>
            <Globe size={16} aria-hidden="true" />
            <span>{t('surprise.ruleLang', 'Abbinamento per lingua e interessi comuni')}</span>
          </li>
          <li>
            <ShieldCheck size={16} aria-hidden="true" />
            <span>
              {t(
                'surprise.ruleSafety',
                'Solo maggiorenni verificati, con segnalazione e blocco immediati'
              )}
            </span>
          </li>
        </ul>

        <div className={styles.actions}>
          <Button variant="primary" to="/meals">
            {t('exploreHub.together.browse', 'Vedi i t2t disponibili')}
          </Button>
          <Button variant="ghost" to="/explore">
            {t('surprise.backExplore', 'Torna a Esplora')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SurpriseTalkPage;
