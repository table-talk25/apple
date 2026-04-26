// File: src/pages/Auth/VerifyEmail/index.js
// Pagina di destinazione del link "Conferma email" cliccato dalla casella di posta.
// L'URL costruito dal backend è: ${FRONTEND_URL}/verify-email?token=...

import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { verifyEmail } from '../../../services/authService';
import Logo from '../../../components/common/Logo';
import Spinner from '../../../components/common/Spinner';

const STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  MISSING_TOKEN: 'missing_token',
};

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { t } = useTranslation();
  const { user, updateUser, isAuthenticated } = useAuth();

  const [status, setStatus] = useState(STATUS.LOADING);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        if (!cancelled) setStatus(STATUS.MISSING_TOKEN);
        return;
      }
      try {
        const data = await verifyEmail(token);
        if (cancelled) return;
        if (data && data.success) {
          setStatus(STATUS.SUCCESS);
          // Se l'utente è già loggato in questo browser, aggiorna lo stato locale
          if (isAuthenticated && updateUser) {
            try { await updateUser({ isEmailVerified: true }); } catch (_) {}
          }
        } else {
          setStatus(STATUS.ERROR);
          setErrorMessage((data && data.message) || 'Verifica non riuscita.');
        }
      } catch (err) {
        if (cancelled) return;
        setStatus(STATUS.ERROR);
        const msg = (err && err.response && err.response.data && err.response.data.message)
          || err.message
          || 'Errore durante la verifica dell\'email.';
        setErrorMessage(msg);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [token, isAuthenticated, updateUser]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <Logo />
        </div>

        {status === STATUS.LOADING && (
          <>
            <h2 style={styles.title}>Stiamo verificando la tua email…</h2>
            <Spinner />
          </>
        )}

        {status === STATUS.SUCCESS && (
          <>
            <h2 style={styles.title}>✅ Email confermata!</h2>
            <p style={styles.text}>
              Grazie {user && user.name ? user.name : ''}, il tuo account è ora completamente attivo.
            </p>
            <p style={styles.text}>
              Puoi tornare nell'app TableTalk per continuare.
            </p>
            <Link to="/meals" style={styles.button}>Apri TableTalk</Link>
          </>
        )}

        {status === STATUS.ERROR && (
          <>
            <h2 style={styles.title}>❌ Verifica non riuscita</h2>
            <p style={styles.text}>{errorMessage}</p>
            <p style={styles.textSmall}>
              Il link potrebbe essere scaduto (validità 24 ore). Apri l'app e usa il pulsante "Reinvia email" nel banner in cima alla schermata.
            </p>
            <Link to="/login" style={styles.button}>Vai al login</Link>
          </>
        )}

        {status === STATUS.MISSING_TOKEN && (
          <>
            <h2 style={styles.title}>Link non valido</h2>
            <p style={styles.text}>
              Manca il token di verifica nell'URL. Apri il link direttamente dall'email che ti abbiamo inviato.
            </p>
            <Link to="/login" style={styles.button}>Torna al login</Link>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px 28px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
  },
  logoWrap: { marginBottom: '20px' },
  title: { fontSize: '1.4rem', marginBottom: '12px' },
  text: { fontSize: '1rem', color: '#333', margin: '8px 0' },
  textSmall: { fontSize: '0.875rem', color: '#666', margin: '8px 0' },
  button: {
    display: 'inline-block',
    marginTop: '16px',
    padding: '10px 22px',
    borderRadius: '8px',
    background: '#667eea',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 600,
  },
};

export default VerifyEmailPage;
