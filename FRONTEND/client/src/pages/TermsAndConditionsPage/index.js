// File: frontend/client/src/pages/TermsAndConditionsPage/index.js

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from 'react-bootstrap';
import styles from './TermsAndConditionsPage.module.css';
import BackButton from '../../components/common/BackButton';

const TermsAndConditionsPage = () => {
  const { t } = useTranslation();

  return (
    <Container className={`my-5 ${styles.container}`}>
      <div className={styles.topBar}>
        <BackButton className={styles.backButton} />
      </div>
      <h1 className={`mb-4 ${styles.title}`}>{t('terms.title')}</h1>
      <p className={styles.text}><strong>{t('terms.lastUpdated')}</strong></p>
      
      <p className={styles.lead}>
        {t('terms.welcome')}
      </p>

      <h3 className={`mt-4 ${styles.h3}`}>{t('terms.acceptance.title')}</h3>
      <p className={styles.text}>
        {t('terms.acceptance.description')}
      </p>

      <h3 className={`mt-4 ${styles.h3}`}>{t('terms.service.title')}</h3>
      <p className={styles.text}>
        {t('terms.service.description')}
      </p>

      <h3 className={`mt-4 ${styles.h3}`}>{t('terms.conduct.title')}</h3>
      <p className={styles.text}>
        {t('terms.conduct.description')}
      </p>

      <h3 className={`mt-4 ${styles.h3}`}>{t('terms.liability.title')}</h3>
      <p className={styles.text}>
        {t('terms.liability.description')}
      </p>

      <h3 className={`mt-4 ${styles.h3}`}>{t('terms.modifications.title')}</h3>
      <p className={styles.text}>
        {t('terms.modifications.description')}
      </p>

      <BackButton className="mb-4" /> 

    </Container>
  );
};

export default TermsAndConditionsPage;