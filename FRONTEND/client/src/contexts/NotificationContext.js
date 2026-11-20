import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import notificationService from '../services/notificationService';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { API_URL } from '../config/capacitorConfig';
import { useNavigate } from 'react-router-dom';
import { playNotificationSound } from '../utils/notificationSound';

export const NotificationContext = createContext();

const getNotifTime = (n) => {
  const raw = n?.createdAt || n?.date || n?.timestamp || 0;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : 0;
};

const sortByNewest = (list) => [...list].sort((a, b) => getNotifTime(b) - getNotifTime(a));

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const navigateRef = useRef(null);
  const seenChatNotifIdsRef = useRef(new Set());
  const initialFetchedRef = useRef(false);

  const showChatToast = useCallback(({ senderName, preview, chatId }) => {
    playNotificationSound();
    toast(
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '2px 0',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c2513e 0%, #b54735 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(181, 71, 53, 0.28)',
          }}
          aria-hidden="true"
        >
          💬
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: '0.9rem',
              color: '#b54735',
              lineHeight: 1.25,
              marginBottom: '2px',
            }}
          >
            {senderName || 'Nuovo messaggio'}
          </div>
          <div
            style={{
              fontSize: '0.86rem',
              color: '#242824',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.35,
            }}
          >
            {preview}
          </div>
          <div
            style={{
              fontSize: '0.72rem',
              color: '#7c837d',
              marginTop: '2px',
            }}
          >
            Tocca per rispondere
          </div>
        </div>
      </div>,
      {
        autoClose: 5500,
        icon: false,
        style: {
          background: '#FAF7F2',
          borderLeft: '4px solid #B54735',
          borderRadius: '14px',
          boxShadow: '0 10px 28px rgba(36, 40, 36, 0.16)',
          color: '#242824',
          cursor: 'pointer',
        },
        progressStyle: {
          background: '#B54735',
        },
        onClick: () => {
          if (navigateRef.current && chatId) navigateRef.current(`/chat/${chatId}`);
        },
      }
    );
  }, []);

  // Helper: aggiungi una notifica in ordine cronologico (più recente in alto)
  const pushNotification = useCallback((notif) => {
    setNotifications(prev => sortByNewest([notif, ...prev]));
    setUnreadCount(prev => prev + 1);
    playNotificationSound();
  }, []);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      seenChatNotifIdsRef.current = new Set();
      initialFetchedRef.current = false;
      return;
    }
    if (!silent) setLoading(true);
    try {
      const list = await notificationService.getNotifications();
      if (Array.isArray(list)) {
        const sorted = sortByNewest(list);
        if (initialFetchedRef.current) {
          // Segnala con toast terracotta + bling eventuali nuovi messaggi chat arrivati
          const freshUnreadChats = sorted.filter(
            (n) =>
              n.type === 'new_message' &&
              !(n.isRead || n.read) &&
              n._id &&
              !seenChatNotifIdsRef.current.has(n._id)
          );
          freshUnreadChats.forEach((n) => {
            seenChatNotifIdsRef.current.add(n._id);
            showChatToast({
              senderName: n.senderName || 'Nuovo messaggio',
              preview: n.preview || n.message,
              chatId: n.chatId,
            });
          });
        } else {
          sorted.forEach((n) => {
            if (n._id) seenChatNotifIdsRef.current.add(n._id);
          });
          initialFetchedRef.current = true;
        }
        setNotifications(sorted);
        setUnreadCount(sorted.filter(n => !(n.isRead || n.read)).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      if (!silent) console.error('[NotificationContext] Errore caricamento notifiche:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isAuthenticated, showChatToast]);

  useEffect(() => {
    fetchNotifications(false);
  }, [fetchNotifications]);

  // Polling leggero di riserva ogni 10s così le notifiche chat arrivano sempre
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const apiUrl = (API_URL || process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      withCredentials: true,
    });
    socketRef.current = socket;

    // ── 1. Messaggio in chat (utente NON nella chat room) ─────────────
    socket.on('new_chat_message_alert', ({ senderName, preview, chatId }) => {
      const msg = `💬 ${senderName}: ${preview}`;
      const id = `chat_rt_${chatId}_${Date.now()}`;
      seenChatNotifIdsRef.current.add(id);
      showChatToast({ senderName, preview, chatId });
      setNotifications((prev) =>
        sortByNewest([
          {
            _id: id,
            message: msg,
            type: 'new_message',
            chatId,
            senderName,
            preview,
            isRead: false,
            read: false,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ])
      );
      setUnreadCount((prev) => prev + 1);
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
  }, [isAuthenticated, token, pushNotification, showChatToast]);

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
