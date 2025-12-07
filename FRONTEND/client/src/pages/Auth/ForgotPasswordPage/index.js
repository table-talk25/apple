// File: src/pages/Auth/ForgotPasswordPage/index.js
// 🔑 PAGINA PASSWORD DIMENTICATA
// 
// Questa pagina permette agli utenti di richiedere il reset della password
// tramite email con un'interfaccia user-friendly e gestione errori completa

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { FaEnvelope, FaArrowLeft, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import styles from './ForgotPasswordPage.module.css';

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Stato del form
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState('');
  
  // Validazione email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Gestione invio form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validazione
    if (!email.trim()) {
      setError('Inserisci la tua email');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Inserisci un\'email valida');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setIsEmailSent(true);
        toast.success('Email di reset inviata! Controlla la tua casella di posta.');
      } else {
        // Gestisci errori specifici
        if (data.code === 'COOLDOWN_ACTIVE') {
          setError(`Devi aspettare prima di richiedere un nuovo reset. ${data.message}`);
        } else {
          setError(data.message || 'Errore nell\'invio dell\'email di reset');
        }
        toast.error('Errore nell\'invio dell\'email di reset');
      }
    } catch (error) {
      console.error('Errore nella richiesta reset password:', error);
      setError('Errore di connessione. Riprova più tardi.');
      toast.error('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  // Gestione cambio email
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  // Gestione invio nuovo reset
  const handleResendEmail = () => {
    setIsEmailSent(false);
    setError('');
  };

  // Se l'email è stata inviata, mostra la conferma
  if (isEmailSent) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successHeader}>
            <FaCheckCircle className={styles.successIcon} />
            <h1>Email Inviata!</h1>
            <p>Controlla la tua casella di posta</p>
          </div>
          
          <div className={styles.successContent}>
            <div className={styles.infoBox}>
              <h3>📧 Cosa fare ora:</h3>
              <ol>
                <li>Controlla la tua email (anche nella cartella spam)</li>
                <li>Clicca sul link "Reset Password" nell'email</li>
                <li>Inserisci una nuova password</li>
                <li>Accedi con le nuove credenziali</li>
              </ol>
            </div>
            
            <div className={styles.securityNotice}>
              <h4>🔒 Sicurezza:</h4>
              <ul>
                <li>Il link scade tra 1 ora</li>
                <li>Non condividere il link con nessuno</li>
                <li>Se non hai richiesto il reset, ignora l'email</li>
              </ul>
            </div>
            
            <div className={styles.actions}>
              <button 
                onClick={handleResendEmail}
                className={styles.secondaryButton}
                disabled={isLoading}
              >
                {isLoading ? 'Invio...' : 'Invia Nuova Email'}
              </button>
              
              <Link to="/login" className={styles.backToLogin}>
                <FaArrowLeft /> Torna al Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <Link to="/login" className={styles.backButton}>
            <FaArrowLeft /> Torna al Login
          </Link>
          
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🍽️</span>
            <h1>TableTalk</h1>
          </div>
          
          <h2>Password Dimenticata?</h2>
          <p>Inserisci la tua email per ricevere un link per il reset</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorMessage}>
              <FaExclamationTriangle />
              <span>{error}</span>
            </div>
          )}
          
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <div className={styles.inputWrapper}>
              <FaEnvelope className={styles.inputIcon} />
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Inserisci la tua email"
                className={styles.input}
                disabled={isLoading}
                required
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading || !email.trim()}
          >
            {isLoading ? (
              <>
                <div className={styles.spinner}></div>
                Invio in corso...
              </>
            ) : (
              'Invia Email di Reset'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className={styles.footer}>
          <p>Non hai un account? <Link to="/register">Registrati</Link></p>
          <p>Ricordi la password? <Link to="/login">Accedi</Link></p>
        </div>

        {/* Informazioni aggiuntive */}
        <div className={styles.additionalInfo}>
          <div className={styles.infoCard}>
            <h4>ℹ️ Come funziona:</h4>
            <ul>
              <li>Riceverai un'email con un link sicuro</li>
              <li>Il link è valido per 1 ora</li>
              <li>La tua password attuale rimane valida</li>
              <li>Processo completamente sicuro e criptato</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
