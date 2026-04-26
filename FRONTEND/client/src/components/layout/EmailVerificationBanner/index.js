// File: src/components/layout/EmailVerificationBanner/index.js
// Banner non bloccante mostrato in cima al Layout finché l'utente non
// ha verificato la propria email. Strategia "Soft" — niente azioni bloccate.

import React, { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../../../contexts/AuthContext';
import { resendVerification, verifyToken } from '../../../services/authService';
import { toast } from 'react-toastify';

const EmailVerificationBanner = () => {
  const { user, isAuthenticated, updateUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user || user.isEmailVerified || dismissed) return;

    let cancelled = false;
    let appStateListener;

    const refreshVerificationState = async () => {
      try {
        const freshUser = await verifyToken();
        if (cancelled || !freshUser) return;

        if (freshUser.isEmailVerified) {
          await updateUser(freshUser);
          setDismissed(true);
        }
      } catch (_) {
        // Silenzioso: il banner non deve mostrare errori se il server è in cold start.
      }
    };

    refreshVerificationState();

    const handleVisibilityChange = () => {
      if (!document.hidden) refreshVerificationState();
    };

    window.addEventListener('focus', refreshVerificationState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) refreshVerificationState();
      }).then(listener => {
        appStateListener = listener;
      }).catch(() => {});
    }

    // Copre il caso in cui il browser/email non rimandi un evento affidabile alla WebView.
    const intervalId = window.setInterval(refreshVerificationState, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshVerificationState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (appStateListener) appStateListener.remove();
    };
  }, [isAuthenticated, user, dismissed, updateUser]);

  // Mostra il banner solo per utenti loggati con email NON verificata
  if (!isAuthenticated || !user) return null;
  if (user.isEmailVerified) return null;
  if (dismissed) return null;

  const handleResend = async () => {
    if (!user.email) return;
    setSending(true);
    try {
      await resendVerification({ email: user.email });
      toast.success('Email di verifica inviata. Controlla la tua casella.');
    } catch (err) {
      const msg = (err && err.response && err.response.data && err.response.data.message) || err.message || 'Errore nel rinvio.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div role="status" style={styles.bar} data-testid="email-verification-banner">
      <span style={styles.text}>
        📧 Conferma la tua email <strong>{user.email}</strong> per non perdere notifiche e funzionalità.
      </span>
      <span style={styles.actions}>
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          style={styles.resendBtn}
        >
          {sending ? 'Invio…' : 'Reinvia email'}
        </button>
        <button
          type="button"
          aria-label="Chiudi"
          onClick={() => setDismissed(true)}
          style={styles.closeBtn}
        >
          ×
        </button>
      </span>
    </div>
  );
};

const styles = {
  bar: {
    // Il banner sta DENTRO mainContent (vedi Layout/index.js): è già protetto
    // dalla Navbar fixed, ma mainContent ha `align-items: center` quindi forziamo
    // la larghezza piena con `alignSelf: stretch` + width 100%.
    alignSelf: 'stretch',
    width: '100%',
    background: '#fff7e0',
    color: '#5b4a00',
    border: '1px solid #ffe28a',
    borderRadius: '0', // tagliato dai bordi della pagina, sembra una "barra di sistema"
    borderLeft: 'none',
    borderRight: 'none',
    padding: '10px 16px',
    marginBottom: '12px',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px',
  },
  text: { flex: '1 1 auto', minWidth: 0 },
  actions: { display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' },
  resendBtn: {
    background: '#f5b400',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.2rem',
    lineHeight: 1,
    cursor: 'pointer',
    color: '#5b4a00',
    padding: '0 6px',
  },
};

export default EmailVerificationBanner;
