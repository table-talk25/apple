import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGlobe, FaCheck, FaTimes } from 'react-icons/fa';
import { availableLanguages } from '../../../constants/profileConstants';
import styles from './LanguagesSection.module.css';

const LanguagesSection = ({ profileData, onUpdate, isEditing = false }) => {
  const { t } = useTranslation();
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Inizializza le lingue dal profilo
  useEffect(() => {
    if (profileData?.languages) {
      setSelectedLanguages(profileData.languages);
    }
  }, [profileData?.languages]);

  const handleLanguageToggle = (languageCode) => {
    const newLanguages = selectedLanguages.includes(languageCode)
      ? selectedLanguages.filter(lang => lang !== languageCode)
      : [...selectedLanguages, languageCode];
    
    setSelectedLanguages(newLanguages);
    
    // Aggiorna il profilo
    onUpdate({ languages: newLanguages });
  };

  const removeLanguage = (languageCode) => {
    const newLanguages = selectedLanguages.filter(lang => lang !== languageCode);
    setSelectedLanguages(newLanguages);
    onUpdate({ languages: newLanguages });
  };

  const getLanguageName = (code) => {
    const language = availableLanguages.find(lang => lang.code === code);
    return language ? language.name : code;
  };

  const getAvailableLanguagesForSelection = () => {
    return availableLanguages.filter(lang => !selectedLanguages.includes(lang.code));
  };

  const toggleDropdown = () => {
    if (isEditing) {
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  if (!isEditing) {
    // Modalità visualizzazione
    return (
      <div className={styles.container}>
        <h3 className={styles.sectionTitle}>
          <FaGlobe /> {t('publicProfile.languagesSection.title')}
        </h3>
        
        {selectedLanguages.length > 0 ? (
          <div className={styles.languagesList}>
            {selectedLanguages.map((langCode) => (
              <div key={langCode} className={styles.languageTag}>
                <span className={styles.languageCode}>{langCode.toUpperCase()}</span>
                <span className={styles.languageName}>{getLanguageName(langCode)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noLanguages}>
            {t('publicProfile.languagesSection.noLanguagesConfigured')}
          </p>
        )}
      </div>
    );
  }

  // Modalità editing
  return (
          <div className={styles.container}>
        <h3 className={styles.sectionTitle}>
          <FaGlobe /> {t('publicProfile.languagesSection.title')}
        </h3>
      
      <div className={styles.selectedLanguages}>
        {selectedLanguages.map((langCode) => (
          <div key={langCode} className={styles.languageTag}>
            <span className={styles.languageCode}>{langCode.toUpperCase()}</span>
            <span className={styles.languageName}>{getLanguageName(langCode)}</span>
            <button
              className={styles.removeButton}
              onClick={() => removeLanguage(langCode)}
              title={`${t('publicProfile.languagesSection.removeLanguage')} ${getLanguageName(langCode)}`}
            >
              <FaTimes />
            </button>
          </div>
        ))}
      </div>

      <div className={styles.addLanguageSection}>
        <button
          className={styles.addButton}
          onClick={toggleDropdown}
          disabled={getAvailableLanguagesForSelection().length === 0}
        >
          {t('publicProfile.languagesSection.addLanguage')}
        </button>

        {isDropdownOpen && (
          <div className={styles.dropdown}>
            {getAvailableLanguagesForSelection().map((language) => (
              <button
                key={language.code}
                className={styles.languageOption}
                onClick={() => handleLanguageToggle(language.code)}
              >
                <span className={styles.languageCode}>{language.code.toUpperCase()}</span>
                <span className={styles.languageName}>{language.name}</span>
                <FaCheck className={styles.addIcon} />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedLanguages.length === 0 && (
        <p className={styles.helpText}>
          {t('publicProfile.languagesSection.helpText')}
        </p>
      )}
    </div>
  );
};

export default LanguagesSection; 