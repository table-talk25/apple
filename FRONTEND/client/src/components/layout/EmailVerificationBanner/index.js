// File: src/components/layout/EmailVerificationBanner/index.js
// Banner non bloccante mostrato in cima al Layout finché l'utente non
// ha verificato la propria email. Strategia "Soft" — niente azioni bloccate.
//
// 📡 SINGLE SOURCE OF TRUTH: questo componente NON polla /auth/me.
// L'aggiornamento dello stato utente è gestito centralmente in AuthContext.
//
// ✅ FIX: il banner usa serverVerified (da AuthContext) invece di un timer fisso.
//    Appare SOLO dopo che verifyToken() ha completato almeno una volta,
//    garantendo che user.isEmailVerified rifletta il dato reale dal server.

import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { resendVerification } from '../../../services/authService';
import { toast } from 'react-toastify';

const STORAGE_KEY_PREFIX = 'emailBannerDismissed_';

const EmailVerificationBanner = () => {
  const { user, isAuthenticated, serverVerified } = useAuth();

  const storageKey = user?.email ? `${STORAGE_KEY_PREFIX}${user.email}` : null;
  const [dismissed, setDismissed] = useState(() => {
    if (!storageKey) return false;
    try { return localStorage.getItem(storageKey) === 'true'; } catch (_) { return false; }
  });

  const [sending, setSending] = useState(false);

  if (!isAuthenticated || !user) return null;
  // Aspetta che verifyToken() abbia risposto almeno una volta prima di mostrare il banner.
  // Questo evita il "flash" con dati stale del localStorage (utente già verificato
  // su un altro browser/device, ma localStorage non ancora aggiornato).
  if (!serverVerified) return null;
  if (user.isEmailVerified !== false) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (storageKey) {
      try { localStorage.setItem(storageKey, 'true'); } catch (_) {}
    }
  };

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
        📧 Ti abbiamo inviato un'email di verifica a <strong>{user.email}</strong>. Apri il link per attivare l'account e non perdere notifiche e funzionalità.
        {' '}
        <span style={styles.smallHint}>Non l'hai ricevuta?</span>
      </span>
      <span style={styles.actions}>
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          style={styles.resendBtn}
        >
          {sending ? 'Invio…' : 'Reinvia'}
        </button>
        <button
          type="button"
          aria-label="Chiudi"
          onClick={handleDismiss}
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
    alignSelf: 'stretch',
    width: '100%',
    background: '#fff7e0',
    color: '#5b4a00',
    border: '1px solid #ffe28a',
    borderRadius: '0',
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
  smallHint: { color: '#7a6500', fontSize: '0.85rem', whiteSpace: 'nowrap' },
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