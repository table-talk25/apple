import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../../contexts/NotificationContext';
import styles from './Notifications.module.css';

const Notifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAllAsRead, setNavigate } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setNavigate(navigate);
  }, [navigate, setNavigate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleToggle = async () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening && unreadCount > 0) {
      await markAllAsRead();
    }
  };

  const handleNotifClick = (notif) => {
    setIsOpen(false);
    if (notif.type === 'new_message' && notif.chatId) {
      navigate(`/chat/${notif.chatId}`);
    } else if (notif.mealId) {
      navigate(`/meals/${notif.mealId}`);
    }
  };

  return (
    <div className={styles.notificationsContainer} ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={styles.iconButton}
        aria-label={t('nav.notifications', 'Notifiche')}
        aria-expanded={isOpen}
      >
        <span className={styles.iconEmoji} aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu} role="menu">
          {loading ? (
            <div className={styles.notificationItem}>
              {t('notifications.loading')}
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notif, i) => (
              <button
                type="button"
                key={notif._id || i}
                className={`${styles.notificationItem} ${
                  !(notif.read || notif.isRead) ? styles.unread : ''
                }`}
                onClick={() => handleNotifClick(notif)}
                role="menuitem"
              >
                <span className={styles.notificationText}>{notif.message}</span>
                <span className={styles.notificationDate}>
                  {notif.createdAt
                    ? new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </button>
            ))
          ) : (
            <div className={styles.emptyItem}>
              {t('notifications.noNotifications')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
