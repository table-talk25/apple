import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Logo.module.css'

function Logo() {
  return (
    <Link to="/" className={styles.logo}>
      <img 
        src="/images/logo.webp" 
        alt="TableTalk Logo" 
        className={styles.logoFullImage}
      />
    </Link>
  );
}

export default Logo; 