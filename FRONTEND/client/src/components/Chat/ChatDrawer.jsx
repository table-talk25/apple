// File: src/components/Chat/ChatDrawer.jsx
// Popup/drawer globale per le chat, apribile da qualsiasi pagina

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { useChatDrawer } from '../../contexts/ChatDrawerContext';
import chatService from '../../services/chatService';
import { getHostAvatarUrl } from '../../constants/mealConstants';
import { API_URL } from '../../config/capacitorConfig';
import { IoSend } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { playNotificationSound } from '../../utils/notificationSound';
import styles from './ChatDrawer.module.css';

// ─────────────────────────────────────────────────────────────
// VISTA LISTA CHAT
// ─────────────────────────────────────────────────────────────
const ChatList = ({ onSelectChat }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await chatService.getUserChats();
      setChats(data);
    } catch {
      setError('Impossibile caricare le chat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    if (chat.mealId?.title) return chat.mealId.title;
    const others = (chat.participants || []).filter(
      p => (p._id || p).toString() !== (user?._id || user?.id || '').toString()
    );
    if (others.length > 0) return others.map(p => p.nickname || 'Utente').join(', ');
    return 'Chat';
  };

  const getAvatarSrc = (chat) => {
    const others = (chat.participants || []).filter(
      p => (p._id || p).toString() !== (user?._id || user?.id || '').toString()
    );
    if (others.length === 1 && others[0].profileImage) {
      return getHostAvatarUrl(others[0].profileImage);
    }
    return getHostAvatarUrl(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '3rem' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 32, height: 32,
          border: '3px solid #e2e8f0',
          borderTopColor: '#FF6B35',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite'
        }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#718096' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
        <p style={{ marginBottom: '1rem' }}>{error}</p>
        <button
          onClick={fetchChats}
          style={{ background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 600 }}
        >
          Riprova
        </button>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#718096' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
        <p style={{ fontWeight: 600, color: '#4a5568', marginBottom: '0.4rem' }}>Nessuna chat attiva</p>
        <p style={{ fontSize: '0.875rem', maxWidth: '30ch', margin: '0 auto 1.5rem' }}>
          Le tue chat appariranno qui quando parteciperai a un TableTalk®.
        </p>
        <button
          onClick={() => navigate('/meals')}
          style={{ background: '#FF6B35', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 600 }}
        >
          Esplora i TableTalk®
        </button>
      </div>
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flex: 1 }}>
      {chats.map((chat) => (
        <li
          key={chat._id}
          onClick={() => onSelectChat(chat._id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.9rem',
            padding: '0.85rem 1.1rem',
            cursor: 'pointer',
            borderBottom: '1px solid #f0f0f0',
            background: chat.unreadCount > 0 ? '#fff8f5' : '#fff',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f7f8fc'}
          onMouseLeave={e => e.currentTarget.style.background = chat.unreadCount > 0 ? '#fff8f5' : '#fff'}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={getAvatarSrc(chat)}
              alt="avatar"
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0', display: 'block' }}
              loading="lazy"
            />
            {chat.unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                background: '#FF6B35', color: '#fff',
                fontSize: '0.65rem', fontWeight: 700,
                borderRadius: '9999px', padding: '2px 5px',
                minWidth: 18, textAlign: 'center', lineHeight: 1.3,
                border: '2px solid #fff',
              }}>
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.15rem' }}>
              <span style={{ fontWeight: chat.unreadCount > 0 ? 700 : 600, fontSize: '0.93rem', color: '#1a202c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getChatName(chat)}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#a0aec0', flexShrink: 0 }}>
                {formatTime(chat.lastMessage?.timestamp || chat.updatedAt)}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: chat.unreadCount > 0 ? '#4a5568' : '#718096', fontWeight: chat.unreadCount > 0 ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
              {chat.lastMessage?.content || 'Nessun messaggio ancora'}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
};

// ─────────────────────────────────────────────────────────────
// BUBBLE REPLY PREVIEW (inline, dentro la bubble del messaggio)
// ─────────────────────────────────────────────────────────────
const ReplyPreview = ({ replyTo, own }) => {
  if (!replyTo?._id && !replyTo?.message) return null;
  return (
    <div style={{
      borderLeft: `3px solid ${own ? 'rgba(255,255,255,0.55)' : '#FF6B35'}`,
      paddingLeft: 8,
      marginBottom: 6,
      opacity: 0.85,
      fontSize: 12,
      borderRadius: '0 4px 4px 0',
      background: own ? 'rgba(255,255,255,0.12)' : 'rgba(255,107,53,0.07)',
      padding: '4px 8px',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 1, color: own ? 'rgba(255,255,255,0.9)' : '#FF6B35', fontSize: 11 }}>
        {replyTo.senderName || 'Utente'}
      </div>
      <div style={{
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        maxWidth: 220,
        color: own ? 'rgba(255,255,255,0.8)' : '#555',
      }}>
        {replyTo.message}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VISTA SINGOLA CHAT
// ─────────────────────────────────────────────────────────────
const DrawerChat = ({ chatId }) => {
  const { user, token } = useAuth();
  const currentUserId = user?._id || user?.id;

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [replyTo, setReplyTo] = useState(null); // { _id, senderName, message }
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const inputRef = useRef(null);

  const normalizeMessage = useCallback((msg) => {
    const sender = msg.sender || msg.user || {};
    const senderId = sender._id || msg.userId;
    return {
      _id: msg._id || msg.id,
      sender,
      senderId,
      username: sender.nickname || msg.username || 'Utente',
      profileImage: sender.profileImage || msg.profileImage || null,
      content: msg.content,
      replyTo: msg.replyTo || null,
      timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setMessages([]);
    setReplyTo(null);
    messageIdsRef.current = new Set();

    chatService.getChatById(chatId)
      .then((chatData) => {
        if (!mounted) return;
        setChat(chatData);
        const initial = (chatData.messages || []).map(normalizeMessage);
        setMessages(initial);
        messageIdsRef.current = new Set(initial.map(m => m._id).filter(Boolean));
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });

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

    socket.on('connect', () => {
      setConnectionStatus('connected');
      socket.emit('joinChatRoom', chatId);
    });
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    socket.on('connect_error', () => setConnectionStatus('error'));
    socket.on('reconnect', () => {
      setConnectionStatus('connected');
      socket.emit('joinChatRoom', chatId);
    });
    socket.on('receiveMessage', (message) => {
      const nm = normalizeMessage(message);
      const mid = nm._id;
      if (mid && messageIdsRef.current.has(mid)) return;
      if (mid) messageIdsRef.current.add(mid);
      setMessages(prev => [...prev, nm]);
      const senderId = nm.senderId || nm.sender?._id;
      if (senderId && senderId.toString() !== (currentUserId || '').toString()) {
        playNotificationSound();
      }
    });

    return () => {
      mounted = false;
      socket.disconnect();
    };
  }, [chatId, token, currentUserId, normalizeMessage]);

  // ESC annulla reply
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setReplyTo(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleReply = useCallback((msg) => {
    setReplyTo({
      _id: msg._id,
      senderName: msg.username || 'Utente',
      message: msg.content,
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !socketRef.current?.connected) return;
    const content = newMessage.trim();
    const payload = { chatId, content };
    if (replyTo) payload.replyTo = replyTo;
    setNewMessage('');
    setReplyTo(null);
    socketRef.current.emit('sendMessage', payload, (ack) => {
      if (ack?.success && ack?.message) {
        const nm = normalizeMessage(ack.message);
        const mid = nm._id;
        if (mid && messageIdsRef.current.has(mid)) return;
        if (mid) messageIdsRef.current.add(mid);
        setMessages(prev => [...prev, nm]);
      } else if (ack?.error) {
        toast.error(ack.error);
        setNewMessage(content);
      }
    });
  };

  const chatName = chat?.name || chat?.title || 'Chat';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Sub-header con nome chat e stato connessione */}
      <div style={{ padding: '6px 16px 8px', background: '#fff8f5', borderBottom: '1px solid #fde5d7', flexShrink: 0 }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#FF6B35' }}>{chatName}</span>
        {connectionStatus === 'disconnected' && (
          <span style={{ marginLeft: 8, fontSize: '0.72rem', color: '#e53e3e' }}>● Disconnesso</span>
        )}
        {connectionStatus === 'connected' && (
          <span style={{ marginLeft: 8, fontSize: '0.72rem', color: '#38a169' }}>● Connesso</span>
        )}
      </div>

      {/* Messaggi */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 10px',
        background: '#f7f8fa', display: 'flex', flexDirection: 'column', gap: '4px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            Caricamento…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', fontSize: '14px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
            Nessun messaggio ancora.<br />Inizia la conversazione!
          </div>
        ) : (
          messages.map((msg, index) => {
            const own = (msg.senderId || msg.sender?._id)?.toString() === (currentUserId || '').toString();
            return (
              <MessageRow
                key={msg._id || index}
                msg={msg}
                own={own}
                onReply={handleReply}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply banner */}
      {replyTo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 12px',
          background: '#fff0eb',
          borderTop: '1px solid #ffd5c2',
          fontSize: 13,
          color: '#444',
          flexShrink: 0,
        }}>
          <span style={{ color: '#FF6B35', fontWeight: 700, flexShrink: 0, fontSize: 15 }}>↩</span>
          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
            <span style={{ fontWeight: 700, color: '#FF6B35', fontSize: 12 }}>{replyTo.senderName}</span>
            <span style={{
              marginLeft: 6, fontSize: 12, color: '#666',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              display: 'inline-block', maxWidth: 200, verticalAlign: 'bottom',
            }}>
              {replyTo.message}
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            aria-label="Annulla risposta"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 16, color: '#aaa', padding: '0 4px', lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 12px', borderTop: '1px solid #e9ecef',
          background: '#fff', flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            if (e.key === 'Escape') setReplyTo(null);
          }}
          placeholder={replyTo ? `Rispondi a ${replyTo.senderName}…` : 'Scrivi un messaggio…'}
          disabled={connectionStatus !== 'connected'}
          style={{
            flex: 1, padding: '9px 15px',
            border: '1.5px solid #e9ecef', borderRadius: '20px',
            outline: 'none', fontSize: '14px', background: '#f7f8fa',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = '#FF6B35'}
          onBlur={e => e.target.style.borderColor = '#e9ecef'}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || connectionStatus !== 'connected'}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: newMessage.trim() ? 'linear-gradient(135deg, #FF6B35, #ff8c5a)' : '#e9ecef',
            color: '#fff', border: 'none',
            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', flexShrink: 0,
            transition: 'background 0.2s',
            boxShadow: newMessage.trim() ? '0 2px 8px rgba(255,107,53,0.3)' : 'none',
          }}
        >
          <IoSend />
        </button>
      </form>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SINGOLA RIGA MESSAGGIO con pulsante reply e swipe mobile
// ─────────────────────────────────────────────────────────────
const MessageRow = ({ msg, own, onReply }) => {
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartX = useRef(null);
  const SWIPE_THRESHOLD = 60;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(true);
  };
  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    // Swipe verso destra per i propri messaggi, sinistra per gli altri
    const direction = own ? -1 : 1;
    const clamped = Math.max(0, Math.min(dx * direction, SWIPE_THRESHOLD + 10));
    setSwipeX(clamped);
  };
  const handleTouchEnd = () => {
    if (swipeX >= SWIPE_THRESHOLD) {
      onReply(msg);
    }
    setSwipeX(0);
    setSwiping(false);
    touchStartX.current = null;
  };

  const swipeProgress = Math.min(swipeX / SWIPE_THRESHOLD, 1);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: own ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: '7px',
        marginBottom: '4px',
        position: 'relative',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Icona reply che appare durante lo swipe */}
      {swiping && swipeX > 8 && (
        <div style={{
          position: 'absolute',
          [own ? 'left' : 'right']: 4,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: swipeProgress,
          fontSize: 18,
          color: '#FF6B35',
          transition: 'opacity 0.1s',
          pointerEvents: 'none',
        }}>
          ↩
        </div>
      )}

      {/* Contenuto del messaggio traslato durante swipe */}
      <div style={{
        display: 'flex',
        flexDirection: own ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: '7px',
        flex: 1,
        transform: swiping ? `translateX(${own ? -swipeX : swipeX}px)` : 'translateX(0)',
        transition: swiping ? 'none' : 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
      }}>
        {!own && (
          <img
            src={getHostAvatarUrl(msg.profileImage)}
            alt={msg.username}
            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          />
        )}
        <div style={{
          maxWidth: '75%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: own ? 'flex-end' : 'flex-start',
        }}>
          {!own && (
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#FF6B35', marginBottom: '2px', marginLeft: '4px' }}>
              {msg.username}
            </span>
          )}

          {/* Bubble */}
          <div
            style={{
              padding: '9px 13px',
              borderRadius: own ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              background: own ? 'linear-gradient(135deg, #FF6B35, #ff8c5a)' : '#fff',
              color: own ? '#fff' : '#1a1a2e',
              boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
              wordBreak: 'break-word',
              fontSize: '14px',
              lineHeight: 1.45,
            }}
          >
            {/* Quote preview */}
            <ReplyPreview replyTo={msg.replyTo} own={own} />

            <div>{msg.content}</div>
            <div style={{ fontSize: '10px', opacity: 0.65, textAlign: 'right', marginTop: '3px' }}>
              {new Date(msg.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Pulsante Rispondi (desktop hover) */}
          <button
            onClick={() => onReply(msg)}
            title="Rispondi"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', color: '#bbb',
              padding: '2px 6px', marginTop: '2px',
              borderRadius: '8px',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#FF6B35'; e.currentTarget.style.background = '#fff0eb'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#bbb'; e.currentTarget.style.background = 'none'; }}
          >
            ↩ Rispondi
          </button>
        </div>
      </div>
    </div>
  );
};

// Wrapper che accede al context per passare openChat alla lista
const ChatListWrapper = () => {
  const { openChat } = useChatDrawer();
  return <ChatList onSelectChat={openChat} />;
};

// ─────────────────────────────────────────────────────────────
// DRAWER PRINCIPALE
// ─────────────────────────────────────────────────────────────
const ChatDrawer = () => {
  const { isOpen, activeChatId, closeDrawer, goToList } = useChatDrawer();
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      closeDrawer();
    }, 290);
  }, [closeDrawer]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen && !closing) return null;

  return (
    <>
      <div
        className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className={`${styles.drawer} ${closing ? styles.drawerClosing : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Chat"
      >
        <div className={styles.handle} onClick={handleClose} />

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {activeChatId && (
              <button className={styles.backBtn} onClick={goToList} aria-label="Torna alla lista">
                ←
              </button>
            )}
            <span className={styles.headerTitle}>
              {activeChatId ? 'Chat' : '💬 Chat'}
            </span>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Chiudi chat">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {activeChatId
            ? <DrawerChat chatId={activeChatId} />
            : <ChatListWrapper />
          }
        </div>
      </div>
    </>
  );
};

export default ChatDrawer;
