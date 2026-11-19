import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import DeleteAccountModal from '../../common/DeleteAccountModal';
import ChangePasswordModal from '../../common/ChangePasswordModal';
import authService from '../../../services/authService';
import profileService from '../../../services/profileService';
import { Button } from '../../ui';
import styles from './ProfileSettings.module.css';

const ProfileSettings = ({ profileData, onUpdate, onLogout, onDeleteAccount }) => {
  const { t } = useTranslation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    email: profileData?.settings?.notifications?.email ?? true,
  });

  const [showLocation, setShowLocation] = useState(
    profileData?.settings?.privacy?.showLocationOnMap ?? false
  );

  useEffect(() => {
    setNotificationSettings({
      email: profileData?.settings?.notifications?.email ?? true,
    });
  }, [profileData?.settings?.notifications?.email]);

  useEffect(() => {
    setShowLocation(profileData?.settings?.privacy?.showLocationOnMap ?? false);
  }, [profileData?.settings?.privacy?.showLocationOnMap]);

  if (!profileData) {
    return null;
  }

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    const newSettings = {
      ...(profileData?.settings?.notifications || {}),
      ...notificationSettings,
      [name]: checked,
    };
    setNotificationSettings((prev) => ({ ...prev, [name]: checked }));

    onUpdate({
      settings: {
        ...(profileData.settings || {}),
        notifications: newSettings,
      },
    });
    toast.info(t('profile.settings.notificationUpdated', 'Impostazione notifiche aggiornata.'), {
      toastId: 'profile-notif',
    });
  };

  const handleLocationToggle = async () => {
    const newSetting = !showLocation;

    if (newSetting === true) {
      try {
        toast.info(
          t('profile.settings.requestingLocation', 'Richiesta posizione per il matching...')
        );

        let latitude;
        let longitude;

        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { Geolocation } = await import('@capacitor/geolocation');

          let permissionStatus = await Geolocation.checkPermissions();

          if (permissionStatus.location !== 'granted') {
            permissionStatus = await Geolocation.requestPermissions();

            if (permissionStatus.location !== 'granted') {
              toast.error(
                t(
                  'profile.settings.locationPermissionDenied',
                  'Permesso posizione negato. Il matching non funzionerà senza la posizione.'
                )
              );
              return;
            }
          }

          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000,
          });

          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } else {
          if (!navigator.geolocation) {
            toast.error(
              t(
                'profile.settings.geolocationNotSupported',
                'Geolocalizzazione non supportata dal browser.'
              )
            );
            return;
          }

          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 60000,
            });
          });

          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        }

        await profileService.updateUserLocation({
          latitude,
          longitude,
        });

        setShowLocation(newSetting);

        await onUpdate({
          settings: {
            ...(profileData.settings || {}),
            privacy: {
              ...(profileData.settings?.privacy || {}),
              showLocationOnMap: newSetting,
            },
          },
        });

        toast.success(
          t(
            'profile.settings.locationEnabled',
            'Posizione abilitata! Il matching in tempo reale è attivo.'
          )
        );
      } catch (error) {
        console.error('❌ [ProfileSettings] Errore durante richiesta posizione:', error);
        toast.error(
          t(
            'profile.settings.locationError',
            'Errore durante la richiesta della posizione. Riprova.'
          )
        );
      }
    } else {
      setShowLocation(newSetting);

      onUpdate({
        settings: {
          ...(profileData.settings || {}),
          privacy: {
            ...(profileData.settings?.privacy || {}),
            showLocationOnMap: newSetting,
          },
        },
      });

      toast.info(
        t('profile.settings.locationDisabled', 'Matching in tempo reale disabilitato.')
      );
    }
  };

  const handleDeleteAccount = async (password) => {
    try {
      await onDeleteAccount(password);
      toast.success(t('profile.settings.accountDeleted', 'Account eliminato con successo'));
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          t('profile.settings.deleteError', "Errore durante l'eliminazione dell'account")
      );
      throw error;
    }
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    await authService.changePassword({ currentPassword, newPassword });
    toast.success(t('changePasswordModal.changeSuccess', 'Password cambiata con successo'));
  };

  return (
    <>
      <section className={styles.pCard} data-testid="profile-settings-card">
        <h3>{t('profileUi.settingsTitle', 'Impostazioni')}</h3>

        <div className={styles.rows}>
          <div className={styles.pRow}>
            <span className={styles.rowLabel}>
              {t('profileUi.emailNotifications', 'Notifiche via email')}
            </span>
            <label className={styles.switch} aria-label={t('profileUi.emailNotifications', 'Notifiche via email')}>
              <input
                type="checkbox"
                name="email"
                checked={notificationSettings.email}
                onChange={handleNotificationChange}
                data-testid="switch-email-notifications"
              />
              <span className={styles.switchTrack} aria-hidden="true" />
            </label>
          </div>

          <div className={styles.pRow}>
            <span className={styles.rowLabel}>
              {t('profileUi.locationMatching', 'Posizione per matching in tempo reale')}
            </span>
            <label className={styles.switch} aria-label={t('profileUi.locationMatching', 'Posizione per matching in tempo reale')}>
              <input
                type="checkbox"
                checked={showLocation}
                onChange={handleLocationToggle}
                data-testid="switch-location-matching"
              />
              <span className={styles.switchTrack} aria-hidden="true" />
            </label>
          </div>

          <div className={styles.pRow}>
            <span className={styles.rowMuted}>
              {t('profileUi.passwordLabel', 'Password')}
            </span>
            <button
              type="button"
              className={styles.linklike}
              onClick={() => setShowChangePasswordModal(true)}
              data-testid="change-password-btn"
            >
              {t('profileUi.changeAction', 'Cambia')}
            </button>
          </div>

          <div className={styles.pRow}>
            <span className={styles.rowMuted}>
              {t('profileUi.privacyLabel', 'Privacy')}
            </span>
            <Link to="/privacy" className={styles.linklike}>
              {t('profileUi.privacyPolicy', 'Privacy Policy')}
            </Link>
          </div>
        </div>
      </section>

      <section
        className={`${styles.pCard} ${styles.dangerCard}`}
        data-testid="account-danger-card"
      >
        <h3 className={styles.dangerTitle}>
          {t('profileUi.accountZoneTitle', 'Zona account')}
        </h3>

        {confirmingLogout ? (
          <div className={styles.confirmLogoutBox} role="region" aria-live="polite">
            <p>
              {t('profileUi.logoutConfirmShort', 'Vuoi davvero uscire dal tuo account?')}
            </p>
            <div className={styles.confirmLogoutBtns}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingLogout(false)}
              >
                {t('mine.cancel', 'Annulla')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onLogout}
                data-testid="confirm-logout-btn"
              >
                {t('profile.settings.logout', 'Esci')}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.accountActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingLogout(true)}
              data-testid="logout-btn"
            >
              {t('profile.settings.logout', 'Esci')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              data-testid="delete-account-btn"
            >
              {t('profileUi.deleteAccount', 'Elimina account')}
            </Button>
          </div>
        )}

        <p className={styles.hint}>
          {t(
            'profileUi.deleteHint',
            "L'eliminazione è definitiva e rimuove tutti i tuoi dati."
          )}
        </p>
      </section>

      <DeleteAccountModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onDeleteAccount={handleDeleteAccount}
        user={profileData}
      />

      <ChangePasswordModal
        show={showChangePasswordModal}
        onHide={() => setShowChangePasswordModal(false)}
        onChangePassword={handleChangePassword}
      />
    </>
  );
};

export default ProfileSettings;
