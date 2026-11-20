import React from 'react';
import { Link } from 'react-router-dom';
import lockupLight from '../../../assets/brand/t2t-lockup-light.svg';
import lockupDark from '../../../assets/brand/t2t-lockup-dark.svg';
import styles from './Logo.module.css';

function Logo({ to = null, variant = 'light', className = '', onClick }) {
  const src = variant === 'dark' ? lockupDark : lockupLight;
  const content = (
    <img
      src={src}
      alt="table2Talk"
      className={styles.lockup}
      decoding="async"
    />
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`${styles.logo} ${className}`.trim()}
        onClick={onClick}
        aria-label="table2Talk"
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      className={`${styles.logo} ${className}`.trim()}
      onClick={onClick}
      aria-label="table2Talk"
    >
      {content}
    </span>
  );
}

export default Logo;
