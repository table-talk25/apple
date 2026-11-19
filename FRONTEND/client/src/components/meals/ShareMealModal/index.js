import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-toastify';
import { MessageCircle, Send, Mail, Copy, Check } from 'lucide-react';
import { Modal } from '../../ui';
import {
  buildMealShareData,
  copyToClipboardWithFallback,
  openExternalShareUrl,
} from '../../../utils/mealShare';
import styles from './ShareMealModal.module.css';

const ShareMealModal = ({ meal, isOpen, onClose, onToast }) => {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  const shareData = useMemo(
    () => (meal ? buildMealShareData(meal, i18n.language) : null),
    [meal, i18n.language]
  );

  if (!meal || !shareData) return null;

  const handleExternalClick = (url) => async (e) => {
    if (Capacitor.isNativePlatform()) {
      e.preventDefault();
      await openExternalShareUrl(url);
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboardWithFallback(shareData.link);
    const msg = t('detail.toasts.copy', '🔗 Link copiato negli appunti.');
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
    if (onToast) onToast(msg, 'success');
    else toast.success(msg);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('share.title', 'Invita commensali')}
      size="sm"
    >
      <p className={styles.subtitle}>
        {t('share.subtitle', {
          title: shareData.title,
          defaultValue: `Condividi «${shareData.title}» e riempi il tavolo.`,
        })}
      </p>

      <div className={styles.list}>
        <a
          className={styles.shareBtn}
          href={shareData.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleExternalClick(shareData.whatsappUrl)}
          data-testid="share-whatsapp"
        >
          <span className={`${styles.ico} ${styles.icoAccent}`} aria-hidden="true">
            <MessageCircle size={18} strokeWidth={2.2} />
          </span>
          <span>{t('share.whatsapp', 'WhatsApp')}</span>
        </a>

        <a
          className={styles.shareBtn}
          href={shareData.telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleExternalClick(shareData.telegramUrl)}
          data-testid="share-telegram"
        >
          <span className={`${styles.ico} ${styles.icoPrimary}`} aria-hidden="true">
            <Send size={17} strokeWidth={2.2} />
          </span>
          <span>{t('share.telegram', 'Telegram')}</span>
        </a>

        <a
          className={styles.shareBtn}
          href={shareData.emailUrl}
          data-testid="share-email"
        >
          <span className={`${styles.ico} ${styles.icoAccent}`} aria-hidden="true">
            <Mail size={17} strokeWidth={2.2} />
          </span>
          <span>{t('share.email', 'Email')}</span>
        </a>

        <button
          type="button"
          className={styles.shareBtn}
          onClick={handleCopy}
          data-testid="share-copy"
        >
          <span className={`${styles.ico} ${styles.icoMuted}`} aria-hidden="true">
            {copied ? <Check size={17} strokeWidth={2.4} /> : <Copy size={17} strokeWidth={2.2} />}
          </span>
          <span>
            {copied
              ? t('share.copied', 'Link copiato!')
              : t('share.copyLink', 'Copia link')}
          </span>
        </button>
      </div>
    </Modal>
  );
};

export default ShareMealModal;
