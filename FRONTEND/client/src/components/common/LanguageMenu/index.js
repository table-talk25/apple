import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { translatedLanguages } from '../../../constants/profileConstants';
import { FaGlobe } from 'react-icons/fa';
import styles from './LanguageMenu.module.css';

const LanguageMenu = () => {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const [userLanguages, setUserLanguages] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Rileva le lingue dal profilo utente
  useEffect(() => {
    // Per ora, mostra sempre tutte le lingue tradotte
    setUserLanguages(translatedLanguages);
  }, [user, i18n]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsMenuOpen(false);
    console.log('Cambio lingua a:', lng);
  };

  const getCurrentLanguageName = () => {
    const currentLang = translatedLanguages.find(lang => lang.code === i18n.language);
    return currentLang ? currentLang.name : t('languageSwitcher.currentLanguage');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Chiudi il menu quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(`.${styles.container}`)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Se non ci sono lingue disponibili, non mostrare nulla
  if (userLanguages.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <button 
        className={styles.languageButton}
        onClick={toggleMenu}
        title={`${t('languageSwitcher.currentLanguage')}: ${getCurrentLanguageName()}`}
      >
        <FaGlobe className={styles.globeIcon} />
        <span className={styles.languageCode}>
          {i18n.language.toUpperCase()}
        </span>
        <span className={`${styles.arrow} ${isMenuOpen ? styles.arrowUp : ''}`}>
          ▼
        </span>
      </button>

      {isMenuOpen && (
        <div className={styles.dropdown}>
          {userLanguages.map((language) => (
            <button
              key={language.code}
              className={`${styles.languageOption} ${
                i18n.language === language.code ? styles.active : ''
              }`}
              onClick={() => changeLanguage(language.code)}
              disabled={i18n.language === language.code}
            >
              <span className={styles.languageCode}>
                {language.code.toUpperCase()}
              </span>
              <span className={styles.languageName}>
                {language.name}
              </span>
              {i18n.language === language.code && (
                <span className={styles.checkmark}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageMenu; 