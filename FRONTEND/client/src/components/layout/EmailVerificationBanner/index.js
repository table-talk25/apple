import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { resendVerification } from '../../../services/authService';
import { toast } from 'react-toastify';
import { Button } from '../../ui';
import styles from './EmailVerificationBanner.module.css';

const STORAGE_KEY_PREFIX = 'emailBannerDismissed_';

const EmailVerificationBanner = () => {
  const { user, isAuthenticated, serverVerified } = useAuth();

  const storageKey = user?.email ? `${STORAGE_KEY_PREFIX}${user.email}` : null;
  const [dismissed, setDismissed] = useState(() => {
    if (!storageKey) return false;
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    if (!storageKey) {
      setDismissed(false);
      return;
    }
    try {
      setDismissed(localStorage.getItem(storageKey) === 'true');
    } catch (_) {
      setDismissed(false);
    }
  }, [storageKey]);

  const [sending, setSending] = useState(false);

  if (!isAuthenticated || !user || !serverVerified || user.isEmailVerified || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, 'true');
      } catch (_) {}
    }
  };

  const handleResend = async () => {
    if (!user.email) return;
    setSending(true);
    try {
      await resendVerification({ email: user.email });
      toast.success('Email di verifica inviata. Controlla la tua casella.');
    } catch (err) {
      const msg =
        (err && err.response && err.response.data && err.response.data.message) ||
        err.message ||
        'Errore nel rinvio.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div role="status" className={styles.bar} data-testid="email-verification-banner">
      <div className={styles.inner}>
        <span className={styles.text}>
          📧 Ti abbiamo inviato un&apos;email di verifica a <strong>{user.email}</strong>. Apri il link per attivare l&apos;account e non perdere notifiche e funzionalità.{' '}
          <span className={styles.smallHint}>Non l&apos;hai ricevuta?</span>
        </span>
        <span className={styles.actions}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleResend}
            disabled={sending}
          >
            {sending ? 'Invio…' : 'Reinvia'}
          </Button>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={handleDismiss}
            className={styles.closeBtn}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </span>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
