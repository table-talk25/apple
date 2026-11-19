import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { availableCuisines, availableInterests } from '../../../constants/profileConstants';
import { Button } from '../../ui';
import styles from './InterestsSection.module.css';

const UNIQUE_INTERESTS = Array.from(new Set(availableInterests));

const InterestsSection = ({
  profileData,
  onUpdate,
  isUpdating = false,
  isPublicView = false,
}) => {
  const { t } = useTranslation();
  const [interests, setInterests] = useState(
    Array.isArray(profileData?.interests) ? profileData.interests : []
  );
  const [preferredCuisine, setPreferredCuisine] = useState(
    profileData?.preferredCuisine || ''
  );
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (profileData) {
      setInterests(Array.isArray(profileData.interests) ? profileData.interests : []);
      setPreferredCuisine(profileData.preferredCuisine || '');
    }
  }, [profileData]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return UNIQUE_INTERESTS.filter(
      (item) =>
        !interests.some((sel) => sel.toLowerCase() === item.toLowerCase()) &&
        (!q || item.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [interests, query]);

  if (!profileData) return null;

  const commitUpdate = (nextInterests, nextCuisine = preferredCuisine) => {
    if (isPublicView || !onUpdate) return;
    onUpdate({
      interests: nextInterests,
      preferredCuisine: nextCuisine,
    });
  };

  const handleAddInterest = (rawValue) => {
    if (isPublicView) return;
    const trimmed = String(rawValue || '').trim().replace(/,+$/, '');
    if (!trimmed) return;
    const alreadyPresent = interests.some(
      (item) => item.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyPresent) {
      setQuery('');
      return;
    }
    const next = [...interests, trimmed];
    setInterests(next);
    setQuery('');
    commitUpdate(next);
  };

  const handleRemoveInterest = (toRemove) => {
    if (isPublicView) return;
    const next = interests.filter((item) => item !== toRemove);
    setInterests(next);
    commitUpdate(next);
  };

  const handleCuisineChange = (e) => {
    if (isPublicView) return;
    const val = e.target.value;
    setPreferredCuisine(val);
    commitUpdate(interests, val);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddInterest(query);
    }
  };

  return (
    <section className={styles.pCard} data-testid="interests-card">
      <h3>{t('profileUi.interestsTitle', 'Interessi')}</h3>

      <div className={styles.tags}>
        {interests.length > 0 ? (
          interests.map((item) => (
            <span key={item} className={styles.tag}>
              <span>{item}</span>
              {isAdding && !isPublicView && (
                <button
                  type="button"
                  className={styles.removeChip}
                  onClick={() => handleRemoveInterest(item)}
                  aria-label={t('profileUi.removeItem', {
                    item,
                    defaultValue: `Rimuovi ${item}`,
                  })}
                >
                  ✕
                </button>
              )}
            </span>
          ))
        ) : (
          <span className={styles.emptyHint}>
            {t('profileUi.noInterestsYet', 'Nessun interesse aggiunto')}
          </span>
        )}

        {preferredCuisine && (
          <span className={styles.tag}>🍽️ {preferredCuisine}</span>
        )}

        {!isPublicView && (
          <button
            type="button"
            className={styles.linklike}
            onClick={() => setIsAdding((prev) => !prev)}
            data-testid="add-interest-btn"
          >
            {isAdding
              ? t('profileUi.done', 'Fatto')
              : t('profileUi.addChip', '＋ Aggiungi')}
          </button>
        )}
      </div>

      {isAdding && !isPublicView && (
        <div className={styles.editorBox} data-testid="interests-picker">
          <div className={styles.inputRow}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('profile.interests.searchInterest', 'Cerca interesse...')}
              className={styles.input}
              disabled={isUpdating}
              data-testid="interest-input"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddInterest(query)}
              disabled={!query.trim() || isUpdating}
            >
              ＋
            </Button>
          </div>

          {suggestions.length > 0 && (
            <div className={styles.suggestions}>
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={styles.optionChip}
                  onClick={() => handleAddInterest(item)}
                  data-testid={`interest-option-${item}`}
                >
                  ＋ {item}
                </button>
              ))}
            </div>
          )}

          <div className={styles.cuisineRow}>
            <label htmlFor="p-cuisine">
              {t('profile.interests.preferredCuisine', 'Cucina Preferita')}
            </label>
            <select
              id="p-cuisine"
              value={preferredCuisine}
              onChange={handleCuisineChange}
              className={styles.select}
              disabled={isUpdating}
            >
              <option value="">
                {t('profile.interests.selectCuisine', 'Seleziona una cucina...')}
              </option>
              {availableCuisines.map((cuisine) => (
                <option key={cuisine} value={cuisine}>
                  {cuisine}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </section>
  );
};

export default InterestsSection;
