// File: src/pages/Home/index.js (Versione con testi scelti dall'utente)

import React from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaTicketAlt, FaVideo, FaUsers, FaLanguage, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext'; 
import Navbar from '../../components/layout/Navbar';
import styles from './HomePage.module.css';
import { useTranslation } from 'react-i18next'

function HomePage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  return (
    <div className={styles.homeContainer}>
      <Navbar />
      {/* --- SEZIONE HERO --- */}
      <section className={styles.heroSection}>
        <h1 dangerouslySetInnerHTML={{ __html: t('home.heroTitle') }} />
        <p>{t('home.heroSubtitle')}</p>
        <div className={styles.heroButtons}>
          {isAuthenticated ? (
            <>
              <Link to="/meals/create" className={styles.btn}>{t('home.createTableTalk')}</Link>
              <Link to="/meals" className={styles.btn}>{t('home.exploreTableTalk')}</Link>
            </>
          ) : (
            <>
              <Link to="/register" className={styles.btn}>{t('home.registerNow')}</Link>
              <Link to="/login" className={styles.btn}>{t('home.login')}</Link>
            </>
          )}
        </div>
      </section>

      {/* --- SEZIONE "COME FUNZIONA" --- */}
      <section className={styles.featuresSection}>
        <h2>{t('home.howItWorks.title')}</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <FaSearch className={styles.featureIcon} />
            <h3>{t('home.howItWorks.step1.title')}</h3>
            <p>{t('home.howItWorks.step1.description')}</p>
          </div>
          <div className={styles.featureCard}>
            <FaTicketAlt className={styles.featureIcon} />
            <h3>{t('home.howItWorks.step2.title')}</h3>
            <p>{t('home.howItWorks.step2.description')}</p>
          </div>
          <div className={styles.featureCard}>
            <FaVideo className={styles.featureIcon} />
            <h3>{t('home.howItWorks.step3.title')}</h3>
            <p>{t('home.howItWorks.step3.description')}</p>
          </div>
        </div>
      </section>
      
      {/* --- SEZIONE "PERCHÉ TABLETALK?" --- */}
      <section className={`${styles.featuresSection} ${styles.secondarySection}`}>
        <h2>{t('home.whyTableTalk.title')}</h2>
        <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
                <FaUsers className={styles.featureIcon} />
                <h3>{t('home.whyTableTalk.feature1.title')}</h3>
                <p>{t('home.whyTableTalk.feature1.description')}</p>
            </div>
            <div className={styles.featureCard}>
                <FaLanguage className={styles.featureIcon} />
                <h3>{t('home.whyTableTalk.feature2.title')}</h3>
                <p>{t('home.whyTableTalk.feature2.description')}</p>
            </div>
            <div className={styles.featureCard}>
                <FaShieldAlt className={styles.featureIcon} />
                <h3>{t('home.whyTableTalk.feature3.title')}</h3>
                <p>{t('home.whyTableTalk.feature3.description')}</p>
            </div>
        </div>
      </section>


      {/* --- SEZIONE CTA FINALE --- */}
      <section className={styles.ctaSection}>
        <h2>{t('home.cta.title')}</h2>
        <p>{t('home.cta.subtitle')}</p>
        <div className={styles.ctaButtons}>
          {isAuthenticated ? (
            <Link to="/meals/create" className={styles.btn}>
              {t('home.cta.organizeTableTalk')}
            </Link>
          ) : (
            <Link to="/register" className={styles.btn}>
              {t('home.cta.startNow')}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

export default HomePage;