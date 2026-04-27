import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGlobe, FaCheck, FaTimes, FaPencilAlt } from 'react-icons/fa';
import { availableLanguages } from '../../../constants/profileConstants';
import styles from './LanguagesSection.module.css';

const LanguagesSection = ({ profileData, onUpdate }) => {
  const { t } = useTranslation();
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // STATO LOCALE: Gestisce la modifica solo di questa sezione
  const [isEditing, setIsEditing] = useState(false);

  // Inizializza le lingue dal profilo quando cambiano i dati
  useEffect(() => {
    if (profileData?.languages) {
      setSelectedLanguages(profileData.languages);
    }
  }, [profileData?.languages]);

  // Gestione selezione/deselezione lingua (per il dropdown)
  const handleLanguageToggle = (languageCode) => {
    if (!selectedLanguages.includes(languageCode)) {
      const newLanguages = [...selectedLanguages, languageCode];
      setSelectedLanguages(newLanguages);
      onUpdate({ languages: newLanguages });
      setIsDropdownOpen(false);
    }
  };

  // Rimozione lingua (dalla lista con le X)
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

  // Attiva/Disattiva modalità modifica
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    if (isEditing) setIsDropdownOpen(false); 
  };

  return (
    <div className={styles.container}>
      {/* HEADER: Titolo + Matitina sulla stessa riga */}
      <div className={styles.headerRow}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
          <FaGlobe /> {t('publicProfile.languagesSection.title') || 'Lingue'}
        </h3>
        
        {/* Tasto Matita / Spunta per attivare la modifica locale */}
        <button 
          className={styles.editIconBtn} 
          onClick={toggleEditMode}
          title={isEditing ? "Salva" : "Modifica lingue"}
        >
          {isEditing ? <FaCheck size={16} /> : <FaPencilAlt size={14} />}
        </button>
      </div>

      {/* CONTENUTO: Cambia in base a isEditing */}
      {!isEditing ? (
        /* --- VISTA LETTURA --- */
        selectedLanguages.length > 0 ? (
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
            {t('publicProfile.languagesSection.noLanguagesConfigured') || 'Nessuna lingua configurata'}
          </p>
        )
      ) : (
        /* --- VISTA MODIFICA --- */
        <div className={styles.editContainer}>
          <div className={styles.selectedLanguages}>
            {selectedLanguages.map((langCode) => (
              <div key={langCode} className={styles.languageTag}>
                <span className={styles.languageCode}>{langCode.toUpperCase()}</span>
                <span className={styles.languageName}>{getLanguageName(langCode)}</span>
                <button
                  className={styles.removeButton}
                  onClick={() => removeLanguage(langCode)}
                >
                  <FaTimes />
                </button>
              </div>
            ))}
          </div>

          <div className={styles.addLanguageSection}>
            <button
              className={styles.addButton}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={getAvailableLanguagesForSelection().length === 0}
            >
              {t('publicProfile.languagesSection.addLanguage') || 'Aggiungi lingua'}
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
        </div>
      )}
    </div>
  );
};

export default LanguagesSection;