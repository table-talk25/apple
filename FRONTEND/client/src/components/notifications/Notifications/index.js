import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../../contexts/NotificationContext';
import { useChatDrawer } from '../../../contexts/ChatDrawerContext';
import styles from './Notifications.module.css';

const Notifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    setNavigate,
    setOpenChat,
  } = useNotifications();
  const { openChat } = useChatDrawer();
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setNavigate(navigate);
  }, [navigate, setNavigate]);

  useEffect(() => {
    if (setOpenChat) setOpenChat(openChat);
  }, [openChat, setOpenChat]);

  const updateMenuPosition = useCallback(() => {
    if (!containerRef.current || typeof window === 'undefined') return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth || 360;
    const top = Math.max(8, Math.round(rect.bottom + 8));

    if (vw <= 640) {
      // Schermi stretti (incluso Galaxy Z Flip 3): sempre ancorato ai bordi reali della viewport
      setMenuStyle({
        position: 'fixed',
        top: `${top}px`,
        left: '10px',
        right: '10px',
        width: 'auto',
        maxWidth: 'calc(100vw - 20px)',
      });
    } else {
      const rightOffset = Math.max(12, Math.round(vw - rect.right));
      setMenuStyle({
        position: 'fixed',
        top: `${top}px`,
        right: `${rightOffset}px`,
        left: 'auto',
      });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const inTrigger = containerRef.current && containerRef.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inTrigger && !inDropdown) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleToggle = async () => {
    const opening = !isOpen;
    if (opening) updateMenuPosition();
    setIsOpen(opening);
    if (opening && unreadCount > 0) {
      await markAllAsRead();
    }
  };

  const handleNotifClick = (notif) => {
    setIsOpen(false);
    if (notif.type === 'new_message' && notif.chatId) {
      openChat(notif.chatId);
    } else if (notif.mealId) {
      navigate(`/meals/${notif.mealId}`);
    }
  };

  const dropdownNode = isOpen ? (
    <div
      ref={dropdownRef}
      className={styles.dropdownMenu}
      style={menuStyle}
      role="menu"
    >
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
              {(() => {
                const raw = notif.createdAt || notif.date || notif.timestamp;
                if (!raw) return '';
                const d = new Date(raw);
                if (Number.isNaN(d.getTime())) return '';
                const now = new Date();
                const sameDay =
                  d.getFullYear() === now.getFullYear() &&
                  d.getMonth() === now.getMonth() &&
                  d.getDate() === now.getDate();
                const timeStr = d.toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                if (sameDay) return timeStr;
                const dateStr = d.toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: 'short',
                });
                return `${dateStr} · ${timeStr}`;
              })()}
            </span>
          </button>
        ))
      ) : (
        <div className={styles.emptyItem}>
          {t('notifications.noNotifications')}
        </div>
      )}
    </div>
  ) : null;

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

      {dropdownNode && typeof document !== 'undefined'
        ? ReactDOM.createPortal(dropdownNode, document.body)
        : dropdownNode}
    </div>
  );
};

export default Notifications;
