import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCamera, FaUtensils } from 'react-icons/fa';
import profileService from '../../../services/profileService';
import { API_URL } from '../../../config/capacitorConfig';
import styles from './ProfileHeader.module.css';

// URL statico del default avatar — calcolato una volta sola, mai in loop
const DEFAULT_AVATAR_URL = `${(API_URL || '').replace(/\/api\/?$/, '')}/uploads/profile-images/default-avatar.jpg`;

const ProfileHeader = ({ profile, onUpdateImage, isPublicView = false }) => {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);

  if (!profile) {
    return null;
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      if (onUpdateImage) {
        await onUpdateImage(formData);
        console.log('✅ [ProfileHeader] Immagine caricata, forzando refresh...');
      }
    } catch (error) {
      console.error('Errore durante l\'upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const imageUrl = profileService.getFullImageUrl(profile.profileImage);

  return (
    <div className={styles.profileHeader}>
      <div className={styles.profileImageContainer}>
        <img 
          src={imageUrl} 
          alt={t('profile.header.avatarAlt')} 
          className={styles.profileImage} 
          key={profile.profileImage}
          onError={(e) => {
            // Evita loop infinito: se src è già il default, non fare nulla
            if (e.target.src === DEFAULT_AVATAR_URL) return;
            e.target.onerror = null; // disabilita ulteriori onError
            e.target.src = DEFAULT_AVATAR_URL;
          }}
        />
        {!isPublicView && (
          <label htmlFor="image-upload" className={`${styles.cameraButton} ${isUploading ? styles.disabled : ''}`}>
            <FaCamera />
            <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} disabled={isUploading} />
          </label>
        )}
      </div>
      <div className={styles.profileInfo}>
        <h1 className={styles.nickname}>{profile.nickname || t('profile.header.noNickname')}</h1>
        {isPublicView ? (
          <p className={styles.bio}>{profile.bio || t('profile.header.noBio')}</p>
        ) : (
          <p className={styles.userEmail}>{profile.email}</p>
        )}
        {!isPublicView && (
          <Link to="/my-meals" className={styles.myMealsButton}>
            <FaUtensils />
            <span>{t('profile.header.myMealsButton')}</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
