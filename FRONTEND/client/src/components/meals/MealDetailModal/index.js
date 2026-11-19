import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
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
} from '../../../utils/mealFormat';
import { Avatar, Badge, Button, Cover, Modal, Seats } from '../../ui';
import styles from './MealDetailModal.module.css';

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

const MealDetailModal = ({
  meal,
  isOpen,
  onClose,
  onMealChange,
  onOpenShare,
  onToast,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openChat, openDrawer } = useChatDrawer();
  const { getMealTypeText } = useMealTranslations();
  const { joinOptimistic, leaveOptimistic, isPending } = useOptimisticMealActions();

  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    setConfirmingLeave(false);
    setNotified(false);
  }, [meal?._id, isOpen]);

  if (!meal) return null;

  const roleState = getMealRoleState(meal, user);
  const pending = isPending(meal._id);
  const isPhysical = meal.mealType === 'physical';
  const city = extractCity(meal.location);
  const whereText = isPhysical
    ? city
      ? t('detail.inPersonWithCity', { city, defaultValue: `${city} · Dal vivo` })
      : t('detail.inPersonWhere', 'Dal vivo')
    : t('detail.onlineWhere', 'Online · Video');

  const hostName = meal.host?.nickname || meal.host?.name || 'Host';
  const hostId = getMealHostId(meal);
  const hostVerified = Boolean(meal.host?.isVerified || meal.host?.isEmailVerified);
  const coverSrc = meal.imageUrl ? getMealCoverImageUrl(meal.imageUrl) : '';
  const hostAvatarSrc = meal.host?.profileImage
    ? getHostAvatarUrl(meal.host.profileImage)
    : '';
  const seatsFilled = Array.isArray(meal.participants) ? meal.participants.length : 0;
  const seatsTotal = Number(meal.maxParticipants) || 0;
  const tags = Array.isArray(meal.topics) ? meal.topics.filter(Boolean) : [];

  const fireToast = (msg, tone = 'success') => {
    if (onToast) onToast(msg, tone);
    else if (tone === 'error') toast.error(msg);
    else toast.success(msg);
  };

  const handleJoin = async () => {
    await joinOptimistic(meal, {
      onUpdate: onMealChange,
      onToast: fireToast,
    });
  };

  const handleConfirmLeave = async () => {
    setConfirmingLeave(false);
    await leaveOptimistic(meal, {
      onUpdate: onMealChange,
      onToast: fireToast,
    });
  };

  const handleChat = () => {
    if (!isAuthenticated) {
      navigate('/login');
      onClose();
      return;
    }
    const chatId =
      typeof meal.chatId === 'object' ? meal.chatId?._id : meal.chatId;
    if (chatId) {
      onClose();
      openChat(chatId);
    } else if (roleState === 'joined' || roleState === 'organizer') {
      onClose();
      openDrawer();
    } else if (hostId) {
      onClose();
      navigate(`/public-profile/${hostId}`);
    } else {
      fireToast(
        t('detail.chatUnavailable', 'La chat sarà disponibile appena entri al tavolo.'),
        'info'
      );
    }
  };

  const handleNotify = () => {
    setNotified(true);
    fireToast(t('detail.toasts.notify', '🔔 Ti avviseremo se si libera un posto.'), 'success');
  };

  const handleEdit = () => {
    onClose();
    navigate(`/meals/edit/${meal._id}`);
  };

  const handleInvite = () => {
    if (onOpenShare) onOpenShare(meal);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={meal.title}
      size="md"
      className={styles.modalShell}
    >
      <div className={styles.coverWrap}>
        <Cover
          src={coverSrc}
          alt={meal.title}
          category={meal.type || 'dinner'}
          categoryLabel={getMealTypeText(meal.type || 'dinner')}
          format={meal.mealType || 'virtual'}
          showBadges={false}
          height={210}
        />
        <div className={styles.coverBadges}>
          <Badge variant="category" className={styles.coverBadge}>
            {getMealTypeText(meal.type || 'dinner')}
          </Badge>
          <Badge variant={isPhysical ? 'inPerson' : 'video'} className={styles.coverBadge}>
            {isPhysical
              ? `📍 ${t('ui.card.inPerson', 'Dal vivo')}`
              : `💻 ${t('ui.card.video', 'Video')}`}
          </Badge>
        </div>
      </div>

      <div className={styles.body}>
        <h2 className={styles.title}>{meal.title}</h2>

        <div className={styles.host}>
          <Avatar src={hostAvatarSrc} name={hostName} size="sm" tone="primary" />
          <span className={styles.hostName}>{hostName}</span>
          {hostVerified && (
            <VerifiedIcon label={t('ui.card.verifiedHost', 'Host verificato')} />
          )}
        </div>

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

        <div className={styles.seatsRow}>
          <Seats filled={seatsFilled} total={seatsTotal} />
          <Link
            to={`/meals/${meal._id}`}
            className={styles.fullLink}
            onClick={onClose}
          >
            {t('detail.openFullPage', 'Apri pagina completa →')}
          </Link>
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
                data-testid="confirm-leave-btn"
              >
                {pending
                  ? t('detail.leaving', 'Uscita…')
                  : t('detail.leaveConfirmYes', 'Sì, abbandona')}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.actions}>
            {roleState === 'organizer' && (
              <>
                <Button variant="primary" onClick={handleInvite} data-testid="modal-invite-btn">
                  {t('detail.inviteGuests', 'Invita commensali')}
                </Button>
                <Button variant="ghost" onClick={handleEdit}>
                  {t('detail.edit', 'Modifica')}
                </Button>
              </>
            )}

            {roleState === 'joined' && (
              <>
                <Button variant="green" onClick={handleChat}>
                  {t('detail.openChat', 'Apri chat')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setConfirmingLeave(true)}
                  disabled={pending}
                  data-testid="modal-leave-btn"
                >
                  {t('detail.leave', 'Abbandona')}
                </Button>
              </>
            )}

            {roleState === 'full' && (
              <>
                <Button variant="primary" disabled>
                  {t('detail.full', 'Completo')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleNotify}
                  disabled={notified}
                  data-testid="modal-notify-btn"
                >
                  {notified
                    ? t('detail.notified', 'Avviso attivo ✓')
                    : t('detail.notifyMe', 'Avvisami')}
                </Button>
              </>
            )}

            {roleState === 'available' && (
              <>
                <Button
                  variant="primary"
                  onClick={handleJoin}
                  disabled={pending}
                  data-testid="modal-join-btn"
                >
                  {pending
                    ? t('detail.joining', 'Iscrizione…')
                    : t('detail.join', 'Partecipa')}
                </Button>
                <Button variant="ghost" onClick={handleChat}>
                  {t('detail.message', 'Messaggia')}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MealDetailModal;
