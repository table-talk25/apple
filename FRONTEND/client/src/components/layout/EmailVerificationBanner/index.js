// File: src/components/layout/EmailVerificationBanner/index.js
// Banner non bloccante mostrato in cima al Layout finché l'utente non
// ha verificato la propria email. Strategia "Soft" — niente azioni bloccate.

import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { resendVerification } from '../../../services/authService';
import { toast } from 'react-toastify';

const EmailVerificationBanner = () => {
  const { user, isAuthenticated } = useAuth();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

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
    background: '#fff7e0',
    color: '#5b4a00',
    borderBottom: '1px solid #ffe28a',
    padding: '8px 12px',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
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
