import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import ReadReceipts from './ReadReceipts';
import styles from './ChatMessage.module.css';

/**
 * Componente per visualizzare un singolo messaggio nella chat
 * @param {Object} message - Il messaggio da visualizzare
 * @param {Object} currentUser - L'utente corrente
 * @param {Array} participants - Array dei partecipanti alla chat
 * @param {function} getMessageReadCount - Funzione per ottenere il numero di letture
 * @param {function} getOtherParticipantsCount - Funzione per ottenere il numero di altri partecipanti
 * @param {string} className - Classe CSS aggiuntiva
 */
const ChatMessage = ({ 
  message, 
  currentUser, 
  participants,
  getMessageReadCount,
  getOtherParticipantsCount,
  className = '' 
}) => {
  const { t } = useTranslation();
  const isOwnMessage = message.sender._id === currentUser?._id;

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'HH:mm', { locale: it });
    } catch (error) {
      return '--:--';
    }
  };

  return (
    <div className={`${styles.messageContainer} ${className}`}>
      <div className={`${styles.message} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}>
        {!isOwnMessage && (
          <div className={styles.senderInfo}>
            <img 
              src={message.sender.profileImage || '/default-avatar.jpg'} 
              alt={t('chat.userAvatarAlt')}
              className={styles.avatar}
            />
            <span className={styles.senderName}>{message.sender.nickname}</span>
          </div>
        )}
        
        <div className={styles.messageContent}>
          <div className={styles.messageText}>
            {message.content}
          </div>
          
          <div className={styles.messageFooter}>
            <span className={styles.timestamp}>
              {formatTime(message.timestamp)}
            </span>
            
            {/* Conferme di lettura solo per i messaggi dell'utente corrente */}
            {isOwnMessage && (
              <ReadReceipts
                message={message}
                participants={participants}
                getMessageReadCount={getMessageReadCount}
                getOtherParticipantsCount={getOtherParticipantsCount}
                className={styles.readReceipts}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
