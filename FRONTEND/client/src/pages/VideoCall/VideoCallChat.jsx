import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Send, MessageSquare, ImagePlus, X } from 'lucide-react';
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
  const attachments = Array.isArray(msg.attachments)
    ? msg.attachments.filter((a) => a && a.type === 'image' && a.url)
    : [];
  return {
    _id: msg._id || msg.id || `${Date.now()}-${Math.random()}`,
    content: msg.content || msg.message || msg.text || '',
    attachments,
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
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const bottomRef = useRef(null);
  const isVisibleRef = useRef(isVisible);
  const onUnreadRef = useRef(onUnreadMessage);

  isVisibleRef.current = isVisible;
  onUnreadRef.current = onUnreadMessage;

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

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

    const appendMessage = (raw) => {
      const nm = normalizeMessage(raw);
      if (!nm || (!nm.content && nm.attachments.length === 0)) return;
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

    const syncMessagesFromHttp = async (isInitial = false) => {
      try {
        const chatData = await chatService.getChatById(chatId);
        if (!mounted) return;
        const fetched = (chatData?.messages || [])
          .map(normalizeMessage)
          .filter((m) => m && (m.content || m.attachments.length > 0));
        if (isInitial) {
          fetched.forEach((m) => {
            if (m._id) messageIdsRef.current.add(String(m._id));
          });
          setMessages(fetched);
        } else {
          fetched.forEach((m) => {
            const mid = String(m._id);
            if (!messageIdsRef.current.has(mid)) {
              appendMessage(m);
            }
          });
        }
      } catch (_) {
        if (isInitial && mounted) setError('Impossibile caricare i messaggi.');
      } finally {
        if (isInitial && mounted) setLoading(false);
      }
    };

    syncMessagesFromHttp(true);

    const apiUrl = (API_URL || process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 15000,
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (!mounted) return;
      socket.emit('joinChatRoom', chatId);
    });
    socket.on('reconnect', () => {
      if (!mounted) return;
      socket.emit('joinChatRoom', chatId);
    });
    socket.on('connect_error', (err) => {
      console.warn('[VideoCallChat] Socket.IO connect_error:', err?.message || err);
    });
    socket.on('receiveMessage', appendMessage);

    const pollInterval = setInterval(() => {
      if (mounted && !socket.connected) {
        syncMessagesFromHttp(false);
      }
    }, 4000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatId, token, currentUserId]);

  useEffect(() => {
    if (isVisible) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isVisible]);

  const handleSelectPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const clearPendingPhoto = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  };

  const handleSend = useCallback(
    async (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const content = draft.trim();
      if ((!content && !pendingFile) || !chatId || uploading) {
        return;
      }

      let attachments = [];
      if (pendingFile) {
        try {
          setUploading(true);
          const uploaded = await chatService.uploadChatImage(chatId, pendingFile);
          if (uploaded?.url) {
            attachments = [
              {
                type: 'image',
                url: uploaded.url,
                name: uploaded.name || pendingFile.name,
                size: uploaded.size || pendingFile.size,
              },
            ];
          }
          clearPendingPhoto();
        } catch (_) {
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      setDraft('');
      const payload = { chatId, content: content || '📷 Foto', attachments };
      if (socketRef.current?.connected) {
        socketRef.current.emit('sendMessage', payload, (ack) => {
          if (ack?.success && ack?.message) {
            const nm = normalizeMessage(ack.message);
            if (nm && !messageIdsRef.current.has(String(nm._id))) {
              messageIdsRef.current.add(String(nm._id));
              setMessages((prev) => [...prev, nm]);
            }
          } else if (ack?.error && content) {
            setDraft(content);
          }
        });
      } else {
        try {
          const sent = await chatService.sendMessage(chatId, payload);
          const nm = normalizeMessage(sent);
          if (nm && !messageIdsRef.current.has(String(nm._id))) {
            messageIdsRef.current.add(String(nm._id));
            setMessages((prev) => [...prev, nm]);
          }
        } catch (_) {
          if (content) setDraft(content);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, pendingFile, chatId, uploading]
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
              I messaggi e le foto inviati qui restano salvati nella chat del tuo t2t anche dopo la chiamata.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = currentUserId && msg.senderId === currentUserId;
            const showText =
              msg.content &&
              !(msg.attachments.length > 0 && msg.content.trim() === '📷 Foto');
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
                  {msg.attachments.length > 0 && (
                    <div className={styles.chatAttachments}>
                      {msg.attachments.map((att, idx) => (
                        <a
                          key={`${att.url}-${idx}`}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={att.url}
                            alt={att.name || 'Foto in chat'}
                            className={styles.chatAttachmentImg}
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {showText && <div className={styles.chatText}>{msg.content}</div>}
                  <div className={styles.chatTime}>{formatTime(msg.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {pendingPreview && (
        <div className={styles.chatPendingWrap}>
          <img
            src={pendingPreview}
            alt="Anteprima foto"
            className={styles.chatPendingThumb}
          />
          <button
            type="button"
            className={styles.chatPendingRemove}
            onClick={clearPendingPhoto}
            aria-label="Rimuovi foto selezionata"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <form className={styles.chatInputBar} onSubmit={handleSend}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleSelectPhoto}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className={styles.chatPhotoBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Allega una foto"
          title="Allega una foto"
        >
          <ImagePlus size={18} />
        </button>
        <input
          type="text"
          className={styles.chatInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={uploading ? 'Caricamento foto…' : 'Scrivi un messaggio…'}
          aria-label="Scrivi un messaggio in chat"
          disabled={uploading}
        />
        <button
          type="submit"
          className={styles.chatSendBtn}
          disabled={(!draft.trim() && !pendingFile) || uploading}
          aria-label="Invia messaggio"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default VideoCallChat;
