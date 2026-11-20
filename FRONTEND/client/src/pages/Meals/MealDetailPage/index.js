import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Camera as CameraIcon, Video, MapPin, Trash2, Share2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import mealService from '../../../services/mealService';
import { useAuth } from '../../../contexts/AuthContext';
import { useChatDrawer } from '../../../contexts/ChatDrawerContext';
import {
  getHostAvatarUrl,
  getMealCoverImageUrl,
} from '../../../constants/mealConstants';
import { useMealTranslations } from '../../../hooks/useMealTranslations';
import useOptimisticMealActions from '../../../hooks/useOptimisticMealActions';
import {
  extractCity,
  formatMealWhen,
  getMealHostId,
  getMealRoleState,
  getUserId,
} from '../../../utils/mealFormat';
import { openExternalShareUrl } from '../../../utils/mealShare';
import OpenStreetMapComponent from '../../../components/maps/OpenStreetMapComponent';
import BackButton from '../../../components/common/BackButton';
import ShareMealModal from '../../../components/meals/ShareMealModal';
import {
  Avatar,
  Button,
  Cover,
  EmptyState,
  Modal,
  Seats,
  Toast,
} from '../../../components/ui';
import styles from './MealDetailPage.module.css';

const VerifiedIcon = ({ label }) => (
  <svg
    className={styles.verified}
    viewBox="0 0 24 24"
    fill="var(--tt-accent)"
    role="img"
    aria-label={label}
  >
    <path d="M12 2l2.4 2.1 3.1-.4 1.1 3 2.9 1.3-.7 3.1 1.9 2.5-1.9 2.5.7 3.1-2.9 1.3-1.1 3-3.1-.4L12 22l-2.4-2.1-3.1.4-1.1-3-2.9-1.3.7-3.1L1.3 12l1.9-2.5-.7-3.1 2.9-1.3 1.1-3 3.1.4z" />
    <path
      d="M10.6 14.6l-2.2-2.2 1.1-1.1 1.1 1.1 3.9-3.9 1.1 1.1z"
      fill="var(--tt-on-accent)"
    />
  </svg>
);

const MealDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { mealId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openChat, openDrawer } = useChatDrawer();
  const { getMealTypeText } = useMealTranslations();
  const { joinOptimistic, leaveOptimistic, isPending } = useOptimisticMealActions();
  const coverImageInputRef = useRef(null);

  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [notified, setNotified] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [toastState, setToastState] = useState({ message: '', tone: 'success', visible: false });

  const showToast = useCallback((message, tone = 'success') => {
    setToastState({ message, tone, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToastState((prev) => ({ ...prev, visible: false }));
  }, []);

  const fetchMeal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mealService.getMealById(mealId);
      setMeal(data?.data || data);
    } catch (err) {
      console.error('Errore caricamento t2t:', err);
      setError(t('meals.detail.loadError', 'Impossibile caricare il t2t.'));
    } finally {
      setLoading(false);
    }
  }, [mealId, t]);

  useEffect(() => {
    fetchMeal();
    setConfirmingLeave(false);
    setNotified(false);
  }, [fetchMeal]);

  const handleCoverImageChange = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Seleziona solo file immagine.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Il file è troppo grande. Massimo 10MB.', 'error');
      return;
    }

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('title', meal.title);
      formData.append('description', meal.description || '');
      formData.append('mealType', meal.mealType);
      formData.append('type', meal.type);
      formData.append('date', new Date(meal.date).toISOString());
      formData.append('duration', meal.duration);
      formData.append('maxParticipants', meal.maxParticipants);
      formData.append('language', meal.language || 'Italiano');
      if (Array.isArray(meal.topics) && meal.topics.length > 0) {
        meal.topics.forEach((topic) => formData.append('topics', topic));
      }
      if (meal.location) {
        formData.append('location', JSON.stringify(meal.location));
      }
      if (meal.isPublic !== undefined) {
        formData.append('isPublic', meal.isPublic);
      }

      await mealService.updateMeal(meal._id, formData);
      showToast('Immagine di copertina aggiornata!', 'success');
      await fetchMeal();
    } catch (err) {
      console.error('Errore aggiornamento immagine:', err);
      showToast(
        err.response?.data?.message || "Errore durante l'aggiornamento dell'immagine.",
        'error'
      );
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleCoverFileInput = async (e) => {
    const file = e.target.files?.[0];
    if (file) await handleCoverImageChange(file);
    e.target.value = '';
  };

  const handleCoverClick = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          width: 1600,
          height: 1600,
        });
        if (!image || !image.dataUrl) return;
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `cover_${Date.now()}.jpg`, { type: 'image/jpeg' });
        await handleCoverImageChange(file);
      } catch (err) {
        console.error('Errore selezione foto:', err);
        showToast('Errore durante la selezione della foto.', 'error');
      }
    } else {
      coverImageInputRef.current?.click();
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonHero} aria-busy="true" />
        <div className={styles.skeletonCard} aria-hidden="true" />
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className={styles.page}>
        <div className={styles.topRow}>
          <BackButton />
        </div>
        <EmptyState
          icon="🍽️"
          title={error || t('detail.notFound', 't2t non trovato')}
          description={t(
            'detail.notFoundDesc',
            'Potrebbe essere stato rimosso o il link non è più valido.'
          )}
          actionLabel={t('detail.backToExplore', 'Torna a Esplora')}
          actionTo="/meals"
        />
      </div>
    );
  }

  const roleState = getMealRoleState(meal, user);
  const isHost = roleState === 'organizer';
  const isParticipant = roleState === 'joined';
  const isVirtual = meal.mealType === 'virtual';
  const currentUserId = getUserId(user);
  const hostId = getMealHostId(meal);
  const pending = isPending(meal._id);

  const mealDate = new Date(meal.date);
  const now = new Date();
  const durationMs = (meal.duration || 60) * 60 * 1000;
  const mealEndTime = new Date(mealDate.getTime() + durationMs);
  const tenMinutesBeforeStart = new Date(mealDate.getTime() - 10 * 60 * 1000);
  const isPast = now > mealEndTime || meal.status === 'completed' || meal.status === 'cancelled';

  const isVideoAccessible =
    isVirtual &&
    (isParticipant || isHost) &&
    now >= tenMinutesBeforeStart &&
    now <= mealEndTime;

  const isTooEarly =
    isVirtual &&
    (isParticipant || isHost) &&
    now < tenMinutesBeforeStart &&
    now > new Date(mealDate.getTime() - 24 * 60 * 60 * 1000);

  const city = extractCity(meal.location);
  const whereText = isVirtual
    ? t('detail.onlineWhere', 'Online · Video')
    : city
    ? t('detail.inPersonWithCity', { city, defaultValue: `${city} · Dal vivo` })
    : t('detail.inPersonWhere', 'Dal vivo');

  const hostName = meal.host?.nickname || meal.host?.name || 'Host';
  const hostVerified = Boolean(meal.host?.isVerified || meal.host?.isEmailVerified);
  const coverSrc = meal.imageUrl ? getMealCoverImageUrl(meal.imageUrl) : '';
  const hostAvatarSrc = meal.host?.profileImage
    ? getHostAvatarUrl(meal.host.profileImage)
    : '';
  const seatsFilled = Array.isArray(meal.participants) ? meal.participants.length : 0;
  const seatsTotal = Number(meal.maxParticipants) || 0;
  const tags = Array.isArray(meal.topics) ? meal.topics.filter(Boolean) : [];

  const handleJoin = async () => {
    await joinOptimistic(meal, {
      onUpdate: setMeal,
      onToast: showToast,
    });
  };

  const handleConfirmLeave = async () => {
    setConfirmingLeave(false);
    await leaveOptimistic(meal, {
      onUpdate: setMeal,
      onToast: showToast,
    });
  };

  const handleChatClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const targetChatId =
      typeof meal.chatId === 'object' ? meal.chatId?._id : meal.chatId;
    if (targetChatId) {
      openChat(targetChatId);
    } else if (isParticipant || isHost) {
      openDrawer();
    } else if (hostId) {
      navigate(`/public-profile/${hostId}`);
    } else {
      showToast(
        t('detail.chatUnavailable', 'La chat sarà disponibile appena entri al tavolo.'),
        'info'
      );
    }
  };

  const handleNotify = () => {
    setNotified(true);
    showToast(t('detail.toasts.notify', '🔔 Ti avviseremo se si libera un posto.'), 'success');
  };

  const handleDeleteMeal = async () => {
    if (!meal || !isHost) return;
    setIsDeleting(true);
    try {
      await mealService.deleteMeal(meal._id);
      toast.success(t('meals.detail.deleteSuccess', 't2t eliminato con successo!'));
      navigate('/meals', { replace: true });
    } catch (err) {
      console.error('Errore eliminazione t2t:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        t('meals.detail.deleteError', "Errore durante l'eliminazione.");
      showToast(errorMsg, 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleOpenMaps = () => {
    if (!meal.location?.coordinates) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${meal.location.coordinates[1]},${meal.location.coordinates[0]}`;
    openExternalShareUrl(url);
  };

  const goToUserProfile = (targetId) => {
    if (!targetId) return;
    if (currentUserId && String(targetId) === String(currentUserId)) {
      navigate('/impostazioni/profilo');
    } else {
      navigate(`/public-profile/${targetId}`);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <BackButton />
      </div>

      <article className={styles.sheet}>
        <div className={styles.coverBox}>
          <Cover
            src={coverSrc}
            alt={meal.title}
            category={meal.type || 'dinner'}
            categoryLabel={getMealTypeText(meal.type || 'dinner')}
            format={meal.mealType || 'virtual'}
            height={260}
          />

          {isHost && !isPast && (
            <>
              <input
                ref={coverImageInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={handleCoverFileInput}
              />
              <button
                type="button"
                className={styles.coverEditBtn}
                onClick={handleCoverClick}
                disabled={isUploadingCover}
              >
                <CameraIcon size={15} strokeWidth={2} aria-hidden="true" />
                <span>
                  {isUploadingCover
                    ? t('common.loading', 'Caricamento...')
                    : t('detail.changeCover', 'Cambia foto')}
                </span>
              </button>
            </>
          )}
        </div>

        <div className={styles.contentGrid}>
          {/* Colonna principale */}
          <div className={styles.mainCol}>
            <h1 className={styles.title}>{meal.title}</h1>

            <button
              type="button"
              className={styles.hostBtn}
              onClick={() => goToUserProfile(hostId)}
            >
              <Avatar src={hostAvatarSrc} name={hostName} size="md" tone="primary" />
              <div className={styles.hostText}>
                <span className={styles.hostRole}>{t('meals.detail.hostedBy', 'Organizzato da')}</span>
                <span className={styles.hostNameRow}>
                  <strong>{hostName}</strong>
                  {hostVerified && (
                    <VerifiedIcon label={t('ui.card.verifiedHost', 'Host verificato')} />
                  )}
                </span>
              </div>
            </button>

            {meal.description && <p className={styles.desc}>{meal.description}</p>}

            <div className={styles.metaBox}>
              <div>
                <b>{t('detail.when', 'Quando')}</b>
                <span>{formatMealWhen(meal.date, i18n.language)}</span>
              </div>
              <div>
                <b>{t('detail.where', 'Dove')}</b>
                <span>{whereText}</span>
              </div>
              <div>
                <b>{t('detail.language', 'Lingua')}</b>
                <span>{meal.language || 'Italiano'}</span>
              </div>
              <div>
                <b>{t('detail.duration', 'Durata')}</b>
                <span>
                  {meal.duration || 60} {t('ui.card.minutes', 'min')}
                </span>
              </div>
            </div>

            {tags.length > 0 && (
              <div className={styles.tags}>
                {tags.map((tag, idx) => (
                  <span key={`${tag}-${idx}`} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {!isVirtual && meal.location?.coordinates && (
              <section className={styles.mapSection}>
                <h2 className={styles.sectionTitle}>
                  <MapPin size={18} strokeWidth={2} aria-hidden="true" />
                  <span>{t('meals.detail.location', 'Posizione')}</span>
                </h2>
                {meal.location.address && (
                  <p className={styles.address}>{meal.location.address}</p>
                )}
                <div className={styles.mapFrame}>
                  <OpenStreetMapComponent
                    readOnly={true}
                    center={[meal.location.coordinates[1], meal.location.coordinates[0]]}
                    zoom={15}
                    markers={[
                      {
                        lat: meal.location.coordinates[1],
                        lng: meal.location.coordinates[0],
                        title: meal.title,
                      },
                    ]}
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={handleOpenMaps} className={styles.mapsBtn}>
                  {t('detail.openGoogleMaps', 'Apri in Google Maps')}
                </Button>
              </section>
            )}
          </div>

          {/* Colonna azioni & partecipanti */}
          <aside className={styles.sideCol}>
            <div className={styles.sideCard}>
              <div className={styles.seatsHeader}>
                <Seats filled={seatsFilled} total={seatsTotal} />
              </div>

              {confirmingLeave ? (
                <div className={styles.confirmBox} role="region" aria-live="polite">
                  <p className={styles.confirmText}>
                    {t('detail.leaveConfirmQuestion', 'Vuoi davvero abbandonare questo t2t?')}
                  </p>
                  <div className={styles.confirmActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingLeave(false)}
                      disabled={pending}
                    >
                      {t('detail.leaveConfirmCancel', 'Annulla')}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleConfirmLeave}
                      disabled={pending}
                      data-testid="detail-confirm-leave-btn"
                    >
                      {pending
                        ? t('detail.leaving', 'Uscita…')
                        : t('detail.leaveConfirmYes', 'Sì, abbandona')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.actionStack}>
                  {roleState === 'organizer' && (
                    <>
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={() => setShowShareModal(true)}
                        data-testid="detail-invite-btn"
                      >
                        <Share2 size={16} strokeWidth={2} aria-hidden="true" />
                        <span>{t('detail.inviteGuests', 'Invita commensali')}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        fullWidth
                        onClick={() => navigate(`/meals/edit/${meal._id}`)}
                      >
                        {t('detail.edit', 'Modifica')}
                      </Button>
                      {meal.chatId && (
                        <Button variant="green" fullWidth onClick={handleChatClick}>
                          {t('detail.openChat', 'Apri chat')}
                        </Button>
                      )}
                    </>
                  )}

                  {roleState === 'joined' && (
                    <>
                      <Button variant="green" fullWidth onClick={handleChatClick}>
                        {t('detail.openChat', 'Apri chat')}
                      </Button>
                      {!isPast && (
                        <Button
                          variant="danger"
                          fullWidth
                          onClick={() => setConfirmingLeave(true)}
                          disabled={pending}
                          data-testid="detail-leave-btn"
                        >
                          {t('detail.leave', 'Abbandona')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        fullWidth
                        onClick={() => setShowShareModal(true)}
                      >
                        <Share2 size={16} strokeWidth={2} aria-hidden="true" />
                        <span>{t('detail.inviteGuests', 'Invita commensali')}</span>
                      </Button>
                    </>
                  )}

                  {roleState === 'full' && (
                    <>
                      <Button variant="primary" fullWidth disabled>
                        {t('detail.full', 'Completo')}
                      </Button>
                      <Button
                        variant="ghost"
                        fullWidth
                        onClick={handleNotify}
                        disabled={notified}
                      >
                        {notified
                          ? t('detail.notified', 'Avviso attivo ✓')
                          : t('detail.notifyMe', 'Avvisami')}
                      </Button>
                    </>
                  )}

                  {roleState === 'available' && !isPast && (
                    <>
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={handleJoin}
                        disabled={pending}
                        data-testid="detail-join-btn"
                      >
                        {pending
                          ? t('detail.joining', 'Iscrizione…')
                          : t('detail.join', 'Partecipa')}
                      </Button>
                      <Button variant="ghost" fullWidth onClick={handleChatClick}>
                        {t('detail.message', 'Messaggia')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth
                        onClick={() => setShowShareModal(true)}
                      >
                        <Share2 size={15} strokeWidth={2} aria-hidden="true" />
                        <span>{t('detail.inviteGuests', 'Invita commensali')}</span>
                      </Button>
                    </>
                  )}

                  {isVideoAccessible && (
                    <Button
                      variant="green"
                      fullWidth
                      onClick={() =>
                        navigate(`/meals/${meal._id}/video`, {
                          state: { fromMealDetail: true },
                        })
                      }
                    >
                      <Video size={16} strokeWidth={2} aria-hidden="true" />
                      <span>{t('detail.joinVideo', 'Entra in videochiamata')}</span>
                    </Button>
                  )}

                  {!isVideoAccessible && isTooEarly && (
                    <div className={styles.videoNotice}>
                      <Video size={15} strokeWidth={2} aria-hidden="true" />
                      <span>
                        {t('detail.videoAvailableFrom', {
                          time: tenMinutesBeforeStart.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          }),
                          defaultValue: `Video disponibile dalle ${tenMinutesBeforeStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                        })}
                      </span>
                    </div>
                  )}

                  {isHost && !isPast && (
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      onClick={() => setShowDeleteModal(true)}
                    >
                      <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                      <span>{t('detail.deleteMeal', 'Elimina t2t')}</span>
                    </Button>
                  )}
                </div>
              )}

              {/* Lista partecipanti */}
              <div className={styles.participantsBlock}>
                <h2 className={styles.participantsTitle}>
                  {t('detail.participantsTitle', 'Partecipanti')} ({seatsFilled})
                </h2>
                <div className={styles.avatarList}>
                  <button
                    type="button"
                    className={styles.participantBtn}
                    title={`Host: ${hostName}`}
                    onClick={() => goToUserProfile(hostId)}
                  >
                    <Avatar src={hostAvatarSrc} name={hostName} size="md" tone="primary" />
                  </button>

                  {Array.isArray(meal.participants) &&
                    meal.participants.map((p) => {
                      const pid = typeof p === 'object' ? p?._id || p?.id : p;
                      if (!pid || String(pid) === String(hostId)) return null;
                      const pName =
                        (typeof p === 'object' && (p.nickname || p.name)) || 'Ospite';
                      const pImg =
                        typeof p === 'object' && p.profileImage
                          ? getHostAvatarUrl(p.profileImage)
                          : '';
                      return (
                        <button
                          type="button"
                          key={pid}
                          className={styles.participantBtn}
                          title={pName}
                          onClick={() => goToUserProfile(pid)}
                        >
                          <Avatar src={pImg} name={pName} size="md" tone="accent" />
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </article>

      <ShareMealModal
        meal={meal}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onToast={showToast}
      />

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title={t('detail.deleteConfirmTitle', 'Elimina questo t2t?')}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              {t('common.cancel', 'Annulla')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteMeal}
              disabled={isDeleting}
            >
              {isDeleting
                ? t('meals.detail.deleting', 'Eliminazione…')
                : t('detail.deleteMeal', 'Elimina t2t')}
            </Button>
          </>
        }
      >
        <p className={styles.deleteText}>
          {t(
            'detail.deleteConfirmText',
            'Questa azione è definitiva e rimuove il tavolo per tutti i partecipanti.'
          )}
        </p>
      </Modal>

      <Toast
        message={toastState.message}
        tone={toastState.tone}
        visible={toastState.visible}
        onClose={hideToast}
      />
    </div>
  );
};

export default MealDetailPage;
