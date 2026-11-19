import React, { useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Camera } from 'lucide-react';
import profileService from '../../../services/profileService';
import { computeProfileCompleteness } from '../../../utils/profileCompleteness';
import { Avatar, Button } from '../../ui';
import styles from './ProfileHeader.module.css';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const ProfileHeader = ({
  profile,
  onUpdateImage,
  onEditProfile,
  isEditingPersonalInfo = false,
  isPublicView = false,
}) => {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputId = useId();

  if (!profile) return null;

  const displayName =
    profile.nickname ||
    profile.name ||
    t('profile.header.noNickname', 'Nickname');
  const imageUrl = profile.profileImage
    ? profileService.getFullImageUrl(profile.profileImage)
    : '';
  const { percent, missingKeys } = computeProfileCompleteness(profile);

  const getMissingLabel = (key) =>
    t(`profileUi.missing.${key}`, key);

  const completenessMessage =
    percent >= 100 || missingKeys.length === 0
      ? t('profileUi.completenessComplete', 'Profilo al 100% · completo ✓')
      : missingKeys.length === 1
      ? t('profileUi.completenessOne', {
          percent,
          first: getMissingLabel(missingKeys[0]),
          defaultValue: `Profilo al ${percent}% · aggiungi ${getMissingLabel(missingKeys[0])} per farti trovare`,
        })
      : t('profileUi.completenessTwo', {
          percent,
          first: getMissingLabel(missingKeys[0]),
          second: getMissingLabel(missingKeys[1]),
          defaultValue: `Profilo al ${percent}% · aggiungi ${getMissingLabel(missingKeys[0])} e ${getMissingLabel(missingKeys[1])} per farti trovare`,
        });

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      toast.error(
        t('profileUi.avatarInvalidType', 'Seleziona solo file immagine (JPG, PNG, WebP).')
      );
      e.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(
        t('profileUi.avatarTooLarge', 'Immagine troppo grande (massimo 5MB).')
      );
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      if (onUpdateImage) {
        await onUpdateImage(formData);
      }
    } catch (error) {
      console.error("Errore durante l'upload:", error);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <section className={styles.pCard} data-testid="profile-header-card">
      <div className={styles.pHead}>
        <div className={styles.avatarWrap}>
          <Avatar
            src={imageUrl}
            name={displayName}
            alt={displayName}
            size="lg"
            tone="accent"
          />

          {!isPublicView && onUpdateImage && (
            <label
              htmlFor={uploadInputId}
              className={`${styles.cameraBtn} ${isUploading ? styles.cameraBtnDisabled : ''}`}
              title={t('profileUi.changePhoto', 'Cambia foto profilo')}
              aria-label={t('profileUi.changePhoto', 'Cambia foto profilo')}
            >
              <Camera size={14} strokeWidth={2.2} aria-hidden="true" />
              <input
                id={uploadInputId}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={isUploading}
                hidden
              />
            </label>
          )}
        </div>

        <div className={styles.info}>
          {isPublicView ? (
            <>
              <h2 className={styles.name}>{displayName}</h2>
              <p className={styles.bio}>
                {profile.bio || t('profile.header.noBio', 'Nessuna biografia impostata.')}
              </p>
            </>
          ) : (
            <>
              <h1 className={styles.name}>{displayName}</h1>
              {profile.email && <div className={styles.email}>{profile.email}</div>}

              <div
                className={styles.bar}
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={completenessMessage}
              >
                <span
                  className={styles.barFill}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className={styles.completenessText} data-testid="profile-completeness">
                {completenessMessage}
              </div>
            </>
          )}
        </div>

        {!isPublicView && onEditProfile && (
          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEditProfile}
              data-testid="profile-edit-btn"
            >
              {isEditingPersonalInfo
                ? t('profile.personalInfo.cancel', 'Annulla')
                : t('profile.personalInfo.edit', 'Modifica')}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProfileHeader;
