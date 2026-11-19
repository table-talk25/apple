import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Logo.module.css';

function Logo({ to = null, className = '', onClick }) {
  const content = (
    <>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.wordmark}>
        table<span className={styles.two}>2</span>Talk
      </span>
    </>
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
