// File: frontend/client/src/components/profile/PersonalInfo.js (Integrato con PlacesAutocomplete)

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEye, FaEyeSlash, FaMapMarkerAlt } from 'react-icons/fa';
import ProfileSectionWrapper from '../ProfileSectionWrapper';
import { sanitizeProfileData, containsDangerousContent } from '../../../services/sanitizationService';
import styles from './PersonalInfo.module.css';

const PersonalInfo = ({ profileData, onUpdate, onUpdateLocation, isUpdating, isPublicView = false }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nickname: '', bio: '', dateOfBirth: '', 
    gender: '', phone: '',
    privacy: { showAge: true, showLocation: true }
  });

  useEffect(() => {
    if (profileData) {
      setFormData({
        nickname: profileData.nickname || '',
        bio: profileData.bio || '',
        dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().split('T')[0] : '',
        phone: profileData.phone || '',
        gender: profileData.gender || '',
        privacy: {
          showAge: profileData.settings?.privacy?.showAge ?? true,
          showLocation: profileData.settings?.privacy?.showLocation ?? true,
        }
      });
    }
  }, [profileData]);

  if (!profileData) {
    return null;
  }

  const handleChange = (e) => {
    if (isPublicView) return; // Non permettere modifiche in modalità pubblica
    
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePrivacyToggle = (field) => {
    if (isPublicView) return; // Non permettere modifiche privacy in modalità pubblica
    
    setFormData(prev => ({
      ...prev,
      privacy: { ...prev.privacy, [field]: !prev.privacy[field] }
    }));
  };


  const handleSave = async () => {
    if (isPublicView || !onUpdate) return; // Non permettere il salvataggio in modalità pubblica
    
    setError(''); // Pulisci eventuali errori precedenti
    
      const dataToUpdate = {
        nickname: formData.nickname,
        bio: formData.bio,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        phone: formData.phone,
        settings: { ...profileData.settings, privacy: formData.privacy }
      };
      
       onUpdate(dataToUpdate);
      setIsEditing(false);
    };

  const handleCancel = () => {
    if (isPublicView) return; // Non permettere l'annullamento in modalità pubblica
    
    setError(''); // Pulisci errori quando si annulla
    if (profileData) {
        setFormData({
            nickname: profileData.nickname || '',
            bio: profileData.bio || '',
            dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().split('T')[0] : '',
            phone: profileData.phone || '',
            gender: profileData.gender || '',
            privacy: {
                showAge: profileData.settings?.privacy?.showAge ?? true,
                showLocation: profileData.settings?.privacy?.showLocation ?? true,
                showPhone: false
            }
        });
    }
    setIsEditing(false);
  };
  
  const renderInfoField = (label, value, defaultValue = t('profile.personalInfo.notSpecified')) => (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}:</span>
      <span className={styles.infoValue}>{value || defaultValue}</span>
    </div>
  );

  return (
    <ProfileSectionWrapper
      title={t('profile.personalInfo.title')}
      isPublicView={isPublicView}
      showEditButton={!isEditing}
      isEditing={isEditing}
      onEdit={() => setIsEditing(true)}
      onSave={handleSave}
      onCancel={handleCancel}
      showSaveCancel={isEditing}
    >

{!isEditing ? (
        <div className={styles.infoDisplay}>
          {renderInfoField(t('profile.personalInfo.nickname'), formData.nickname)}
          {renderInfoField(t('profile.personalInfo.location'), profileData.location?.address)}
          {renderInfoField(t('profile.personalInfo.age'), profileData?.age, t('profile.personalInfo.notSpecifiedAge'))}
          {renderInfoField(t('profile.personalInfo.gender'), formData.gender)}
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{t('profile.personalInfo.bio')}:</span>
            <p className={styles.infoValueBio}>{formData.bio || t('profile.personalInfo.noBio')}</p>
          </div>
        </div>
      ) : (
        <div className={styles.form}>
          <input name="nickname" value={formData.nickname} onChange={handleChange} placeholder={t('profile.personalInfo.nickname')} className={styles.input} />
          <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder={t('profile.personalInfo.bioPlaceholder')} className={styles.textarea} />
          
          <div className={styles.fieldWithButton}>
            <p className={styles.locationText}>
              {profileData.location?.address || t('profile.personalInfo.noLocationSet')}
            </p>
            <button onClick={onUpdateLocation} className={styles.updateLocationBtn} disabled={isUpdating}>
              <FaMapMarkerAlt /> {t('profile.personalInfo.updateLocation')}
            </button>
          </div>
          
          <select name="gender" value={formData.gender} onChange={handleChange} className={styles.input}>
            <option value="">{t('profile.personalInfo.selectGender')}</option>
            <option value="male">{t('profile.personalInfo.male')}</option>
            <option value="female">{t('profile.personalInfo.female')}</option>
            <option value="non-binary">{t('profile.personalInfo.nonBinary')}</option>
            <option value="other">{t('profile.personalInfo.other')}</option>
          </select>

          <div className={styles.fieldWithPrivacy}>
            <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={styles.input} />
            <button onClick={() => handlePrivacyToggle('showAge')} className={styles.privacyBtn} title={t('profile.personalInfo.ageVisibility')}>
                {formData.privacy.showAge ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder={t('profile.personalInfo.phonePlaceholder')} className={styles.input} />
        </div>
      )}
    </ProfileSectionWrapper>
  );
};

export default PersonalInfo;