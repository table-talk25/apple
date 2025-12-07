import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './NotFoundPage.module.css'; 
import BackButton from '../../components/common/BackButton';

const NotFoundPage = () => {
  const { t } = useTranslation();
  
  return (
    <div className={styles.notFound}>
      <div style={{ padding: '12px 16px' }}>
        <BackButton />
      </div>
      <h1>404</h1>
      <h2>{t('errors.pageNotFound')}</h2>
      <p>{t('errors.pageNotFoundMessage')}</p>
      <Link to="/" className={styles.homeLink}>
        {t('errors.backToHome')}
      </Link>
    </div>
  );
};

export default NotFoundPage; 