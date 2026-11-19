import React from 'react';
import Button from '../Button';
import styles from './EmptyState.module.css';

const EmptyState = ({
  icon = null,
  title = '',
  description = '',
  actionLabel = '',
  onAction = null,
  actionTo = null,
  actionVariant = 'primary',
  className = '',
}) => {
  return (
    <div className={`${styles.empty} ${className}`.trim()}>
      {icon && (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      )}
      {title && <h3 className={styles.title}>{title}</h3>}
      {description && <p className={styles.description}>{description}</p>}
      {actionLabel && (onAction || actionTo) && (
        <div className={styles.action}>
          <Button variant={actionVariant} to={actionTo} onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
