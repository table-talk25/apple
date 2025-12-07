import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { translatedLanguages } from '../../../constants/profileConstants';
import styles from './LanguageSwitcher.module.css';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const [userLanguages, setUserLanguages] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Rileva le lingue dal profilo utente
  useEffect(() => {
    console.log('🔍 Debug Language Switcher:');
    console.log('User:', user);
    console.log('User languages:', user?.languages);
    console.log('Translated languages:', translatedLanguages);
    
    // Per ora, mostra sempre tutte le lingue tradotte per il testing
    setUserLanguages(translatedLanguages);
    console.log('Showing only translated languages');
    
    // TODO: Implementare la logica per filtrare in base al profilo utente
    /*
    if (user && user.languages && user.languages.length > 0) {
      // Filtra le lingue disponibili in base a quelle del profilo
      // Gestisce sia codici (it, en) che nomi (Italiano, Inglese)
      const filteredLanguages = translatedLanguages.filter(lang => 
        user.languages.includes(lang.code) || user.languages.includes(lang.name)
      );
      console.log('Filtered languages:', filteredLanguages);
      setUserLanguages(filteredLanguages);
      
      // Se la lingua corrente non è tra quelle del profilo, cambia alla prima disponibile
      const userLanguageCodes = user.languages.map(lang => {
        // Se è un nome, trova il codice corrispondente
        const foundLang = translatedLanguages.find(al => al.name === lang);
        return foundLang ? foundLang.code : lang;
      });
      
      if (!userLanguageCodes.includes(i18n.language)) {
        const firstUserLanguage = userLanguageCodes[0];
        i18n.changeLanguage(firstUserLanguage);
      }
    } else {
      // Se l'utente non ha lingue nel profilo, mostra tutte le lingue tradotte
      console.log('No user languages found, showing all translated languages');
      setUserLanguages(translatedLanguages);
    }
    */
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

  // Se non ci sono lingue disponibili, mostra un messaggio
  if (userLanguages.length === 0) {
    return (
      <div className={styles.container}>
        <span className={styles.noLanguages}>
          {t('languageSwitcher.noLanguagesConfigured')}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button 
        className={styles.languageButton}
        onClick={toggleMenu}
        title={`${t('languageSwitcher.currentLanguage')}: ${getCurrentLanguageName()}`}
      >
        <span className={styles.currentLanguage}>
          {i18n.language.toUpperCase()}
        </span>
        <span className={styles.languageName}>
          {getCurrentLanguageName()}
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

export default LanguageSwitcher;