// File: /src/pages/Profile/index.js (Versione Unificata e Corretta)

// File: /src/pages/Profile/index.js (Versione FINALE: Senza bottone grande e con fix Lingue)

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

// Rimosso FaPencilAlt e FaSave perché ora sono dentro i componenti figli
import { useAuth } from '../../contexts/AuthContext';
import profileService from '../../services/profileService';
import ErrorBoundary from '../../components/common/ErrorBoundary';

import ProfileHeader from '../../components/profile/ProfileHeader';
import PersonalInfo from '../../components/profile/PersonalInfo';
import InterestsSection from '../../components/profile/InterestsSection';
import LanguagesSection from '../../components/profile/LanguagesSection';
import ProfileSettings from '../../components/profile/ProfileSettings';
import BackButton from '../../components/common/BackButton';

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

    const hasCustomImage = profile.profileImage &&
        !profile.profileImage.includes('default-avatar');

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
    
    // STATI
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const userId = user?.id || user?._id;
    
    // RIMOSSO: const [isEditing, setIsEditing] = useState(false); -> Non serve più!

    // CARICAMENTO PROFILO
    const loadProfile = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        
        try {
            setLoadError('');
            if (!profileData) setLoading(true);
            
            const data = await profileService.getProfile();
            setProfileData(data);
            
            if (JSON.stringify(data) !== JSON.stringify(user)) {
                updateUser(data);
            }
        } catch (err) {
            console.error('Errore caricamento profilo:', err);
            setLoadError(err.response?.data?.message || 'Non siamo riusciti a caricare il profilo. Puoi comunque completarlo qui sotto.');
        } finally {
            setLoading(false);
        }
    }, [user, userId, updateUser, profileData]);

    useEffect(() => {
        if (userId) {
            loadProfile();
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [userId, authLoading]); // Rimosso loadProfile per evitare loop

    // GESTIONE AGGIORNAMENTI
    const handleProfileUpdate = async (updatedData) => {
        setIsUpdating(true);
        try {
            const freshProfile = await profileService.updateProfile(updatedData);
            setProfileData(freshProfile);
            updateUser(freshProfile);
            toast.success(t('profile.updateSuccess') || 'Profilo aggiornato!');
        } catch (err) {
            toast.error(err.response?.data?.message || t('profile.updateError') || 'Errore aggiornamento');
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
            toast.success(t('profile.imageUpdateSuccess') || 'Foto aggiornata!');
        } catch (err) {
            toast.error(t('profile.imageUpdateError') || 'Errore aggiornamento foto');
        } finally {
            setIsUpdating(false);
        }
    };

    // --- RENDER ---

    if (authLoading) return <div className="d-flex justify-content-center mt-5"><Spinner animation="border" variant="primary" /></div>;

    if (loading && !profileData) {
        return <div className="d-flex justify-content-center mt-5"><Spinner animation="border" variant="primary" /></div>;
    }

    const currentProfile = profileData || user;
    const profileComplete = isProfileComplete(currentProfile);
    const showOnboardingHeader = !profileComplete && !hasSavedProfileDetails(currentProfile);

    // SCENARIO 1: Benvenuto (Profilo Incompleto)
    if (user && showOnboardingHeader) {
        // Prepariamo i dati corretti per lo scenario 1
        const welcomeData = profileData || user; 

        return (
            <ErrorBoundary componentName="ProfileWelcomePage">
                <div className={styles.welcomePage}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Benvenuto!</h1>
                        <p className={styles.subtitle}>Completa il tuo profilo per iniziare.</p>
                    </div>
                    
                    <div className={styles.profilePage} style={{ paddingTop: '2rem' }}>
                        <div className={styles.content}>
                            {loadError && (
                                <div role="alert" style={{
                                    background: '#fff7e0',
                                    color: '#5b4a00',
                                    border: '1px solid #ffe28a',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    marginBottom: '14px',
                                    fontSize: '0.9rem',
                                }}>
                                    {loadError}
                                </div>
                            )}

                            {/* Qui forziamo isEditing=true sui componenti che lo supportano ancora come prop esterna */}
                            <ProfileHeader profile={welcomeData} onUpdateImage={handleImageUpdate} isEditing={true} />
                            <PersonalInfo profileData={welcomeData} onUpdate={handleProfileUpdate} isUpdating={isUpdating} isEditing={true} />
                            
                            {/* FIX: Corretto il passaggio dati e rimosso isEditing (gestito internamente) */}
                            <LanguagesSection 
                                profileData={welcomeData} 
                                onUpdate={handleProfileUpdate} 
                            />
                            
                            <InterestsSection profileData={welcomeData} onUpdate={handleProfileUpdate} isUpdating={isUpdating} isEditing={true} />
                        </div>
                    </div>
                </div>
            </ErrorBoundary>
        );
    }

    // SCENARIO 2: Profilo Completo
    const displayData = currentProfile;

    if (!displayData) return <div className="p-5 text-center">Caricamento profilo...</div>;

    return (
        <ErrorBoundary componentName="ProfilePage">
            <Container fluid className={styles.profilePage} style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', paddingBottom: '80px' }}>
                
                {/* HEADER PULITO: Solo tasto indietro, niente più tasto "Modifica" gigante */}
                <div className="d-flex align-items-center mb-3 pt-2 px-2">
                    <BackButton />
                </div>

                {loading && <div className="text-center py-2"><Spinner animation="border" size="sm" /></div>}

                <div className={styles.content}>
                    <ProfileHeader 
                        profile={displayData} 
                        onUpdateImage={handleImageUpdate} 
                        isEditing={true} 
                    />
                    
                    {/* Nota: PersonalInfo e Interests potrebbero volere ancora la loro logica interna, 
                        ma per ora lasciamoli in visualizzazione finché non li clicchi se supportano edit locale */}
                    <PersonalInfo 
                        profileData={displayData} 
                        onUpdate={handleProfileUpdate} 
                        isUpdating={isUpdating} 
                        isEditing={false} /* Disattivato qui, si spera abbiano la loro matitina o si attivi diversamente */
                    />
                    
                    {/* ✅ LINGUE: Ora è perfetto. Si gestisce da solo con la sua matitina. */}
                    <LanguagesSection 
                        profileData={displayData} 
                        onUpdate={handleProfileUpdate} 
                    />

                    <InterestsSection 
                        profileData={displayData} 
                        onUpdate={handleProfileUpdate} 
                        isUpdating={isUpdating} 
                        isEditing={false} 
                    />
                    
                    <ProfileSettings 
                        profileData={displayData} 
                        onUpdate={handleProfileUpdate} 
                        onLogout={logout} 
                        onDeleteAccount={deleteAccount} 
                    />
                </div>
            </Container>
        </ErrorBoundary>
    );
};

export default ProfilePage;