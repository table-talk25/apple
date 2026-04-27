import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Badge, Spinner, Alert, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { FaMapMarkerAlt, FaCalendarAlt, FaClock, FaUser, FaUsers, FaComment, FaVideo, FaShareAlt, FaArrowLeft, FaTrash } from 'react-icons/fa';

import mealService from '../../../services/mealService';
import { useAuth } from '../../../contexts/AuthContext';
import { getHostAvatarUrl, getMealCoverImageUrl } from '../../../constants/mealConstants';
import OpenStreetMapComponent from '../../../components/maps/OpenStreetMapComponent'; // La tua mappa
import BackButton from '../../../components/common/BackButton';
import JoinMealButton from '../../../components/meals/JoinMealButton';
import LeaveMealButton from '../../../components/meals/LeaveMealButton';
import styles from './MealDetailPage.module.css';

const MealDetailPage = () => {
  const { t } = useTranslation();
  const { mealId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Caricamento Dati Pasto
  const fetchMeal = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mealService.getMealById(mealId);
      // Gestione robusta: a volte arriva { success: true, data: meal } altre volte direttamente meal
      setMeal(data.data || data); 
    } catch (err) {
      console.error('Errore caricamento pasto:', err);
      setError(t('meals.detail.loadError') || 'Impossibile caricare il pasto.');
    } finally {
      setLoading(false);
    }
  }, [mealId, t]);

  useEffect(() => {
    fetchMeal();
  }, [fetchMeal]);

  // Aggiornamento rapido dopo un'azione (Join/Leave)
  const handleRefresh = () => {
    fetchMeal();
  };

  if (loading) return <div className="d-flex justify-content-center py-5"><Spinner animation="border" /></div>;
  if (error) return <Container className="py-5"><Alert variant="danger">{error}</Alert><BackButton /></Container>;
  if (!meal) return <Container className="py-5"><Alert variant="warning">Pasto non trovato</Alert><BackButton /></Container>;

  // Logica Permessi
  const isHost = user && (meal.host?._id === user._id || meal.host === user._id);
  // Controlla se l'utente è nella lista partecipanti (gestendo sia oggetti popolati che ID stringa)
  const isParticipant = user && meal.participants?.some(p => 
    (p._id || p) === user._id
  );
  const isVirtual = meal.mealType === 'virtual';
  const isFull = meal.participants?.length >= meal.maxParticipants;
  const isPast = new Date(meal.date) < new Date();

  // --- LOGICA TEMPORALE VIDEOCHIAMATA ---
  const mealDate = new Date(meal.date);
  const now = new Date();
  const durationMs = (meal.duration || 60) * 60 * 1000; // Default 60 min se mancante
  const mealEndTime = new Date(mealDate.getTime() + durationMs);
  const tenMinutesBeforeStart = new Date(mealDate.getTime() - 10 * 60 * 1000);

  // È accessibile se: (Adesso >= 10 min prima) E (Adesso <= Fine pasto)
  const isVideoAccessible = isVirtual && 
                            (isParticipant || isHost) && 
                            now >= tenMinutesBeforeStart && 
                            now <= mealEndTime;

  // Opzionale: Se l'utente è partecipante ma è troppo presto, mostriamo un avviso?
  const isTooEarly = isVirtual && (isParticipant || isHost) && now < tenMinutesBeforeStart && now > new Date(mealDate.getTime() - 24 * 60 * 60 * 1000); // Mostra solo se manca meno di 24h

  // Navigazione Chat
  const handleChatClick = () => {
    if (meal.chatId) {
      // meal.chatId può essere un oggetto o una stringa
      const targetId = typeof meal.chatId === 'object' ? meal.chatId._id : meal.chatId;
      // Usa /chat/ (singolare) non /chats/ (plurale) - corrisponde alla route in App.js
      navigate(`/chat/${targetId}`);
    } else {
      toast.error(t('chat.notAvailable') || 'Chat non ancora disponibile');
    }
  };

  // Navigazione Video
  const handleVideoClick = () => {
    navigate(`/meals/${meal._id}/video`);
  };

  // Eliminazione TableTalk
  const handleDeleteMeal = async () => {
    if (!meal || !isHost) return;
    
    setIsDeleting(true);
    try {
      await mealService.deleteMeal(meal._id);
      toast.success(t('meals.detail.deleteSuccess') || 'TableTalk® eliminato con successo!');
      navigate('/meals', { replace: true });
    } catch (err) {
      console.error('Errore eliminazione pasto:', err);
      const errorMsg = err.response?.data?.message || err.message || t('meals.detail.deleteError') || 'Errore durante l\'eliminazione';
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header Immagine */}
      <div 
        className={styles.heroImage} 
        style={{ 
          backgroundImage: `url(${getMealCoverImageUrl(meal.imageUrl)})` 
        }}
      >
        <div className={styles.overlay}>
          <Container>
            <BackButton className="mb-3 text-white" />
            <Badge bg={isVirtual ? "info" : "success"} className="mb-2">
              {isVirtual ? t('meals.type.virtual') : t('meals.type.physical')}
            </Badge>
            <h1 className={styles.title}>{meal.title}</h1>
          </Container>
        </div>
      </div>

      <Container className={styles.contentContainer}>
        <Row>
          <Col lg={8}>
            {/* Info Principali */}
            <div className={styles.card}>
              <div className={styles.hostInfo}>
                <img 
                  src={getHostAvatarUrl(meal.host?.profileImage)} 
                  alt={meal.host?.nickname} 
                  className={styles.hostAvatar} 
                />
                <div>
                  <p className="mb-0 text-muted">{t('meals.detail.hostedBy')}</p>
                  <strong>{meal.host?.nickname || 'Host'}</strong>
                </div>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <FaCalendarAlt className={styles.icon} />
                  <div>
                    <label>{t('meals.form.dateLabel')}</label>
                    <p>{new Date(meal.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <FaClock className={styles.icon} />
                  <div>
                    <label>{t('meals.form.timeLabel')}</label>
                    <p>{new Date(meal.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <FaUsers className={styles.icon} />
                  <div>
                    <label>{t('meals.detail.participantsList')}</label>
                    <p>{t('meals.detail.participantsText', { 
                      current: meal.participants?.length || 0, 
                      max: meal.maxParticipants 
                    })}</p>
                  </div>
                </div>
              </div>

              <hr />
              
              <h3>{t('meals.detail.description')}</h3>
              <p className={styles.description}>{meal.description}</p>

              {/* Sezione Argomenti (Topics) */}
              {meal.topics && meal.topics.length > 0 && (
                <div className="mb-4">
                  <h5>{t('meals.form.topicsLabel')}</h5>
                  <div className={styles.topicsContainer}>
                    {meal.topics.map((topic, idx) => (
                      <Badge key={idx} bg="light" text="dark" className="me-2 p-2 border">
                        #{topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mappa (Solo se Fisico e Location presente) */}
            {!isVirtual && meal.location && meal.location.coordinates && (
              <div className={styles.card}>
                <h4 className="mb-3"><FaMapMarkerAlt className="me-2" />{t('meals.detail.location')}</h4>
                <p className="text-muted">{meal.location.address}</p>
                <div style={{ height: '300px', borderRadius: '10px', overflow: 'hidden' }}>
                  <OpenStreetMapComponent 
                    readOnly={true}
                    center={[meal.location.coordinates[1], meal.location.coordinates[0]]} // [Lat, Lng]
                    zoom={15}
                    markers={[{ 
                      lat: meal.location.coordinates[1], 
                      lng: meal.location.coordinates[0],
                      title: meal.title 
                    }]}
                  />
                </div>
                <Button 
                  variant="outline-primary" 
                  className="mt-3 w-100"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${meal.location.coordinates[1]},${meal.location.coordinates[0]}`, '_blank')}
                >
                  Apri in Google Maps 🗺️
                </Button>
              </div>
            )}
          </Col>

          {/* Sidebar Azioni */}
          <Col lg={4}>
            <div className={`${styles.card} ${styles.actionCard}`}>
              <h4 className="mb-4">{t('meals.detail.actions')}</h4>
              
              {/* 1. Pulsante Unisciti / Lascia */}
              {!isHost && !isParticipant && !isPast && (
                <JoinMealButton
                  mealId={meal._id}
                  onSuccess={handleRefresh}
                  className="w-100 mb-3 btn-lg"
                />
              )}

              {!isHost && isParticipant && !isPast && (
                <LeaveMealButton 
                  mealId={meal._id} 
                  onSuccess={handleRefresh} 
                  className="w-100 mb-3 btn-outline-danger"
                />
              )}

              {/* 2. Pulsante Chat (Solo partecipanti/host) */}
              {(isParticipant || isHost) && meal.chatId && (
                <Button 
                  variant="primary" 
                  className="w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
                  onClick={handleChatClick}
                >
                  <FaComment /> {t('meals.detail.openChat')}
                </Button>
              )}

              {/* 3. Pulsante Video (Logica a tempo) */}
              {isVideoAccessible ? (
                <Button 
                  variant="success" 
                  className="w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
                  onClick={handleVideoClick}
                >
                  <FaVideo /> {t('meals.detail.joinVideo')}
                </Button>
              ) : (
                /* Feedback se è troppo presto (Opzionale, migliora UX) */
                isTooEarly && (
                  <div className="w-100 mb-3 text-center text-muted small border p-2 rounded bg-light">
                    <FaVideo className="me-1" /> 
                    Video disponibile dalle {tenMinutesBeforeStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                )
              )}

              {/* 4. Pulsante Condividi */}
              <Button 
                variant="outline-secondary" 
                className="w-100 mb-3"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: meal.title,
                      text: `Unisciti a me per ${meal.title} su TableTalk!`,
                      url: window.location.href
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copiato negli appunti!');
                  }
                }}
              >
                <FaShareAlt className="me-2" /> {t('common.share')}
              </Button>

              {/* 5. Pulsante Elimina (Solo per Host) */}
              {isHost && !isPast && (
                <Button 
                  variant="danger" 
                  className="w-100"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <FaTrash className="me-2" /> {t('meals.detail.deleteMeal') || 'Elimina TableTalk®'}
                </Button>
              )}

              {/* Partecipanti Lista */}
              <div className="mt-4">
                <h5>{t('meals.detail.participantsList')} ({meal.participants?.length || 0})</h5>
                <div className={styles.avatarList}>
                  {/* Mostra Host */}
                  {(() => {
                    const hostId = meal.host?._id || meal.host;
                    const isMeHost = user && hostId === user._id;
                    return (
                      <div
                        className={styles.participantItem}
                        title={`Host: ${meal.host?.nickname}`}
                        role={!isMeHost && hostId ? 'button' : undefined}
                        tabIndex={!isMeHost && hostId ? 0 : -1}
                        onClick={() => {
                          if (!hostId) return;
                          if (isMeHost) navigate('/profile');
                          else navigate(`/public-profile/${hostId}`);
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && hostId) {
                            e.preventDefault();
                            if (isMeHost) navigate('/profile');
                            else navigate(`/public-profile/${hostId}`);
                          }
                        }}
                        style={{ cursor: hostId ? 'pointer' : 'default' }}
                      >
                        <img src={getHostAvatarUrl(meal.host?.profileImage)} className={styles.miniAvatar} style={{ border: '2px solid #ff6b6b' }} alt="Host" />
                      </div>
                    );
                  })()}
                  {/* Mostra Altri */}
                  {meal.participants?.map(p => {
                    const participantId = p?._id || p;
                    const hostId = meal.host?._id || meal.host;
                    if (!participantId || participantId === hostId) return null;
                    const isMe = user && participantId === user._id;
                    const goToProfile = () => {
                      if (isMe) navigate('/profile');
                      else navigate(`/public-profile/${participantId}`);
                    };
                    return (
                      <div
                        key={participantId}
                        className={styles.participantItem}
                        title={p?.nickname}
                        role="button"
                        tabIndex={0}
                        onClick={goToProfile}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            goToProfile();
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <img src={getHostAvatarUrl(p?.profileImage)} className={styles.miniAvatar} alt={p?.nickname || 'User'} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Modal Conferma Eliminazione */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('meals.detail.deleteMeal') || 'Elimina TableTalk®'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t('meals.detail.deleteMealConfirmation') || 'Sei sicuro di voler eliminare questo TableTalk®? Questa azione non può essere annullata.'}</p>
          {meal && (
            <div className="mt-3 p-3 bg-light rounded">
              <strong>{meal.title}</strong>
              <br />
              <small className="text-muted">
                {new Date(meal.date).toLocaleDateString()} alle {new Date(meal.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </small>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
            {t('common.cancel') || 'Annulla'}
          </Button>
          <Button variant="danger" onClick={handleDeleteMeal} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('meals.detail.deleting') || 'Eliminazione...'}
              </>
            ) : (
              <>
                <FaTrash className="me-2" /> {t('meals.detail.deleteMeal') || 'Elimina'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MealDetailPage;
