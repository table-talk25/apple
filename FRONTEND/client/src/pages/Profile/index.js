// File: /src/pages/Profile/index.js (Versione Unificata e Corretta)

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Alert, Spinner, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { FaUsers, FaRegSmile, FaCheckCircle } from 'react-icons/fa';

import { useAuth } from '../../contexts/AuthContext';
import profileService from '../../services/profileService';
import ErrorBoundary from '../../components/common/ErrorBoundary';

import ProfileHeader from '../../components/profile/ProfileHeader';
import PersonalInfo from '../../components/profile/PersonalInfo';
import InterestsSection from '../../components/profile/InterestsSection';
import LanguagesSection from '../../components/profile/LanguagesSection';
import ProfileSettings from '../../components/profile/ProfileSettings';
import BackButton from '../../components/common/BackButton';

import styles from './ProfilePage.module.css'; // Useremo solo lo stile della pagina profilo

const ProfilePage = () => {
    const { t } = useTranslation();
    const { user, updateUser, loading: authLoading, logout, deleteAccount } = useAuth();
    
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');

    const loadProfile = useCallback(async () => {
        console.log('[ProfilePage] loadProfile chiamato, user?.id:', user?.id);
        if (!user?.id) {
            console.warn('[ProfilePage] ⚠️ User ID non presente, salto il caricamento');
            return;
        }
        try {
            setLoading(true);
            setError('');
            console.log('[ProfilePage] Caricamento profilo per user ID:', user.id);
            const data = await profileService.getProfile();
            console.log('[ProfilePage] Profilo caricato:', {
                hasData: !!data,
                userId: data?.id,
                nickname: data?.nickname
            });
            setProfileData(data);
            // Aggiorna anche lo stato globale
            updateUser(data);
        } catch (err) {
            console.error('[ProfilePage] ❌ Errore nel caricamento profilo:', {
                message: err.message,
                status: err?.response?.status,
                statusText: err?.response?.statusText,
                data: err?.response?.data
            });
            const errorMessage = err?.response?.data?.message || err.message || t('profile.loadError');
            setError(errorMessage);
            // Se è un errore 401, potrebbe essere necessario fare logout
            if (err?.response?.status === 401) {
                console.warn('[ProfilePage] ⚠️ Errore 401, potrebbe essere necessario fare logout');
            }
        } finally {
            setLoading(false);
        }
    }, [user?.id, t, updateUser]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const handleProfileUpdate = async (updatedData) => {
        setIsUpdating(true);
        try {
            const freshProfile = await profileService.updateProfile(updatedData);
            setProfileData(freshProfile);
            updateUser(freshProfile); // Aggiorna il context
            toast.success(t('profile.updateSuccess'));

            // Se il profilo era incompleto, ora è completo!
            if (!user.profileCompleted) {
                // Potresti mostrare un messaggio di successo e reindirizzare
            }
        } catch (err) {
            toast.error(err.response?.data?.message || t('profile.updateError'));
        } finally {
            setIsUpdating(false);
        }
    };

    const handleImageUpdate = async (formData) => {
        setIsUpdating(true);
        try {
            console.log('🖼️ [Profile] Inizio upload immagine profilo...');
            const updatedProfile = await profileService.updateProfileImage(formData);
            console.log('✅ [Profile] Immagine profilo aggiornata:', updatedProfile);
            
            setProfileData(updatedProfile);
            updateUser(updatedProfile); // Aggiorna il context
            toast.success(t('profile.imageUpdateSuccess') || 'Immagine profilo aggiornata con successo!');
        } catch (err) {
            console.error('❌ [Profile] Errore upload immagine:', err);
            toast.error(err.response?.data?.message || t('profile.imageUpdateError') || 'Errore durante l\'aggiornamento dell\'immagine');
        } finally {
            setIsUpdating(false);
        }
    };

    // --- LOGICA DI RENDER PRINCIPALE ---

    // Se l'autenticazione è ancora in caricamento, mostra spinner
    if (authLoading) {
        return <Spinner fullscreen label={t('common.loading') || 'Caricamento...'} />;
    }

    // Se non c'è un utente autenticato, mostra errore
    if (!user) {
        return (
            <Container>
                <Alert variant="warning">
                    {t('profile.notAuthenticated') || 'Devi essere autenticato per visualizzare il profilo.'}
                </Alert>
            </Container>
        );
    }

    // Se il profilo è ancora in caricamento, mostra spinner
    if (loading) {
        return <Spinner fullscreen label={t('common.loadingProfile') || 'Caricamento profilo...'} />;
    }

    // Se c'è un errore, mostralo
    if (error) {
        return (
            <Container>
                <Alert variant="danger">{error}</Alert>
                <Button onClick={() => loadProfile()} className="mt-3">
                    {t('common.retry') || 'Riprova'}
                </Button>
            </Container>
        );
    }

    // SCENARIO 1: L'utente è loggato ma il profilo NON è completo
    if (user && !user.profileCompleted) {
        return (
            <div className={styles.welcomePage}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Un ultimo passo!</h1>
                    <p className={styles.subtitle}>
                        Completa il tuo profilo per rendere la tua esperienza su TableTalk unica.
                    </p>
                </div>

                <div className={styles.benefitsGrid}>
                    <div className={styles.benefitCard}>
                        <FaUsers className={styles.icon} size={40} />
                        <h3 className={styles.cardTitle}>Trova le Persone Giuste</h3>
                        <p className={styles.cardText}>
                            Aggiungendo i tuoi interessi, ti aiuteremo a trovare pasti con persone simili a te.
                        </p>
                    </div>
                    <div className={styles.benefitCard}>
                        <FaRegSmile className={styles.icon} size={40} />
                        <h3 className={styles.cardTitle}>Fai una Bella Impressione</h3>
                        <p className={styles.cardText}>
                            Una bio e una foto profilo aiutano gli altri a conoscerti meglio prima di un pasto.
                        </p>
                    </div>
                    <div className={styles.benefitCard}>
                        <FaCheckCircle className={styles.icon} size={40} />
                        <h3 className={styles.cardTitle}>Ottieni Più Inviti</h3>
                        <p className={styles.cardText}>
                            I profili completi hanno il 75% in più di probabilità di essere invitati a pasti esclusivi.
                        </p>
                    </div>
                </div>

                {/* Mostriamo direttamente il form di modifica sotto! */}
                <div className={styles.profilePage} style={{ paddingTop: '2rem' }}>
                    <div className={styles.content}>
                        {/* Aggiunta ProfileHeader per permettere upload foto immediato */}
                        <ProfileHeader 
                            profile={profileData || user} 
                            onUpdateImage={handleImageUpdate} 
                            isEditing={true} // Opzionale: forza modalità edit se il componente lo supporta
                        />
                        <PersonalInfo profileData={profileData || user} onUpdate={handleProfileUpdate} isUpdating={isUpdating} />
                        <InterestsSection profileData={profileData || user} onUpdate={handleProfileUpdate} isUpdating={isUpdating} />
                    </div>
                </div>
            </div>
        );
    }
    
    // SCENARIO 2: Il profilo è completo, mostra la pagina di modifica standard
    // Usa profileData se disponibile, altrimenti usa user come fallback
    const displayData = profileData || user;
    
    if (!displayData) {
        return (
            <Container>
                <Alert variant="warning">
                    {t('profile.noData') || 'Impossibile caricare i dati del profilo.'}
                </Alert>
                <Button onClick={() => loadProfile()} className="mt-3">
                    {t('common.retry') || 'Riprova'}
                </Button>
            </Container>
        );
    }

    return (
        <ErrorBoundary componentName="ProfilePage">
            <Container fluid className={styles.profilePage}>
                <div className={styles.header}>
                    <BackButton className={styles.smallBackButton} />
                </div>
                <div className={styles.content}>
                    <ProfileHeader profile={displayData} onUpdateImage={handleImageUpdate} />
                    <PersonalInfo profileData={displayData} onUpdate={handleProfileUpdate} isUpdating={isUpdating} />
                    <InterestsSection profileData={displayData} onUpdate={handleProfileUpdate} isUpdating={isUpdating} />
                    <LanguagesSection profileData={displayData} onUpdate={handleProfileUpdate} isUpdating={isUpdating} />
                    <ProfileSettings profileData={displayData} onUpdate={handleProfileUpdate} onLogout={logout} onDeleteAccount={deleteAccount} />
                </div>
            </Container>
        </ErrorBoundary>
    );
};

export default ProfilePage;