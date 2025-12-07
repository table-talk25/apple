// File: src/pages/PublicProfile/index.js (Versione con Layout Finale)

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import profileService from '../../services/profileService';
import styles from './PublicProfilePage.module.css';
import { Container, Row, Col, Card, Spinner, Alert, Button, Badge, Accordion } from 'react-bootstrap';
import { FaBirthdayCake, FaMapMarkerAlt, FaHeart, FaUtensils, FaStar, FaComments, FaGlobe } from 'react-icons/fa';
import PersonalInfo from '../../components/profile/PersonalInfo';
import InterestsSection from '../../components/profile/InterestsSection';
import MealCard from '../../components/meals/MealCard';
import BackButton from '../../components/common/BackButton';
import BlockUserMenu from '../../components/common/BlockUserMenu';

const PublicProfilePage = () => {
    const { t } = useTranslation();
    const { userId } = useParams();
    const { user: loggedInUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isBlocked, setIsBlocked] = useState(false);
    const isOwner = loggedInUser?._id === userId;

    const fetchPublicProfile = useCallback(async () => {
        console.log('👤 [PublicProfile] Fetching profile for userId:', userId);
        setLoading(true);
        setError('');
        try {
            const profileData = await profileService.getPublicProfileById(userId);
            setProfile(profileData);
        } catch (err) {
            setError(err.message || t('publicProfile.loadError'));
        } finally {
            setLoading(false);
        }
    }, [userId, t]);

    useEffect(() => {
        fetchPublicProfile();
    }, [fetchPublicProfile]);

    const handleBlockChange = (blocked) => {
        setIsBlocked(blocked);
        // Se l'utente è stato bloccato, reindirizza alla pagina precedente
        if (blocked) {
            window.history.back();
        }
    };

    if (loading) return <Container className="text-center py-5"><Spinner animation="border" /></Container>;
    if (error || !profile) return <Container className="text-center py-5"><Alert variant="danger">{error || t('publicProfile.loadError')}</Alert></Container>;

    const capitalize = (s) => s && s.charAt(0).toUpperCase() + s.slice(1);

        // Filtriamo i TableTalk® a cui l'utente ha partecipato escludendo quelli che ha organizzato lui stesso
        const participatedMeals = profile.joinedMeals?.filter(
            joinedMeal => !profile.createdMeals?.some(createdMeal => createdMeal._id === joinedMeal._id)
          ) || [];

    // Limita le liste a massimo 3 elementi per sezione
    const organizedMealsAll = profile.createdMeals || [];
    const organizedMealsTop3 = organizedMealsAll.slice(0, 3);
    const participatedTop3 = participatedMeals.slice(0, 3);

    return (
        <div className={styles.profilePageBackground}>
            <Container className={styles.profileContainer}>
                {/* Header con Immagine e Nickname */}
                <header className={styles.profileHeader}>
                    {(() => {
                        const imageUrl = profileService.getFullImageUrl(profile.profileImage);
                        console.log('👤 [PublicProfile] Profile image URL:', imageUrl);
                        console.log('👤 [PublicProfile] Profile image field:', profile.profileImage);
                        return (
                            <img
                                src={imageUrl}
                                alt={profile.nickname}
                                className={styles.profileAvatar}
                                onError={(e) => {
                                    console.log('❌ Errore caricamento immagine profilo:', e);
                                    try {
                                      const fallback = profileService.getFullImageUrl('uploads/profile-images/default-avatar.jpg');
                                      e.target.src = fallback;
                                    } catch (_) {}
                                }}
                            />
                        );
                    })()}
                    <div className={styles.headerInfo}>
                        <h1>{profile.nickname}</h1>
                        <div className={styles.headerActions}>
                            {isOwner ? (
                                <Button as={Link} to="/impostazioni/profilo" variant="secondary" size="sm">
                                    {t('publicProfile.editProfile')}
                                </Button>
                            ) : (
                                <BlockUserMenu 
                                    userId={userId}
                                    reportedUser={profile}
                                    onBlockChange={handleBlockChange}
                                />
                            )}
                        </div>
                    </div>
                </header>

                {/* Contenuto principale a due colonne */}
                <main className={styles.profileContent}>
                    <Row>
                        {/* Colonna Sinistra: Dettagli e Interessi */}
                        <Col lg={4} className={styles.leftColumn}>
                            <Card className={styles.infoCard}>
                                <Card.Body>
                                    <Card.Title className={styles.cardTitle}>{t('publicProfile.inBrief')}</Card.Title>
                                    {profile.location && <div className={styles.detailItem}><FaMapMarkerAlt /> {t('publicProfile.from')} <strong>{profile.location}</strong></div>}
                                    {profile.age && <div className={styles.detailItem}><FaBirthdayCake /> <strong>{profile.age}</strong> {t('publicProfile.years')}</div>}
                                    {profile.gender && <div className={styles.detailItem}>{t('publicProfile.gender')}: <strong>{capitalize(profile.gender)}</strong></div>}
                                    
                                    <hr />
                                    <h5 className={styles.detailSubtitle}><FaComments /> {t('publicProfile.languages')}</h5>
                                    <div className={styles.tagsContainer}>
                                        {profile.languages?.length > 0
                                            ? profile.languages.map(lang => <Badge key={lang} pill bg="success" className={styles.tag}>{lang}</Badge>)
                                            : <p className="text-muted small">{t('publicProfile.noLanguages')}</p>}
                                    </div>

                                    <hr />
                                    <h5 className={styles.detailSubtitle}><FaUtensils /> {t('publicProfile.preferredCuisine')}</h5>
                                    {profile.preferredCuisine 
                                      ? <Badge pill bg="warning" text="dark" className={styles.tag}>{profile.preferredCuisine}</Badge>
                                      : <p className="text-muted small">{t('publicProfile.noPreference')}</p>}

                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Colonna Destra: Bio e TableTalk® con Accordion */}
                        <Col lg={8} className={styles.rightColumn}>
                             <Card className={styles.infoCard}>
                                <Card.Body>
                                    <h2 className={styles.sectionTitle}><FaHeart /> {t('publicProfile.whoIAm')}</h2>
                                    <p className={styles.bioText}>{profile.bio || t('publicProfile.noBio')}</p>
                                </Card.Body>
                            </Card>
                            
                            {/* 2. NUOVA SEZIONE TABLETALK® CON ACCORDION */}
                            <div className={styles.accordionSection}>
                                <Accordion>
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header>
                                            {t('publicProfile.organizedMeals')} ({profile.createdMeals?.length || 0})
                                        </Accordion.Header>
                                        <Accordion.Body>
                                        {organizedMealsAll.length > 0 ? (
                                                <ul className={styles.mealList}>
                                                    {organizedMealsTop3.map(meal => (
                                                        <li key={meal._id}>
                                                            <Link to={`/meals/${meal._id}`} className={styles.mealLink}>
                                                                <span className={styles.mealTitle}>{meal.title}</span>
                                                                <span className={styles.mealDate}>{new Date(meal.date).toLocaleDateString('it-IT')}</span>
                                                            </Link>
                                                        </li>
                                                    ))}
                                                    {organizedMealsAll.length > 3 && (
                                                      <li className="text-muted small">
                                                        Mostrati 3 su {organizedMealsAll.length}
                                                      </li>
                                                    )}
                                                </ul>
                                            ) : <p className="text-muted small">{t('publicProfile.noOrganizedMeals')}</p>}
                                        </Accordion.Body>
                                    </Accordion.Item>
                                    <Accordion.Item eventKey="1">
                                        <Accordion.Header>
                                            {t('publicProfile.recentParticipations')} ({participatedMeals.length})
                                        </Accordion.Header>
                                        <Accordion.Body>
                                            {participatedMeals.length > 0 ? (
                                                <ul className={styles.mealList}>
                                                    {participatedTop3.map(meal => (
                                                        <li key={meal._id}>
                                                            <Link to={`/meals/${meal._id}`} className={styles.mealLink}>
                                                                <span className={styles.mealTitle}>{meal.title}</span>
                                                                <span className={styles.mealDate}>{new Date(meal.date).toLocaleDateString('it-IT')}</span>
                                                            </Link>
                                                        </li>
                                                    ))}
                                                    {participatedMeals.length > 3 && (
                                                      <li className="text-muted small">
                                                        Mostrati 3 su {participatedMeals.length}
                                                      </li>
                                                    )}
                                                </ul>
                                            ) : <p className="text-muted small">{t('publicProfile.noParticipations')}</p>}
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                            </div>
                        </Col>
                    </Row>
                </main>
            </Container>
        </div>
    );
};

export default PublicProfilePage;
                            