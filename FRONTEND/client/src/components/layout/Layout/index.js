// File: src/components/layout/Layout/index.js (Versione Finale con Contenitore)

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import EmailVerificationBanner from '../EmailVerificationBanner';
import styles from './Layout.module.css';

const Layout = () => {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.mainContent}>
        {/* Banner email DENTRO mainContent: il padding-top della navbar lo protegge
            e così non finisce mai coperto dalla Navbar position:fixed (z-index: 1000). */}
        <EmailVerificationBanner />
        {/* Questo contenitore interno standardizza larghezza e padding per TUTTE le pagine */}
        <div className={styles.pageContainer}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;