import React, { useEffect, useRef, useId } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const SIZE_CLASSES = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

const Modal = ({
  isOpen = false,
  onClose,
  title = '',
  ariaLabel = '',
  size = 'md',
  showCloseButton = true,
  footer = null,
  className = '',
  children,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      if (!dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        dialogRef.current.focus();
      }
    }, 0);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (onClose) onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) {
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === 'function'
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const modalNode = (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel || t('ui.modal.close', 'Dialog') : undefined}
        tabIndex={-1}
        className={`${styles.modal} ${SIZE_CLASSES[size] || styles.md} ${className}`.trim()}
      >
        {showCloseButton && onClose && (
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t('ui.modal.close', 'Chiudi')}
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        )}

        {title && (
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
          </div>
        )}

        <div className={styles.content}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalNode, document.body);
};

export default Modal;
