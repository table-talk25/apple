import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Badge from '../Badge';
import styles from './Cover.module.css';

const CATEGORY_EMOJI = {
  pranzo: '🍝',
  lunch: '🍝',
  cena: '🍽️',
  dinner: '🍽️',
  aperitivo: '🍷',
  aperitif: '🍷',
  colazione: '☕',
  breakfast: '☕',
  brunch: '🥐',
};

const CATEGORY_DEFAULT_LABELS = {
  lunch: 'Pranzo',
  dinner: 'Cena',
  aperitif: 'Aperitivo',
  breakfast: 'Colazione',
  brunch: 'Brunch',
};

const getCategoryEmoji = (category = '') => {
  const key = String(category || '').trim().toLowerCase();
  return CATEGORY_EMOJI[key] || '🍽️';
};

const isVirtualFormat = (format = '') => {
  const key = String(format || '').trim().toLowerCase();
  return key === 'virtual' || key === 'virtuale' || key === 'online' || key === 'video';
};

const isUsableImage = (src) => {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  if (trimmed.includes('default-meal-placeholder')) return false;
  return true;
};

const Cover = ({
  src = '',
  alt = '',
  category = '',
  categoryLabel = '',
  format = 'virtual',
  formatLabel = '',
  showBadges = true,
  mini = false,
  height = null,
  className = '',
}) => {
  const { t } = useTranslation();
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const showImg = isUsableImage(src) && !imgFailed;
  const virtual = isVirtualFormat(format);
  const emoji = getCategoryEmoji(category);
  const resolvedCategoryLabel =
    categoryLabel ||
    CATEGORY_DEFAULT_LABELS[String(category || '').toLowerCase()] ||
    category;
  const resolvedFormatLabel =
    formatLabel ||
    (virtual
      ? `💻 ${t('ui.card.video', 'Video')}`
      : `📍 ${t('ui.card.inPerson', 'Dal vivo')}`);

  return (
    <div
      className={`${styles.cover} ${mini ? styles.mini : ''} ${showImg ? styles.hasImage : ''} ${className}`.trim()}
      style={height ? { height } : undefined}
    >
      {!showImg && (
        <span className={styles.emoji} aria-hidden="true">
          {emoji}
        </span>
      )}

      {showImg && (
        <img
          src={src}
          alt={alt}
          className={styles.img}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      )}

      {showBadges && !mini && (
        <>
          {resolvedCategoryLabel && (
            <Badge variant="category" onImage position="left">
              {resolvedCategoryLabel}
            </Badge>
          )}
          <Badge variant={virtual ? 'video' : 'inPerson'} onImage position="right">
            {resolvedFormatLabel}
          </Badge>
        </>
      )}
    </div>
  );
};

export default Cover;
