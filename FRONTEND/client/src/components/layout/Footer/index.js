import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.sections}>
          <div className={styles.section}>
            <h3>TableTalk</h3>
            <p>Il tuo ristorante preferito</p>
          </div>
          
          <div className={styles.section}>
            <h4>Orari</h4>
            <p>Lun-Ven: 12:00 - 23:00</p>
            <p>Sab-Dom: 12:00 - 00:00</p>
          </div>
          
          <div className={styles.section}>
            <h4>Contatti</h4>
            <p>Via Roma 123</p>
            <p>Milano, Italia</p>
            <p>Tel: +39 02 1234567</p>
            <p>Email: info@tabletalk.it</p>
          </div>
          
          <div className={styles.section}>
            <h4>Link Utili</h4>
            <Link to="/menu" className={styles.link}>Menu</Link>
            <Link to="/prenotazioni" className={styles.link}>Prenotazioni</Link>
            <Link to="/contatti" className={styles.link}>Contatti</Link>
            <Link to="/privacy" className={styles.footerLink}>Privacy Policy</Link>
          </div>
        </div>
        
        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} TableTalk. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 