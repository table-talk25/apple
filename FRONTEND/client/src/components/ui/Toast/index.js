import React, { useEffect } from 'react';
import styles from './Toast.module.css';

export const TOAST_MESSAGES = {
  join: '🎉 Sei dentro! Lo trovi in «I miei t2t».',
  leave: 'Hai abbandonato il tavolo. Il posto è tornato libero.',
  create: '🎉 Il tuo t2t è online! Invita i primi commensali.',
  notify: '🔔 Ti avviseremo se si libera un posto.',
  copy: '🔗 Link copiato negli appunti.',
};

const TONE_CLASSES = {
  success: styles.success,
  error: styles.error,
  info: styles.info,
};

const Toast = ({
  message = '',
  visible = false,
  tone = 'success',
  duration = 2800,
  onClose,
  className = '',
}) => {
  useEffect(() => {
    if (!visible || !duration || !onClose) return undefined;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onClose, message]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        styles.toast,
        TONE_CLASSES[tone] || styles.success,
        visible ? styles.show : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {message}
    </div>
  );
};

export default Toast;
