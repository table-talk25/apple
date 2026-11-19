import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import styles from './BackButton.module.css';

const BackButton = ({ className = '' }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`${styles.backButton} ${className}`.trim()}
    >
      <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" />
      <span>{t('common.back', 'Indietro')}</span>
    </button>
  );
};

export default BackButton;
