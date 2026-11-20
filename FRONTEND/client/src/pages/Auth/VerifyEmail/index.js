// File: src/pages/Auth/VerifyEmail/index.js
// Pagina di destinazione del link "Conferma email" cliccato dalla casella di posta.
// L'URL costruito dal backend è: ${FRONTEND_URL}/#/verify-email?token=...

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { verifyEmail, resendVerification } from '../../../services/authService';
import Logo from '../../../components/common/Logo';
import Spinner from '../../../components/common/Spinner';

const STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ALREADY_VERIFIED: 'already_verified',
  ERROR: 'error',
  MISSING_TOKEN: 'missing_token',
};

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { user, updateUser, isAuthenticated, loginFromVerification } = useAuth();

  const [status, setStatus] = useState(STATUS.LOADING);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // Ref per leggere i valori/callback più recenti di AuthContext senza aggiungerli
  // alle dipendenze del useEffect (evita doppie chiamate e race condition).
  const authRef = useRef({ user, updateUser, isAuthenticated, loginFromVerification });
  authRef.current = { user, updateUser, isAuthenticated, loginFromVerification };

  // Evita richieste duplicate per lo stesso token (es. React StrictMode o re-render)
  const processedTokenRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus(STATUS.MISSING_TOKEN);
      return undefined;
    }

    if (processedTokenRef.current === token) {
      return undefined;
    }
    processedTokenRef.current = token;

    let redirectTimerId = null;

    const run = async () => {
      try {
        const data = await verifyEmail(token);
        if (!isMountedRef.current) return;

        if (data && data.success) {
          const { loginFromVerification: loginFn, updateUser: updateFn, isAuthenticated: isAuth } = authRef.current;

          if (data.token && data.user && loginFn) {
            try { await loginFn(data); } catch (_) {}
          } else if (isAuth && updateFn) {
            try { await updateFn({ isEmailVerified: true }); } catch (_) {}
          }

          if (!isMountedRef.current) return;

          if (data.alreadyVerified) {
            setStatus(STATUS.ALREADY_VERIFIED);
            redirectTimerId = setTimeout(() => {
              if (isMountedRef.current) navigate('/', { replace: true });
            }, 2000);
          } else {
            setStatus(STATUS.SUCCESS);
          }
        } else {
          setStatus(STATUS.ERROR);
          setErrorMessage((data && data.message) || 'Verifica non riuscita.');
        }
      } catch (err) {
        if (!isMountedRef.current) return;

        const errData = err?.response?.data;
        const isUsedToken = err?.response?.status === 400 || errData?.code === 'INVALID_TOKEN';

        // Se l'utente è già verificato in sessione e il token è stato già consumato,
        // trattiamo il caso in modo idempotente invece di mostrare un errore.
        if (isUsedToken && authRef.current.user?.isEmailVerified) {
          setStatus(STATUS.ALREADY_VERIFIED);
          redirectTimerId = setTimeout(() => {
            if (isMountedRef.current) navigate('/', { replace: true });
          }, 2000);
          return;
        }

        setStatus(STATUS.ERROR);
        const msg = errData?.message || err?.message || 'Errore durante la verifica dell\'email.';
        setErrorMessage(msg);
      }
    };

    run();

    return () => {
      if (redirectTimerId) clearTimeout(redirectTimerId);
    };
  }, [token, navigate]);

  const handleResendVerification = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetEmail = (user?.email || resendEmail || '').trim();
    if (!targetEmail) {
      toast.error('Inserisci il tuo indirizzo email per ricevere un nuovo link.');
      return;
    }

    setResending(true);
    try {
      await resendVerification({ email: targetEmail });
      setResendSent(true);
      toast.success('Nuova email di verifica inviata! Controlla la tua casella.');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Errore nel rinvio dell\'email di verifica.';
      toast.error(msg);
    } finally {
      if (isMountedRef.current) setResending(false);
    }
  };

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
              Continua dove avevi lasciato: completa il tuo profilo per iniziare a usare table2Talk.
            </p>
            <Link to="/impostazioni/profilo?firstTime=1" style={styles.button}>Vai al tuo profilo</Link>
          </>
        )}

        {status === STATUS.ALREADY_VERIFIED && (
          <>
            <h2 style={styles.title}>✅ Account già verificato</h2>
            <p style={styles.text}>
              Il tuo indirizzo email è già confermato. Ti stiamo reindirizzando alla Home…
            </p>
            <Link to="/" style={styles.button}>Vai alla Home</Link>
          </>
        )}

        {status === STATUS.ERROR && (
          <>
            <h2 style={styles.title}>❌ Verifica non riuscita</h2>
            <p style={styles.text}>{errorMessage}</p>
            <p style={styles.textSmall}>
              Il link potrebbe essere scaduto (validità 24 ore) oppure già utilizzato.
            </p>

            {resendSent ? (
              <p style={styles.successHint}>
                ✅ Email inviata! Controlla la tua casella di posta.
              </p>
            ) : (
              <form onSubmit={handleResendVerification} style={styles.resendForm}>
                {!user?.email && (
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="La tua email di registrazione"
                    required
                    style={styles.input}
                  />
                )}
                <button
                  type="submit"
                  disabled={resending}
                  style={styles.button}
                >
                  {resending ? 'Invio in corso…' : 'Invia di nuovo l\'email di verifica'}
                </button>
              </form>
            )}

            <div style={styles.secondaryLinkWrap}>
              <Link to="/login" style={styles.secondaryLink}>Torna al login</Link>
            </div>
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
    background: 'linear-gradient(135deg, var(--tt-accent) 0%, color-mix(in srgb, var(--tt-accent) 80%, var(--tt-text)) 100%)',
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
  successHint: { fontSize: '0.95rem', color: 'var(--tt-accent)', fontWeight: 600, margin: '14px 0' },
  resendForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '14px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '0.95rem',
  },
  button: {
    display: 'inline-block',
    marginTop: '12px',
    padding: '10px 22px',
    borderRadius: '8px',
    border: 'none',
    background: 'var(--tt-accent)',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryLinkWrap: {
    marginTop: '14px',
  },
  secondaryLink: {
    fontSize: '0.9rem',
    color: 'var(--tt-accent)',
    textDecoration: 'underline',
  },
};

export default VerifyEmailPage;
