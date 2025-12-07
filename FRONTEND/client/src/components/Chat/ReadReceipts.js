import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaCheckDouble } from 'react-icons/fa';
import styles from './ReadReceipts.module.css';

/**
 * Componente per mostrare le conferme di lettura dei messaggi
 * @param {Object} message - Il messaggio
 * @param {Array} participants - Array dei partecipanti alla chat
 * @param {function} getMessageReadCount - Funzione per ottenere il numero di letture
 * @param {function} getOtherParticipantsCount - Funzione per ottenere il numero di altri partecipanti
 * @param {string} className - Classe CSS aggiuntiva
 */
const ReadReceipts = ({ 
  message, 
  participants, 
  getMessageReadCount, 
  getOtherParticipantsCount, 
  className = '' 
}) => {
  const { t } = useTranslation();

  // Se il messaggio non è dell'utente corrente, non mostrare nulla
  if (!message || !participants) {
    return null;
  }

  const readCount = getMessageReadCount(message, participants);
  const totalOthers = getOtherParticipantsCount(participants);

  // Se non ci sono altri partecipanti, non mostrare nulla
  if (totalOthers === 0) {
    return null;
  }

  // Determina quale icona mostrare e il colore
  let icon, color, tooltip;

  if (readCount === 0) {
    // Messaggio inviato ma non letto
    icon = <FaCheck />;
    color = '#999';
    tooltip = t('chat.messageSent');
  } else if (readCount < totalOthers) {
    // Messaggio letto da alcuni
    icon = <FaCheckDouble />;
    color = '#4CAF50';
    tooltip = t('chat.messageReadBySome', { count: readCount, total: totalOthers });
  } else {
    // Messaggio letto da tutti
    icon = <FaCheckDouble />;
    color = '#2196F3';
    tooltip = t('chat.messageReadByAll');
  }

  return (
    <div 
      className={`${styles.readReceipts} ${className}`}
      title={tooltip}
    >
      <span 
        className={styles.icon}
        style={{ color }}
      >
        {icon}
      </span>
      {readCount > 0 && (
        <span className={styles.readCount}>
          {readCount}/{totalOthers}
        </span>
      )}
    </div>
  );
};

export default ReadReceipts;
