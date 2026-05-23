import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import notificationService from '../services/notificationService';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { API_URL } from '../config/capacitorConfig';
import { useNavigate } from 'react-router-dom';
import { playNotificationSound } from '../utils/notificationSound';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const navigateRef = useRef(null);

  // Helper: aggiungi una notifica in cima alla lista, incrementa badge e suona
  const pushNotification = useCallback((notif) => {
    setNotifications(prev => [notif, ...prev]);
    setUnreadCount(prev => prev + 1);
    playNotificationSound();
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const list = await notificationService.getNotifications();
      if (Array.isArray(list)) {
        setNotifications(list);
        setUnreadCount(list.filter(n => !(n.isRead || n.read)).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('[NotificationContext] Errore caricamento notifiche:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const apiUrl = (process.env.REACT_APP_API_URL || API_URL || '').replace(/\/$/, '');
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      withCredentials: true,
    });
    socketRef.current = socket;

    // ── 1. Messaggio in chat (utente NON nella chat room) ─────────────
    socket.on('new_chat_message_alert', ({ senderName, preview, chatId }) => {
      const msg = `💬 ${senderName}: ${preview}`;
      playNotificationSound();
      toast.info(msg, {
        autoClose: 5000,
        onClick: () => {
          if (navigateRef.current) navigateRef.current(`/chat/${chatId}`);
        },
      });
      pushNotification({
        _id: `chat_${Date.now()}`,
        message: msg,
        type: 'new_message',
        chatId,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    // ── 2. Reminder 30 min prima del pasto ───────────────────────────
    socket.on('meal_reminder', ({ mealId, mealTitle }) => {
      const msg = `⏰ "${mealTitle}" inizia tra 30 minuti!`;
      toast.warning(msg, {
        autoClose: 8000,
        onClick: () => {
          if (navigateRef.current) navigateRef.current(`/meals/${mealId}`);
        },
      });
      pushNotification({
        _id: `reminder_${mealId}_${Date.now()}`,
        message: msg,
        type: 'meal_reminder',
        mealId,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    // ── 3. Video chat disponibile ─────────────────────────────────────
    socket.on('video_call_available', ({ mealId, mealTitle }) => {
      const msg = `🎥 La video chat di "${mealTitle}" è disponibile!`;
      toast.success(msg, {
        autoClose: 10000,
        onClick: () => {
          if (navigateRef.current) navigateRef.current(`/meals/${mealId}`);
        },
      });
      pushNotification({
        _id: `video_${mealId}_${Date.now()}`,
        message: msg,
        type: 'video_call_available',
        mealId,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    // ── 4. Notifica generica dal backend ─────────────────────────────
    socket.on('new_notification', ({ message, type, data }) => {
      toast.info(message, { autoClose: 5000 });
      pushNotification({
        _id: `notif_${Date.now()}`,
        message,
        type: type || 'system',
        ...data,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token, pushNotification]);

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, isRead: true, read: true } : n)
      );
      setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
    } catch (error) {
      toast.error('Errore nel segnare la notifica come letta.');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
      setUnreadCount(0);
    } catch (error) {
      toast.error('Errore nel segnare tutte le notifiche come lette.');
    }
  };

  const setNavigate = useCallback((fn) => { navigateRef.current = fn; }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    setNavigate,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
