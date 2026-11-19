import React from 'react';
import styles from './Badge.module.css';

const VARIANT_CLASSES = {
  category: styles.category,
  video: styles.video,
  inPerson: styles.inPerson,
  fisico: styles.inPerson,
  virtual: styles.video,
  physical: styles.inPerson,
};

const Badge = ({
  variant = 'category',
  onImage = false,
  position = null,
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    styles.badge,
    VARIANT_CLASSES[variant] || styles.category,
    onImage ? styles.onImage : '',
    position === 'left' ? styles.left : '',
    position === 'right' ? styles.right : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
};

export default Badge;
