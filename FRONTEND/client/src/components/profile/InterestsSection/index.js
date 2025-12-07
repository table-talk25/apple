import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaChevronDown, FaTimes } from 'react-icons/fa';
import { availableCuisines, availableInterests } from '../../../constants/profileConstants';
import ProfileSectionWrapper from '../ProfileSectionWrapper';
import styles from './InterestsSection.module.css';

const InterestsSection = ({ profileData, onUpdate, isPublicView = false }) => {
  const { t, i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [interests, setInterests] = useState(profileData?.interests || []);
  const [preferredCuisine, setPreferredCuisine] = useState(profileData?.preferredCuisine || '');
  const [newInterest, setNewInterest] = useState('');
  const [showInterestSuggestions, setShowInterestSuggestions] = useState(false);
  
  const interestInputRef = useRef(null);


  useEffect(() => {
    if (profileData) {
      setInterests(profileData.interests || []);
      setPreferredCuisine(profileData.preferredCuisine || '');
    }
  }, [profileData]);

  // Gestisce la chiusura dei suggerimenti quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (interestInputRef.current && !interestInputRef.current.contains(event.target)) {
        setShowInterestSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!profileData) {
    return null;
  }

  // Filtra gli interessi disponibili escludendo quelli già selezionati
  const availableInterestsFiltered = availableInterests.filter(
    interest => !interests.includes(interest)
  );


  // Filtra i suggerimenti in base al testo digitato
  const filteredInterestSuggestions = availableInterestsFiltered.filter(
    interest => interest.toLowerCase().includes(newInterest.toLowerCase())
  ).slice(0, 8); // Mostra massimo 8 suggerimenti

  const handleAddInterest = (interest) => {
    if (isPublicView) return; // Non permettere modifiche in modalità pubblica
    
    if (interest && !interests.includes(interest)) {
      setInterests([...interests, interest]);
      setNewInterest('');
      setShowInterestSuggestions(false);
    }
  };

  const handleRemoveInterest = (interestToRemove) => {
    if (isPublicView) return; // Non permettere modifiche in modalità pubblica
    
    setInterests(interests.filter(interest => interest !== interestToRemove));
  };
  
  const handleSave = () => {
    if (isPublicView || !onUpdate) return; // Non permettere il salvataggio in modalità pubblica
    
    const dataToUpdate = {
      interests: interests,
      preferredCuisine: preferredCuisine
    };
    onUpdate(dataToUpdate);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (isPublicView) return; // Non permettere l'annullamento in modalità pubblica
    
    if (profileData) {
      setInterests(profileData.interests || []);
      setPreferredCuisine(profileData.preferredCuisine || '');
    }
    setIsEditing(false);
  };

  // Costruisce il titolo con a capo prima di "preferenze" in italiano
  const rawTitle = t('profile.interests.title');
  let titleNode = rawTitle;
  try {
    if (i18n?.language?.startsWith('it')) {
      const lower = rawTitle.toLowerCase();
      const target = ' preferenze';
      const idx = lower.lastIndexOf(target);
      if (idx > -1) {
        titleNode = (
          <>
            {rawTitle.slice(0, idx)}
            <br />
            {rawTitle.slice(idx + 1)}
          </>
        );
      }
    }
  } catch {}

  return (
    <ProfileSectionWrapper
      title={titleNode}
      isPublicView={isPublicView}
      showEditButton={!isEditing}
      isEditing={isEditing}
      onEdit={() => setIsEditing(true)}
      onSave={handleSave}
      onCancel={handleCancel}
      showSaveCancel={isEditing}
    >

      <div className={styles.interestsSection}>
        <h3>{t('profile.interests.yourInterests')}</h3>
        {isEditing && (
          <div className={styles.inputGroup}>
            <div className={styles.autocompleteContainer} ref={interestInputRef}>
              <input 
                type="text" 
                value={newInterest} 
                onChange={(e) => {
                  if (!isPublicView) {
                    setNewInterest(e.target.value);
                    setShowInterestSuggestions(true);
                  }
                }}
                onFocus={() => {
                  if (!isPublicView) setShowInterestSuggestions(true);
                }}
                placeholder={t('profile.interests.searchInterest')} 
                className={styles.autocompleteInput}
                disabled={isPublicView}
              />
              {showInterestSuggestions && filteredInterestSuggestions.length > 0 && (
                <div className={styles.suggestionsList}>
                  {filteredInterestSuggestions.map((interest, index) => (
                    <div 
                      key={index} 
                      className={styles.suggestionItem}
                      onClick={() => handleAddInterest(interest)}
                    >
                      {interest}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={() => handleAddInterest(newInterest)} 
              disabled={!newInterest.trim() || interests.includes(newInterest.trim()) || isPublicView}
              className={isPublicView ? styles.disabledButton : ''}
            >
              <FaPlus />
            </button>
          </div>
        )}
        <div className={styles.tagsList}>
          {interests.length > 0 ? interests.map((item, index) => (
            <span key={index} className={styles.interestTag}>
              {item}
              {isEditing && <button onClick={() => handleRemoveInterest(item)}><FaTimes /></button>}
            </span>
          )) : !isEditing && <p className={styles.noItems}>{t('profile.interests.noInterests')}</p>}
        </div>
      </div>

      <div className={styles.cuisineSection}>
        <h3>{t('profile.interests.preferredCuisine')}</h3>
        {!isEditing ? (
          <div className={styles.preferredCuisine}>
            {preferredCuisine ? <span className={styles.cuisineTag}>{preferredCuisine}</span> : <p className={styles.noItems}>{t('profile.interests.noCuisine')}</p>}
          </div>
        ) : (
          <select 
            value={preferredCuisine} 
            onChange={(e) => {
              if (!isPublicView) setPreferredCuisine(e.target.value);
            }} 
            className={styles.cuisineSelect}
            disabled={isPublicView}
          >
            <option value="">{t('profile.interests.selectCuisine')}</option>
            {availableCuisines.map((cuisine, index) => (
              <option key={index} value={cuisine}>{cuisine}</option>
            ))}
          </select>
        )}
      </div>
    </ProfileSectionWrapper>
  );
};

export default InterestsSection;