'use client';

import React from 'react';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  return (
    <aside className={styles.sidebar}>
      <nav>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/menu">Menu</a></li>
          <li><a href="/prenotazioni">Prenotazioni</a></li>
          <li><a href="/contatti">Contatti</a></li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar; 