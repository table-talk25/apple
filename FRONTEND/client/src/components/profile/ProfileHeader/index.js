import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCamera, FaUtensils } from 'react-icons/fa';
import profileService from '../../../services/profileService';
import styles from './ProfileHeader.module.css';

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
        // Forza il refresh dell'immagine dopo l'upload
        console.log('✅ [ProfileHeader] Immagine caricata, forzando refresh...');
        // Il componente si ri-renderizzerà automaticamente quando il profilo viene aggiornato
      }
    } catch (error) {
      console.error('Errore durante l\'upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const imageUrl = profileService.getFullImageUrl(profile.profileImage);
  console.log('🖼️ [ProfileHeader] Profile image URL:', imageUrl);
  console.log('🖼️ [ProfileHeader] Profile image field:', profile.profileImage);

  return (
    <div className={styles.profileHeader}>
      <div className={styles.profileImageContainer}>
        <img 
          src={imageUrl} 
          alt={t('profile.header.avatarAlt')} 
          className={styles.profileImage} 
          key={profile.profileImage} // Forza il re-render quando cambia l'immagine
          onError={(e) => { 
            console.log('❌ Errore caricamento immagine profilo in ProfileHeader:', e);
            try {
              const fallback = profileService.getFullImageUrl('uploads/profile-images/default-avatar.jpg');
              e.target.src = fallback;
            } catch (_) {}
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