import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import BottomNav from '../BottomNav';
import EmailVerificationBanner from '../EmailVerificationBanner';
import styles from './Layout.module.css';

const Layout = () => {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.mainContent}>
        <EmailVerificationBanner />
        <div className={styles.pageContainer}>
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
