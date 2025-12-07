// File: src/components/layout/Layout/index.js (Versione Finale con Contenitore)

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import styles from './Layout.module.css';

const Layout = () => {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.mainContent}>
        {/* Questo contenitore interno standardizza larghezza e padding per TUTTE le pagine */}
        <div className={styles.pageContainer}>
          <Outlet /> 
        </div>
      </main>
    </div>
  );
};

export default Layout;