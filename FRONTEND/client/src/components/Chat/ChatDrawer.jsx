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

  const handleSend = (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !socketRef.current?.connected) return;
    const content = newMessage.trim();
    setNewMessage('');
    socketRef.current.emit('sendMessage', { chatId, content }, (ack) => {
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
      {/* Titolo chat */}
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
              <div
                key={msg._id || index}
                style={{
                  display: 'flex',
                  flexDirection: own ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  gap: '7px',
                  marginBottom: '4px',
                }}
              >
                {!own && (
                  <img
                    src={getHostAvatarUrl(msg.profileImage)}
                    alt={msg.username}
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                  />
                )}
                <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
                  {!own && (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#FF6B35', marginBottom: '2px', marginLeft: '4px' }}>
                      {msg.username}
                    </span>
                  )}
                  <div style={{
                    padding: '9px 13px',
                    borderRadius: own ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    background: own ? 'linear-gradient(135deg, #FF6B35, #ff8c5a)' : '#fff',
                    color: own ? '#fff' : '#1a1a2e',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
                    wordBreak: 'break-word',
                    fontSize: '14px',
                    lineHeight: 1.45,
                  }}>
                    <div>{msg.content}</div>
                    <div style={{ fontSize: '10px', opacity: 0.65, textAlign: 'right', marginTop: '3px' }}>
                      {new Date(msg.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

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
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Scrivi un messaggio…"
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
            transition: 'background 0.2s, transform 0.1s',
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

  // Chiudi con ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, handleClose]);

  // Blocca lo scroll del body quando il drawer è aperto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen && !closing) return null;

  const title = activeChatId ? '← Chat' : '💬 Chat';

  return (
    <>
      {/* Overlay */}
      <div
        className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Pannello */}
      <div
        className={`${styles.drawer} ${closing ? styles.drawerClosing : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Chat"
      >
        {/* Handle mobile */}
        <div className={styles.handle} onClick={handleClose} />

        {/* Header */}
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

        {/* Body */}
        <div className={styles.body}>
          {activeChatId
            ? <DrawerChat chatId={activeChatId} />
            : <ChatList onSelectChat={(id) => { const { openChat } = require('../../contexts/ChatDrawerContext'); }} />
          }
        </div>
      </div>
    </>
  );
};

export default ChatDrawer;
