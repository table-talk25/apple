import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Send, MessageSquare } from 'lucide-react';
import { API_URL } from '../../config/capacitorConfig';
import { useAuth } from '../../contexts/AuthContext';
import mealService from '../../services/mealService';
import chatService from '../../services/chatService';
import styles from './VideoCall.module.css';

const normalizeMessage = (msg) => {
  if (!msg) return null;
  const senderObj = typeof msg.sender === 'object' && msg.sender !== null ? msg.sender : null;
  const senderId =
    msg.senderId ||
    senderObj?._id ||
    senderObj?.id ||
    (typeof msg.sender === 'string' ? msg.sender : null);
  const senderName =
    msg.username ||
    senderObj?.nickname ||
    senderObj?.name ||
    'Partecipante';
  return {
    _id: msg._id || msg.id || `${Date.now()}-${Math.random()}`,
    content: msg.content || msg.message || msg.text || '',
    senderId: senderId ? String(senderId) : '',
    senderName,
    createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
  };
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const VideoCallChat = ({ mealId, isVisible, onUnreadMessage }) => {
  const { user, token } = useAuth();
  const currentUserId = String(user?._id || user?.id || '');

  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const bottomRef = useRef(null);
  const isVisibleRef = useRef(isVisible);
  const onUnreadRef = useRef(onUnreadMessage);

  isVisibleRef.current = isVisible;
  onUnreadRef.current = onUnreadMessage;

  // 1. Resolve chatId from mealId
  useEffect(() => {
    let cancelled = false;
    if (!mealId) {
      setLoading(false);
      return undefined;
    }

    const resolveChatId = async () => {
      try {
        setLoading(true);
        setError('');
        const meal = await mealService.getMealById(mealId);
        if (cancelled) return;
        const resolved =
          (typeof meal?.chatId === 'object' ? meal.chatId?._id : meal?.chatId) ||
          (typeof meal?.chat === 'object' ? meal.chat?._id : meal?.chat) ||
          null;
        if (!resolved) {
          setError('Chat non disponibile per questo table2Talk.');
          setLoading(false);
          return;
        }
        setChatId(String(resolved));
      } catch (_) {
        if (!cancelled) {
          setError('Impossibile caricare la chat della stanza.');
          setLoading(false);
        }
      }
    };

    resolveChatId();
    return () => {
      cancelled = true;
    };
  }, [mealId]);

  // 2. Load history + connect Socket.IO to the persistent t2t chat room
  useEffect(() => {
    if (!chatId || !token) return undefined;

    let mounted = true;
    messageIdsRef.current = new Set();

    chatService
      .getChatById(chatId)
      .then((chatData) => {
        if (!mounted) return;
        const initial = (chatData?.messages || [])
          .map(normalizeMessage)
          .filter((m) => m && m.content);
        initial.forEach((m) => {
          if (m._id) messageIdsRef.current.add(String(m._id));
        });
        setMessages(initial);
      })
      .catch(() => {
        if (mounted) setError('Impossibile caricare i messaggi.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const apiUrl = (process.env.REACT_APP_API_URL || API_URL || '').replace(/\/$/, '');
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 15000,
      withCredentials: true,
    });
    socketRef.current = socket;

    const appendMessage = (raw) => {
      const nm = normalizeMessage(raw);
      if (!nm || !nm.content) return;
      const mid = String(nm._id);
      if (messageIdsRef.current.has(mid)) return;
      messageIdsRef.current.add(mid);
      setMessages((prev) => [...prev, nm]);
      if (
        !isVisibleRef.current &&
        nm.senderId &&
        nm.senderId !== currentUserId &&
        onUnreadRef.current
      ) {
        onUnreadRef.current();
      }
    };

    socket.on('connect', () => {
      if (!mounted) return;
      setConnected(true);
      socket.emit('joinChatRoom', chatId);
    });
    socket.on('reconnect', () => {
      if (!mounted) return;
      setConnected(true);
      socket.emit('joinChatRoom', chatId);
    });
    socket.on('disconnect', () => {
      if (mounted) setConnected(false);
    });
    socket.on('receiveMessage', appendMessage);

    return () => {
      mounted = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatId, token, currentUserId]);

  useEffect(() => {
    if (isVisible) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isVisible]);

  const handleSend = useCallback(
    (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const content = draft.trim();
      if (!content || !chatId || !socketRef.current?.connected) return;

      setDraft('');
      socketRef.current.emit('sendMessage', { chatId, content }, (ack) => {
        if (ack?.success && ack?.message) {
          const nm = normalizeMessage(ack.message);
          if (nm && !messageIdsRef.current.has(String(nm._id))) {
            messageIdsRef.current.add(String(nm._id));
            setMessages((prev) => [...prev, nm]);
          }
        } else if (ack?.error) {
          setDraft(content);
        }
      });
    },
    [draft, chatId]
  );

  if (!isVisible) return null;

  if (loading) {
    return (
      <div className={styles.chatPlaceholder}>
        <div className={styles.spinner} />
        <p className={styles.chatPlaceholderText}>Caricamento chat del t2t…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.chatPlaceholder}>
        <div className={styles.chatPlaceholderIcon}>
          <MessageSquare size={24} />
        </div>
        <p className={styles.chatPlaceholderText}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatMessages}>
        {messages.length === 0 ? (
          <div className={styles.chatPlaceholder}>
            <div className={styles.chatPlaceholderIcon}>
              <MessageSquare size={24} />
            </div>
            <h3 className={styles.chatPlaceholderTitle}>Chat del table2Talk</h3>
            <p className={styles.chatPlaceholderText}>
              I messaggi inviati qui restano salvati nella chat del tuo t2t anche dopo la chiamata.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = currentUserId && msg.senderId === currentUserId;
            return (
              <div
                key={msg._id}
                className={`${styles.chatBubbleRow} ${isMine ? styles.chatBubbleRowMine : ''}`}
              >
                <div
                  className={`${styles.chatBubble} ${
                    isMine ? styles.chatBubbleMine : styles.chatBubbleOther
                  }`}
                >
                  {!isMine && (
                    <div className={styles.chatSender}>{msg.senderName}</div>
                  )}
                  <div className={styles.chatText}>{msg.content}</div>
                  <div className={styles.chatTime}>{formatTime(msg.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className={styles.chatInputBar} onSubmit={handleSend}>
        <input
          type="text"
          className={styles.chatInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            connected ? 'Scrivi un messaggio…' : 'Connessione alla chat…'
          }
          aria-label="Scrivi un messaggio in chat"
          disabled={!connected}
        />
        <button
          type="submit"
          className={styles.chatSendBtn}
          disabled={!draft.trim() || !connected}
          aria-label="Invia messaggio"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default VideoCallChat;
