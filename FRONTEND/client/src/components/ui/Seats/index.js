import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Seats.module.css';

const Seats = ({ filled = 0, total = 0, maxDots = 8, className = '' }) => {
  const { t } = useTranslation();
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeFilled = Math.min(safeTotal, Math.max(0, Number(filled) || 0));
  const dotCount = Math.min(safeTotal, maxDots);

  return (
    <div
      className={`${styles.seats} ${className}`.trim()}
      aria-label={t('ui.card.seatsLabel', {
        filled: safeFilled,
        total: safeTotal,
        defaultValue: `${safeFilled} di ${safeTotal} posti occupati`,
      })}
    >
      {Array.from({ length: dotCount }).map((_, idx) => (
        <span
          key={idx}
          className={`${styles.dot} ${idx < safeFilled ? styles.full : ''}`}
          aria-hidden="true"
        />
      ))}
      <small className={styles.count}>
        {safeFilled}/{safeTotal}
      </small>
    </div>
  );
};

export default Seats;
