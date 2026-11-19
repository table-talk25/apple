import React, { useState, useEffect } from 'react';
import styles from './Avatar.module.css';

const SIZE_CLASSES = {
  xs: styles.xs,
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

const getInitials = (name = '') => {
  const cleaned = String(name || '').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const isUsableSrc = (src) => {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  if (trimmed.includes('default-avatar.jpg')) return false;
  return true;
};

const Avatar = ({
  src = '',
  name = '',
  alt = '',
  size = 'md',
  tone = 'accent',
  className = '',
  style = {},
  onClick,
  ...rest
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const showImage = isUsableSrc(src) && !imgFailed;
  const isNumericSize = typeof size === 'number';
  const inlineStyle = isNumericSize
    ? { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)), ...style }
    : style;

  const classes = [
    styles.avatar,
    !isNumericSize ? SIZE_CLASSES[size] || styles.md : '',
    tone === 'primary' ? styles.primary : styles.accent,
    onClick ? styles.clickable : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      style={inlineStyle}
      onClick={onClick}
      aria-label={alt || name || 'Avatar'}
      {...rest}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={styles.image}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className={styles.initials} aria-hidden="true">
          {getInitials(name || alt)}
        </span>
      )}
    </span>
  );
};

export default Avatar;
