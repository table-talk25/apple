import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../../i18n';
import styles from './LanguageMenu.module.css';

const LanguageMenu = () => {
  const { i18n, t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef(null);

  const currentCode = (i18n.language || 'it').split('-')[0].toLowerCase();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsMenuOpen(false);
  };

  const getCurrentLanguageName = () => {
    const currentLang = SUPPORTED_LANGUAGES.find((lang) => lang.code === currentCode);
    return currentLang ? currentLang.name : t('languageSwitcher.currentLanguage');
  };

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    const handleEsc = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isMenuOpen]);

  if (!SUPPORTED_LANGUAGES || SUPPORTED_LANGUAGES.length === 0) {
    return null;
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.languageButton}
        onClick={() => setIsMenuOpen((prev) => !prev)}
        title={`${t('languageSwitcher.currentLanguage')}: ${getCurrentLanguageName()}`}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
      >
        <Globe size={14} strokeWidth={2} className={styles.globeIcon} aria-hidden="true" />
        <span className={styles.languageCode}>{currentCode.toUpperCase()}</span>
      </button>

      {isMenuOpen && (
        <div className={styles.dropdown} role="menu">
          {SUPPORTED_LANGUAGES.map((language) => {
            const active = currentCode === language.code;
            return (
              <button
                type="button"
                key={language.code}
                className={`${styles.languageOption} ${active ? styles.active : ''}`}
                onClick={() => changeLanguage(language.code)}
                disabled={active}
                role="menuitem"
              >
                <span className={styles.optionCode}>{language.code.toUpperCase()}</span>
                <span className={styles.languageName}>{language.name}</span>
                {active && <Check size={14} strokeWidth={2.5} className={styles.checkmark} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageMenu;
