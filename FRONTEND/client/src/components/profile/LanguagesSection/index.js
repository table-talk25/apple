import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { availableLanguages } from '../../../constants/profileConstants';
import styles from './LanguagesSection.module.css';

const LANG_FLAGS = {
  it: '🇮🇹',
  en: '🇬🇧',
  fr: '🇫🇷',
  es: '🇪🇸',
  de: '🇩🇪',
  pt: '🇵🇹',
  ru: '🇷🇺',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ar: '🇸🇦',
};

const formatLanguageDisplay = (val) => {
  const raw = String(val || '').trim();
  const byCode = availableLanguages.find((l) => l.code.toLowerCase() === raw.toLowerCase());
  if (byCode) {
    return {
      code: byCode.code,
      flag: LANG_FLAGS[byCode.code] || '🌍',
      name: byCode.name,
    };
  }
  const byName = availableLanguages.find((l) => l.name.toLowerCase() === raw.toLowerCase());
  if (byName) {
    return {
      code: byName.code,
      flag: LANG_FLAGS[byName.code] || '🌍',
      name: byName.name,
    };
  }
  return {
    code: raw,
    flag: '🌍',
    name: raw,
  };
};

const LanguagesSection = ({ profileData, onUpdate, isPublicView = false }) => {
  const { t } = useTranslation();
  const [selectedLanguages, setSelectedLanguages] = useState(
    Array.isArray(profileData?.languages) ? profileData.languages : []
  );
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setSelectedLanguages(
      Array.isArray(profileData?.languages) ? profileData.languages : []
    );
  }, [profileData?.languages]);

  if (!profileData) return null;

  const isSelected = (langObj) =>
    selectedLanguages.some(
      (entry) =>
        String(entry).toLowerCase() === langObj.code.toLowerCase() ||
        String(entry).toLowerCase() === langObj.name.toLowerCase()
    );

  const remainingLanguages = availableLanguages.filter((l) => !isSelected(l));

  const handleAddLanguage = (code) => {
    if (isPublicView || !onUpdate) return;
    if (selectedLanguages.includes(code)) return;
    const next = [...selectedLanguages, code];
    setSelectedLanguages(next);
    onUpdate({ languages: next });
  };

  const handleRemoveLanguage = (valueToRemove) => {
    if (isPublicView || !onUpdate) return;
    const next = selectedLanguages.filter((item) => item !== valueToRemove);
    setSelectedLanguages(next);
    onUpdate({ languages: next });
  };

  return (
    <section className={styles.pCard} data-testid="languages-card">
      <h3>{t('profileUi.languagesTitle', 'Lingue')}</h3>

      <div className={styles.tags}>
        {selectedLanguages.length > 0 ? (
          selectedLanguages.map((langValue) => {
            const info = formatLanguageDisplay(langValue);
            return (
              <span key={langValue} className={styles.tag}>
                <span aria-hidden="true">{info.flag}</span>
                <span>{info.name}</span>
                {isAdding && !isPublicView && (
                  <button
                    type="button"
                    className={styles.removeChip}
                    onClick={() => handleRemoveLanguage(langValue)}
                    aria-label={t('profileUi.removeItem', {
                      item: info.name,
                      defaultValue: `Rimuovi ${info.name}`,
                    })}
                  >
                    ✕
                  </button>
                )}
              </span>
            );
          })
        ) : (
          <span className={styles.emptyHint}>
            {t('profileUi.noLanguagesYet', 'Nessuna lingua aggiunta')}
          </span>
        )}

        {!isPublicView && (
          <button
            type="button"
            className={styles.linklike}
            onClick={() => setIsAdding((prev) => !prev)}
            data-testid="add-language-btn"
          >
            {isAdding
              ? t('profileUi.done', 'Fatto')
              : t('profileUi.addChip', '＋ Aggiungi')}
          </button>
        )}
      </div>

      {isAdding && !isPublicView && remainingLanguages.length > 0 && (
        <div className={styles.pickerTray} data-testid="languages-picker">
          {remainingLanguages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={styles.optionChip}
              onClick={() => handleAddLanguage(lang.code)}
              data-testid={`lang-option-${lang.code}`}
            >
              <span aria-hidden="true">{LANG_FLAGS[lang.code] || '🌍'}</span>
              <span>＋ {lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default LanguagesSection;
