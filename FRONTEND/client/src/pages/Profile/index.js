import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import profileService from '../../services/profileService';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import ProfileHeader from '../../components/profile/ProfileHeader';
import PersonalInfo from '../../components/profile/PersonalInfo';
import InterestsSection from '../../components/profile/InterestsSection';
import LanguagesSection from '../../components/profile/LanguagesSection';
import ProfileSettings from '../../components/profile/ProfileSettings';
import styles from './ProfilePage.module.css';

const isProfileComplete = (profile) => {
  if (!profile) return false;
  if (profile.profileCompleted === true) return true;

  return Boolean(
    profile.nickname &&
      profile.nickname.trim().length >= 3 &&
      profile.bio &&
      profile.bio.trim().length >= 10 &&
      Array.isArray(profile.interests) &&
      profile.interests.length >= 1
  );
};

const hasSavedProfileDetails = (profile) => {
  if (!profile) return false;

  const hasCustomImage =
    profile.profileImage && !String(profile.profileImage).includes('default-avatar');

  return Boolean(
    (profile.nickname && profile.nickname.trim().length >= 3) ||
      (profile.bio && profile.bio.trim().length > 0) ||
      (Array.isArray(profile.interests) && profile.interests.length > 0) ||
      (Array.isArray(profile.languages) && profile.languages.length > 0) ||
      (profile.preferredCuisine && profile.preferredCuisine.trim().length > 0) ||
      hasCustomImage
  );
};

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, updateUser, loading: authLoading, logout, deleteAccount } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingPersonalInfo, setEditingPersonalInfo] = useState(false);
  const [focusPersonalField, setFocusPersonalField] = useState(null);

  const personalInfoAnchorRef = useRef(null);
  const userId = user?.id || user?._id;

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoadError('');
      const data = await profileService.getProfile();
      setProfileData(data);

      if (JSON.stringify(data) !== JSON.stringify(user)) {
        updateUser(data);
      }
    } catch (err) {
      console.error('Errore caricamento profilo:', err);
      setLoadError(
        err.response?.data?.message ||
          t(
            'profile.loadError',
            'Impossibile caricare il profilo. Riprova più tardi.'
          )
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadProfile();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [userId, authLoading, loadProfile]);

  const handleProfileUpdate = async (updatedData) => {
    setIsUpdating(true);
    try {
      const freshProfile = await profileService.updateProfile(updatedData);
      setProfileData(freshProfile);
      updateUser(freshProfile);
      toast.success(t('profile.updateSuccess', 'Profilo aggiornato!'), {
        toastId: 'profile-update',
      });
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          t('profile.updateError', "Errore durante l'aggiornamento.")
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageUpdate = async (formData) => {
    setIsUpdating(true);
    try {
      const updatedProfile = await profileService.updateProfileImage(formData);
      setProfileData(updatedProfile);
      updateUser(updatedProfile);
      toast.success(t('profile.imageUpdateSuccess', 'Immagine aggiornata!'));
    } catch (err) {
      toast.error(
        t('profile.imageUpdateError', "Errore durante il caricamento dell'immagine.")
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleHeaderEdit = () => {
    setEditingPersonalInfo((prev) => {
      const next = !prev;
      setFocusPersonalField(null);
      if (next && personalInfoAnchorRef.current) {
        personalInfoAnchorRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
      return next;
    });
  };

  const handleRequestPersonalEdit = (field = null) => {
    setFocusPersonalField(field);
    setEditingPersonalInfo(true);
  };

  const handleClosePersonalEdit = () => {
    setFocusPersonalField(null);
    setEditingPersonalInfo(false);
  };

  if (authLoading || (loading && !profileData && !user)) {
    return (
      <div className={styles.page} aria-busy="true">
        {[0, 1, 2].map((idx) => (
          <div key={idx} className={styles.skeletonCard}>
            <div className={styles.skeletonLineWide} />
            <div className={styles.skeletonLineMid} />
          </div>
        ))}
      </div>
    );
  }

  const currentProfile = profileData || user;
  if (!currentProfile) {
    return (
      <div className={styles.page}>
        <div className={styles.alertBanner} role="alert">
          {t('profile.noDataAvailable', 'Dati del profilo non disponibili.')}
        </div>
      </div>
    );
  }

  const profileComplete = isProfileComplete(currentProfile);
  const showWelcomeBanner = !profileComplete && !hasSavedProfileDetails(currentProfile);

  return (
    <ErrorBoundary componentName="ProfilePage">
      <div className={styles.page}>
        {showWelcomeBanner && (
          <div className={styles.welcomeBanner}>
            <h2>{t('profileUi.welcomeBannerTitle', 'Benvenuto su table2Talk!')}</h2>
            <p>
              {t(
                'profileUi.welcomeBannerSub',
                'Completa il tuo profilo per farti trovare più facilmente agli altri tavoli.'
              )}
            </p>
          </div>
        )}

        {loadError && (
          <div className={styles.alertBanner} role="alert">
            {loadError}
          </div>
        )}

        <ProfileHeader
          profile={currentProfile}
          onUpdateImage={handleImageUpdate}
          onEditProfile={handleToggleHeaderEdit}
          isEditingPersonalInfo={editingPersonalInfo}
        />

        <div ref={personalInfoAnchorRef}>
          <PersonalInfo
            profileData={currentProfile}
            onUpdate={handleProfileUpdate}
            isUpdating={isUpdating}
            isEditingExternal={editingPersonalInfo}
            focusField={focusPersonalField}
            onRequestEdit={handleRequestPersonalEdit}
            onCloseEdit={handleClosePersonalEdit}
          />
        </div>

        <LanguagesSection
          profileData={currentProfile}
          onUpdate={handleProfileUpdate}
        />

        <InterestsSection
          profileData={currentProfile}
          onUpdate={handleProfileUpdate}
          isUpdating={isUpdating}
        />

        <ProfileSettings
          profileData={currentProfile}
          onUpdate={handleProfileUpdate}
          onLogout={logout}
          onDeleteAccount={deleteAccount}
        />
      </div>
    </ErrorBoundary>
  );
};

export default ProfilePage;
