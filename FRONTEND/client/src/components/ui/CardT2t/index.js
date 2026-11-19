import React from 'react';
import { useTranslation } from 'react-i18next';
import Avatar from '../Avatar';
import Button from '../Button';
import Cover from '../Cover';
import Seats from '../Seats';
import styles from './CardT2t.module.css';

const VerifiedIcon = ({ title }) => (
  <svg
    className={styles.verified}
    viewBox="0 0 24 24"
    fill="var(--tt-accent)"
    role="img"
    aria-label={title}
  >
    <path d="M12 2l2.4 2.1 3.1-.4 1.1 3 2.9 1.3-.7 3.1 1.9 2.5-1.9 2.5.7 3.1-2.9 1.3-1.1 3-3.1-.4L12 22l-2.4-2.1-3.1.4-1.1-3-2.9-1.3.7-3.1L1.3 12l1.9-2.5-.7-3.1 2.9-1.3 1.1-3 3.1.4z" />
    <path
      d="M10.6 14.6l-2.2-2.2 1.1-1.1 1.1 1.1 3.9-3.9 1.1 1.1z"
      fill="var(--tt-on-accent)"
    />
  </svg>
);

const isPhysicalFormat = (format = '') => {
  const key = String(format || '').trim().toLowerCase();
  return key === 'physical' || key === 'fisico' || key === 'presenza';
};

const CardT2t = ({
  title,
  coverSrc = '',
  category = '',
  categoryLabel = '',
  format = 'virtual',
  formatLabel = '',
  hostName = '',
  hostAvatarSrc = '',
  hostVerified = false,
  when = '',
  duration = null,
  language = '',
  city = '',
  tags = [],
  seatsFilled = 0,
  seatsTotal = 0,
  ctaState = 'available', // 'available' | 'full' | 'joined' | 'organizer'
  onCardClick,
  onActionClick,
  className = '',
}) => {
  const { t } = useTranslation();

  const resolvedState =
    ctaState === 'organizer' || ctaState === 'manage'
      ? 'organizer'
      : ctaState === 'joined' || ctaState === 'participant'
      ? 'joined'
      : ctaState === 'full' || (seatsTotal > 0 && seatsFilled >= seatsTotal)
      ? 'full'
      : 'available';

  const visibleTags = Array.isArray(tags) ? tags.filter(Boolean).slice(0, 3) : [];
  const overflowTags = Array.isArray(tags)
    ? Math.max(0, tags.filter(Boolean).length - 3)
    : 0;

  const handleCardKeyDown = (e) => {
    if (onCardClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onCardClick(e);
    }
  };

  const handleAction = (e) => {
    e.stopPropagation();
    if (onActionClick) {
      onActionClick(resolvedState, e);
    } else if (onCardClick) {
      onCardClick(e);
    }
  };

  const renderCta = () => {
    if (resolvedState === 'organizer') {
      return (
        <Button variant="ghost" size="sm" onClick={handleAction}>
          {t('ui.card.manage', 'Gestisci')}
        </Button>
      );
    }
    if (resolvedState === 'joined') {
      return (
        <Button variant="green" size="sm" onClick={handleAction}>
          {t('ui.card.joined', 'Partecipi ✓')}
        </Button>
      );
    }
    if (resolvedState === 'full') {
      return (
        <Button variant="primary" size="sm" disabled>
          {t('ui.card.full', 'Completo')}
        </Button>
      );
    }
    return (
      <Button variant="primary" size="sm" onClick={handleAction}>
        {t('ui.card.join', 'Partecipa')}
      </Button>
    );
  };

  return (
    <article
      className={`${styles.card} ${onCardClick ? styles.clickable : ''} ${className}`.trim()}
      onClick={onCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={onCardClick ? 0 : undefined}
      role={onCardClick ? 'button' : undefined}
    >
      <Cover
        src={coverSrc}
        alt={title || ''}
        category={category}
        categoryLabel={categoryLabel}
        format={format}
        formatLabel={formatLabel}
      />

      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>

        {hostName && (
          <div className={styles.host}>
            <Avatar src={hostAvatarSrc} name={hostName} size="sm" tone="primary" />
            <span className={styles.hostName}>{hostName}</span>
            {hostVerified && (
              <VerifiedIcon title={t('ui.card.verifiedHost', 'Host verificato')} />
            )}
          </div>
        )}

        <div className={styles.meta}>
          {when && <span>🕒 {when}</span>}
          {duration != null && (
            <span>
              ⏱ {duration} {t('ui.card.minutes', 'min')}
            </span>
          )}
          {language && <span>🌍 {language}</span>}
          {isPhysicalFormat(format) && city && <span>📍 {city}</span>}
        </div>

        {visibleTags.length > 0 && (
          <div className={styles.tags}>
            {visibleTags.map((tag, i) => (
              <span key={`${tag}-${i}`} className={styles.tag}>
                {tag}
              </span>
            ))}
            {overflowTags > 0 && <span className={styles.tag}>+{overflowTags}</span>}
          </div>
        )}

        <div className={styles.footer}>
          <Seats filled={seatsFilled} total={seatsTotal} />
          {renderCta()}
        </div>
      </div>
    </article>
  );
};

export default CardT2t;
