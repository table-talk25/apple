// File: FRONTEND/client/src/components/notifications/Notifications.js

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaBell, FaRegBell } from 'react-icons/fa';
import notificationService from '../../../services/notificationService';
import styles from './Notifications.module.css';
import { toast } from 'react-toastify';

const Notifications = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const list = await notificationService.getNotifications();
      setNotifications(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error(t('notifications.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleToggle = async () => {
    setIsOpen(prev => !prev);
    // Se apro il menu e ci sono notifiche non lette, le segno come lette
    if (!isOpen && unreadCount > 0) {
      try {
        await notificationService.markAllAsRead();
        // Aggiorno lo stato delle notifiche nel frontend per riflettere il cambiamento
        setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
      } catch (error) {
        console.error('Errore nel marcare le notifiche come lette');
      }
    }
  };

  const unreadCount = notifications.filter(n => !(n.read || n.isRead)).length;

  return (
    <div className={styles.notificationsContainer}>
      <button onClick={handleToggle} className={styles.iconButton}>
        {unreadCount > 0 ? <FaBell /> : <FaRegBell />}
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {loading ? (
            <div className={styles.notificationItem}>{t('notifications.loading')}</div>
          ) : notifications.length > 0 ? (
            notifications.map(notif => (
              <Link 
                to={`/meals/${notif.mealId}`} 
                key={notif._id} 
                className={`${styles.notificationItem} ${!notif.read ? styles.unread : ''}`}
                onClick={() => setIsOpen(false)} // Chiude il menu al click
              >
                {notif.message}
                <span className={styles.notificationDate}>
                  {new Date(notif.createdAt).toLocaleDateString()}
                </span>
              </Link>
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
