// File: frontend/client/src/components/profile/ProfileSettings.js (Versione Finale e Sicura)

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBell, FaKey, FaSignOutAlt, FaTrash, FaLock, FaInfoCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import DeleteAccountModal from '../../common/DeleteAccountModal';
import ChangePasswordModal from '../../common/ChangePasswordModal';
import authService from '../../../services/authService';
import styles from './ProfileSettings.module.css';

const ProfileSettings = ({ profileData, onUpdate, onLogout, onDeleteAccount }) => {
  const { t } = useTranslation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // --- 1. HOOKS CHIAMATI ALL'INIZIO ---
  // Inizializziamo lo stato in modo sicuro usando l'optional chaining '?'
  const [notificationSettings, setNotificationSettings] = useState({
    email: profileData?.settings?.notifications?.email ?? true,
  });

  console.log('[ProfileSettings] Renderizzato con showLocationOnMap:', profileData?.settings?.privacy?.showLocationOnMap);

    // --- 1. STATO LOCALE PER LA POSIZIONE ---
  // Creiamo uno stato locale anche per l'impostazione della posizione.
  const [showLocation, setShowLocation] = useState(
    profileData?.settings?.privacy?.showLocationOnMap ?? false
  );
  
    // --- 2. SYNC CON I PROPS ---
  // Questo useEffect assicura che se i dati cambiano dall'alto (es. primo caricamento),
  // il nostro stato locale si aggiorna di conseguenza.
  useEffect(() => {
    setShowLocation(profileData?.settings?.privacy?.showLocationOnMap ?? false);
  }, [profileData?.settings?.privacy?.showLocationOnMap]);

  // --- 2. GUARDIA DI SICUREZZA ---
  // Se i dati non sono ancora arrivati, non renderizzare nulla.
  if (!profileData) {
    return null;
  }

  // --- 3. FUNZIONI HANDLER ---
  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    const newSettings = { ...notificationSettings, [name]: checked };
    setNotificationSettings(newSettings);
    
    onUpdate({ settings: { ...profileData.settings, notifications: newSettings } });
    toast.info(t('profile.settings.notificationUpdated'));
  };

  // --- 3. GESTORE CLICK AGGIORNATO ---
  const handleLocationToggle = () => {
    // Aggiorniamo prima lo stato locale per un'interfaccia super reattiva
    const newSetting = !showLocation;
    setShowLocation(newSetting);
    
    // Poi chiamiamo la funzione del genitore per salvare il dato nel backend
    onUpdate({
        settings: {
            ...profileData.settings,
            privacy: {
                ...profileData.settings.privacy,
                showLocationOnMap: newSetting
            }
        }
    });

    toast.info(t('profile.settings.locationUpdated'));
  };

  const handleLogoutClick = () => {
    if (window.confirm(t('profile.settings.logoutConfirm'))) {
      onLogout();
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteAccount = async (password) => {
    try {
      await onDeleteAccount(password);
      toast.success(t('profile.settings.accountDeleted'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('profile.settings.deleteError'));
      throw error; // Rilancia l'errore per gestirlo nel modale
    }
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success(t('changePasswordModal.changeSuccess'));
    } catch (error) {
      throw error; // Rilancia l'errore per gestirlo nel modale
    }
  };

  // --- 4. RENDER ---
  return (
    <div className={styles.container}>
      <h2>{t('profile.settings.title')}</h2>

      {/* Sezione Notifiche */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}><FaBell /> {t('profile.settings.notifications')}</h3>
        <div className={styles.settingItem}>
            <p>{t('profile.settings.emailNotifications')}</p>
            <label className={styles.switch}>
                <input type="checkbox" name="email" checked={notificationSettings.email} onChange={handleNotificationChange} />
                <span className={styles.slider}></span>
            </label>
        </div>
      </div>

      {/* Sezione Sicurezza e Privacy */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}><FaLock /> {t('profile.settings.privacySecurity')}</h3>
        <div className={styles.settingItem}>
            <p>{t('profile.settings.enableLocation')}</p>
            <label className={styles.switch}>
                {/* Usiamo l'optional chaining anche qui per sicurezza */}
                <input
                    type="checkbox"
                    checked={showLocation}
                    onChange={handleLocationToggle}
                />
                <span className={styles.slider}></span>
            </label>
        </div>
        <button className={styles.actionButton} onClick={() => setShowChangePasswordModal(true)}>
            <FaKey /> {t('profile.settings.changePassword')}
        </button>
        <p className={styles.infoLink}>
        <FaInfoCircle /> {t('profile.settings.privacyPolicyInfo')}             <Link to="/privacy" className={styles.footerLink}>Privacy Policy</Link>
 
        </p>
      </div>

      {/* Sezione Account */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}><FaSignOutAlt /> {t('profile.settings.account')}</h3>
        <button className={`${styles.actionButton} ${styles.logoutBtn}`} onClick={handleLogoutClick}>{t('profile.settings.logout')}</button>
        <button className={`${styles.actionButton} ${styles.deleteBtn}`} onClick={handleDeleteClick}><FaTrash /> {t('profile.settings.deleteAccount')}</button>
      </div>

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
    </div>
  );
};

export default ProfileSettings;