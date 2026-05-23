// File: FRONTEND/client/src/components/notifications/Notifications/index.js

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaBell, FaRegBell } from 'react-icons/fa';
import { useNotifications } from '../../../contexts/NotificationContext';
import styles from './Notifications.module.css';

const Notifications = ({ isOpen, onToggle }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAllAsRead, setNavigate } = useNotifications();

  // Registra navigate nel context così i toast possono navigare
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate, setNavigate]);

  const handleToggle = async () => {
    onToggle();
    if (!isOpen && unreadCount > 0) {
      await markAllAsRead();
    }
  };

  const handleNotifClick = (notif) => {
    onToggle();
    if (notif.type === 'new_message' && notif.chatId) {
      navigate(`/chat/${notif.chatId}`);
    } else if (notif.mealId) {
      navigate(`/meals/${notif.mealId}`);
    }
  };

  return (
    <div className={styles.notificationsContainer}>
      <button onClick={handleToggle} className={styles.iconButton} aria-label="Notifiche">
        {unreadCount > 0 ? <FaBell /> : <FaRegBell />}
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {loading ? (
            <div className={styles.notificationItem}>{t('notifications.loading')}</div>
          ) : notifications.length > 0 ? (
            notifications.map((notif, i) => (
              <div
                key={notif._id || i}
                className={`${styles.notificationItem} ${!(notif.read || notif.isRead) ? styles.unread : ''}`}
                onClick={() => handleNotifClick(notif)}
                style={{ cursor: 'pointer' }}
              >
                <span>{notif.message}</span>
                <span className={styles.notificationDate}>
                  {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))
          ) : (
            <div className={styles.notificationItem}>{t('notifications.noNotifications')}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
