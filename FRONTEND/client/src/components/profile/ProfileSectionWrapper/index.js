// File: /src/components/profile/ProfileSectionWrapper/index.js
// Componente wrapper riutilizzabile per le sezioni del profilo

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ProfileSectionWrapper.module.css';

const ProfileSectionWrapper = ({ 
  title, 
  children, 
  isPublicView = false, 
  className = '',
  showEditButton = true,
  onEdit,
  isEditing = false,
  onSave,
  onCancel,
  showSaveCancel = true
}) => {
  const { t } = useTranslation();

  return (
    <div className={`${styles.profileSectionWrapper} ${className}`}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        
        {/* Pulsanti di modifica - mostrati solo in modalità privata */}
        {!isPublicView && showEditButton && !isEditing && (
          <button 
            onClick={onEdit} 
            className={`${styles.btn} ${styles.btnEdit}`}
            title={t('common.edit')}
          >
            ✏️ {t('common.edit')}
          </button>
        )}
        
        {/* Pulsanti di salvataggio/annullamento - mostrati solo in modalità privata */}
        {!isPublicView && showSaveCancel && isEditing && (
          <div className={styles.editButtons}>
            <button 
              onClick={onCancel} 
              className={`${styles.btn} ${styles.btnCancel}`}
              title={t('common.cancel')}
            >
              ❌ {t('common.cancel')}
            </button>
            <button 
              onClick={onSave} 
              className={`${styles.btn} ${styles.btnSave}`}
              title={t('common.save')}
            >
              💾 {t('common.save')}
            </button>
          </div>
        )}
      </div>
      
      <div className={styles.sectionContent}>
        {children}
      </div>
    </div>
  );
};

export default ProfileSectionWrapper;
