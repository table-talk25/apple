import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TypingIndicator.module.css';

/**
 * Componente per mostrare l'indicatore "sta scrivendo" nella chat
 * @param {Array} typingUsers - Array degli utenti che stanno scrivendo
 * @param {string} className - Classe CSS aggiuntiva
 */
const TypingIndicator = ({ typingUsers, className = '' }) => {
  const { t } = useTranslation();

  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }

  // Formatta i nomi degli utenti che stanno scrivendo
  const formatTypingUsers = (users) => {
    if (users.length === 1) {
      return users[0].user.nickname;
    } else if (users.length === 2) {
      return `${users[0].user.nickname} e ${users[1].user.nickname}`;
    } else {
      return `${users[0].user.nickname} e altri ${users.length - 1}`;
    }
  };

  return (
    <div className={`${styles.typingIndicator} ${className}`}>
      <div className={styles.typingContent}>
        <div className={styles.typingDots}>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
        </div>
        <span className={styles.typingText}>
          {t('chat.typing', { users: formatTypingUsers(typingUsers) })}
        </span>
      </div>
    </div>
  );
};

export default TypingIndicator;
