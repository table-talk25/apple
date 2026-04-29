// File: src/components/layout/EmailVerificationBanner/index.js
// Banner non bloccante mostrato in cima al Layout finché l'utente non
// ha verificato la propria email. Strategia "Soft" — niente azioni bloccate.
//
// 📡 SINGLE SOURCE OF TRUTH: questo componente NON polla più /auth/me.
// L'aggiornamento dello stato utente è gestito centralmente in AuthContext
// (focus / visibilitychange / Capacitor appStateChange listeners).
// Quando l'utente verifica l'email in altro browser/tab e torna qui,
// AuthContext rinfresca lo state → user.isEmailVerified diventa true
// → questo banner si nasconde automaticamente al prossimo render.

import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { resendVerification } from '../../../services/authService';
import { toast } from 'react-toastify';

const EmailVerificationBanner = () => {
  const { user, isAuthenticated } = useAuth();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Mostra il banner solo quando lo stato è esplicitamente "non verificato" (mai su undefined mentre carica)
  if (!isAuthenticated || !user) return null;
  if (user.isEmailVerified !== false) return null;
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
