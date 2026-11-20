// File: src/components/Chat/ChatDrawer.jsx
// Drawer globale chat in stile WhatsApp / Telegram / Messenger (palette Convivialità)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  Camera,
  CheckCheck,
  ImagePlus,
  Mic,
  Reply,
  Send,
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { useChatDrawer } from '../../contexts/ChatDrawerContext';
import chatService from '../../services/chatService';
import mealService from '../../services/mealService';
import { getMealCoverImageUrl, getHostAvatarUrl } from '../../constants/mealConstants';
import { API_URL } from '../../config/capacitorConfig';
import { playNotificationSound } from '../../utils/notificationSound';
import styles from './ChatDrawer.module.css';

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉'];
const GROUP_WINDOW_MS = 5 * 60 * 1000;

const getDayKey = (ts) => {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const formatDayLabel = (ts) => {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (getDayKey(d) === getDayKey(today)) return 'Oggi';
  if (getDayKey(d) === getDayKey(yesterday)) return 'Ieri';
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
};

const formatMsgTime = (ts) => {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};

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

      const enriched = await Promise.all(
        data.map(async (chat) => {
          const mealId = chat.mealId;
          if (!mealId) return chat;
          if (mealId?.imageUrl || mealId?.coverImage) return chat;
          const mealIdStr = typeof mealId === 'object' ? mealId._id : mealId;
          if (!mealIdStr) return chat;
          try {
            const meal = await mealService.getMealById(mealIdStr);
            if (meal?.imageUrl || meal?.coverImage) {
              return {
                ...chat,
                mealId: {
                  ...(typeof mealId === 'object' ? mealId : { _id: mealIdStr }),
                  imageUrl: meal.imageUrl || meal.coverImage,
                },
              };
            }
          } catch (_) {}
          return chat;
        })
      );

      setChats(enriched);
    } catch (_) {
      setError('Impossibile caricare le chat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    if (chat.mealId?.title) return chat.mealId.title;
    if (chat.participants?.length) {
      const others = chat.participants.filter(
        (p) => (p._id || p) !== (user?._id || user?.id)
      );
      if (others.length) return others.map((p) => p.nickname || 'Utente').join(', ');
    }
    return 'Chat di gruppo';
  };

  const getAvatarSrc = (chat) => {
    const mealImg = chat.mealId?.imageUrl || chat.mealId?.coverImage;
    if (mealImg) return getMealCoverImageUrl(mealImg);
    if (chat.participants?.length) {
      const other = chat.participants.find(
        (p) => (p._id || p) !== (user?._id || user?.id)
      );
      if (other?.profileImage) return getHostAvatarUrl(other.profileImage);
    }
    return '/assets/images/default-meal-placeholder.jpeg';
  };

  const formatListTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const diffDays = Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return formatMsgTime(d);
    if (diffDays === 1) return 'Ieri';
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>⏳</div>
        <p className={styles.emptyText}>Caricamento chat…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>{error}</p>
        <button type="button" onClick={fetchChats} className={styles.primaryCta}>
          Riprova
        </button>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>💬</div>
        <h3 className={styles.emptyTitle}>Nessuna chat attiva</h3>
        <p className={styles.emptyText}>
          Unisciti a un table2Talk per iniziare a chattare con gli altri partecipanti!
        </p>
        <button
          type="button"
          onClick={() => navigate('/meals')}
          className={styles.primaryCta}
        >
          Esplora i t2t
        </button>
      </div>
    );
  }

  return (
    <ul className={styles.chatList}>
      {chats.map((chat) => (
        <li
          key={chat._id}
          onClick={() => onSelectChat(chat._id, { name: getChatName(chat), avatar: getAvatarSrc(chat) })}
          className={`${styles.chatListItem} ${
            chat.unreadCount > 0 ? styles.chatListItemUnread : ''
          }`}
        >
          <div className={styles.chatListAvatarWrap}>
            <img
              src={getAvatarSrc(chat)}
              alt={getChatName(chat)}
              className={styles.chatListAvatar}
              loading="lazy"
              onError={(e) => {
                e.target.src = '/assets/images/default-meal-placeholder.jpeg';
              }}
            />
            {chat.unreadCount > 0 && (
              <span className={styles.unreadBadge}>
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
          <div className={styles.chatListInfo}>
            <div className={styles.chatListTop}>
              <span className={styles.chatListName}>{getChatName(chat)}</span>
              <span className={styles.chatListTime}>
                {formatListTime(chat.lastMessage?.timestamp || chat.updatedAt)}
              </span>
            </div>
            <p
              className={`${styles.chatListPreview} ${
                chat.unreadCount > 0 ? styles.chatListPreviewUnread : ''
              }`}
            >
              {chat.lastMessage?.content || 'Nessun messaggio ancora'}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
};

// ─────────────────────────────────────────────────────────────
// BUBBLE REPLY PREVIEW
// ─────────────────────────────────────────────────────────────
const ReplyPreview = ({ replyTo, own }) => {
  if (!replyTo?._id && !replyTo?.message) return null;
  return (
    <div className={`${styles.replyQuote} ${own ? styles.replyQuoteOwn : ''}`}>
      <div className={`${styles.replyQuoteName} ${own ? styles.replyQuoteNameOwn : ''}`}>
        {replyTo.senderName || 'Utente'}
      </div>
      <div className={`${styles.replyQuoteText} ${own ? styles.replyQuoteTextOwn : ''}`}>
        {replyTo.message}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SINGOLA RIGA MESSAGGIO (WhatsApp / Telegram / Messenger style)
// ─────────────────────────────────────────────────────────────
const MessageRow = ({
  msg,
  own,
  isFirstInGroup,
  isLastInGroup,
  currentUserId,
  onReply,
  onToggleReaction,
}) => {
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const touchStartX = useRef(null);
  const SWIPE_THRESHOLD = 60;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(true);
  };
  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const direction = own ? -1 : 1;
    const clamped = Math.max(0, Math.min(dx * direction, SWIPE_THRESHOLD + 10));
    setSwipeX(clamped);
  };
  const handleTouchEnd = () => {
    if (swipeX >= SWIPE_THRESHOLD) onReply(msg);
    setSwipeX(0);
    setSwiping(false);
    touchStartX.current = null;
  };

  const hasAttachments = Array.isArray(msg.attachments) && msg.attachments.length > 0;
  const trimmedMsg = (msg.content || '').trim();
  const isAttachmentPlaceholder =
    trimmedMsg === '📷 Foto' || trimmedMsg === '🎤 Messaggio vocale';
  const showText = msg.content && !(hasAttachments && isAttachmentPlaceholder);
  const reactions = msg.reactions || [];

  const hasReacted = (emoji) => {
    const r = reactions.find((item) => item.emoji === emoji);
    if (!r || !Array.isArray(r.users)) return false;
    return r.users.some((u) => String(u?._id || u) === String(currentUserId));
  };

  return (
    <div
      className={`${styles.msgRow} ${!isFirstInGroup ? styles.msgRowGrouped : ''} ${
        own ? styles.msgRowOwn : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`${styles.msgInner} ${own ? styles.msgInnerOwn : ''}`}
        style={{
          transform: swiping
            ? `translateX(${own ? -swipeX : swipeX}px)`
            : 'translateX(0)',
          transition: swiping ? 'none' : 'transform 0.22s ease',
        }}
      >
        {!own && (
          <div className={styles.avatarSlot}>
            {isLastInGroup && (
              <img
                src={getHostAvatarUrl(msg.profileImage)}
                alt={msg.username}
                className={styles.msgAvatar}
                loading="lazy"
              />
            )}
          </div>
        )}

        <div className={`${styles.bubbleCol} ${own ? styles.bubbleColOwn : ''}`}>
          <div className={`${styles.bubbleWrap} ${own ? styles.bubbleWrapOwn : ''}`}>
            <div
              className={`${styles.bubble} ${
                own
                  ? `${styles.bubbleOwn} ${!isFirstInGroup ? styles.bubbleOwnGrouped : ''}`
                  : `${styles.bubbleOther} ${!isFirstInGroup ? styles.bubbleOtherGrouped : ''}`
              }`}
            >
              {!own && isFirstInGroup && (
                <div className={styles.senderName}>{msg.username}</div>
              )}

              <ReplyPreview replyTo={msg.replyTo} own={own} />

              {hasAttachments && (
                <div className={styles.attachmentsWrap}>
                  {msg.attachments.map((att, idx) =>
                    att.type === 'audio' ? (
                      <div key={`${att.url}-${idx}`} className={styles.audioWrap}>
                        <audio
                          controls
                          preload="metadata"
                          src={att.url}
                          className={styles.audioPlayer}
                        />
                        {att.duration ? (
                          <span className={styles.audioDuration}>
                            🎤 {Math.floor(att.duration / 60)}:
                            {String(att.duration % 60).padStart(2, '0')}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <a
                        key={`${att.url}-${idx}`}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.attachmentLink}
                      >
                        <img
                          src={att.url}
                          alt={att.name || 'Foto in chat'}
                          loading="lazy"
                          className={`${styles.attachmentImg} ${
                            own ? styles.attachmentImgOwn : ''
                          }`}
                        />
                      </a>
                    )
                  )}
                </div>
              )}

              {showText && <div className={styles.msgText}>{msg.content}</div>}

              <div className={`${styles.msgMeta} ${own ? styles.msgMetaOwn : styles.msgMetaOther}`}>
                <span>{formatMsgTime(msg.timestamp)}</span>
                {own && <CheckCheck size={13} strokeWidth={2.2} aria-hidden="true" />}
              </div>
            </div>

            {/* Azioni rapide su hover (Reply + Emoji) */}
            <div className={styles.hoverActions}>
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => onReply(msg)}
                title="Rispondi"
                aria-label="Rispondi al messaggio"
              >
                <Reply size={14} />
              </button>
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => setShowPicker((v) => !v)}
                title="Aggiungi reazione"
                aria-label="Aggiungi reazione"
              >
                <SmilePlus size={14} />
              </button>
            </div>
          </div>

          {(reactions.length > 0 || showPicker) && (
            <div className={styles.reactionsRow}>
              {reactions.map((r) => {
                const count = r.count || r.users?.length || 0;
                if (!count) return null;
                return (
                  <button
                    type="button"
                    key={r.emoji}
                    onClick={() => onToggleReaction(msg._id, r.emoji)}
                    className={`${styles.reactionChip} ${
                      hasReacted(r.emoji) ? styles.reactionChipActive : ''
                    }`}
                  >
                    <span>{r.emoji}</span>
                    {count > 1 && <span className={styles.reactionCount}>{count}</span>}
                  </button>
                );
              })}

              {showPicker && (
                <div
                  className={`${styles.reactionPicker} ${
                    own ? styles.reactionPickerOwn : ''
                  }`}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      className={styles.reactionEmojiBtn}
                      onClick={() => {
                        onToggleReaction(msg._id, emoji);
                        setShowPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CONVERSAZIONE SINGOLA NEL DRAWER
// ─────────────────────────────────────────────────────────────
const DrawerChat = ({ chatId, onMetaLoaded }) => {
  const { user, token } = useAuth();
  const currentUserId = user?._id || user?.id;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingDurationRef = useRef(0);

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const normalizeMessage = useCallback((msg) => {
    const sender = msg.sender || msg.user || {};
    const senderId = sender._id || msg.userId;
    const attachments = Array.isArray(msg.attachments)
      ? msg.attachments.filter((a) => a && (a.type === 'image' || a.type === 'audio') && a.url)
      : [];
    return {
      _id: msg._id || msg.id,
      sender,
      senderId,
      username: sender.nickname || msg.username || 'Utente',
      profileImage: sender.profileImage || msg.profileImage || null,
      content: msg.content,
      attachments,
      replyTo: msg.replyTo || null,
      reactions: msg.reactions || [],
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

    let httpLoaded = false;

    const syncMessagesFromHttp = async (isInitial = false) => {
      try {
        const chatData = await chatService.getChatById(chatId);
        if (!mounted) return;
        httpLoaded = true;
        const fetched = (chatData.messages || []).map(normalizeMessage);
        if (isInitial) {
          setMessages(fetched);
          messageIdsRef.current = new Set(fetched.map((m) => m._id).filter(Boolean));
          if (onMetaLoaded) {
            onMetaLoaded({
              name: chatData?.name || chatData?.title || 'Chat',
              participantsCount: Array.isArray(chatData?.participants)
                ? chatData.participants.length
                : null,
              connectionStatus: 'connected',
            });
          }
        } else {
          const fresh = fetched.filter((m) => m._id && !messageIdsRef.current.has(m._id));
          if (fresh.length > 0) {
            fresh.forEach((m) => messageIdsRef.current.add(m._id));
            setMessages((prev) => [...prev, ...fresh]);
            const hasIncoming = fresh.some((nm) => {
              const sid = nm.senderId || nm.sender?._id;
              return sid && sid.toString() !== (currentUserId || '').toString();
            });
            if (hasIncoming) playNotificationSound();
          }
          if (onMetaLoaded) {
            onMetaLoaded((prev) => ({ ...prev, connectionStatus: 'connected' }));
          }
        }
      } catch (_) {
        // Ignorato: il prossimo ciclo o Socket.IO riproverà
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
      if (onMetaLoaded) onMetaLoaded((prev) => ({ ...prev, connectionStatus: 'connected' }));
      socket.emit('joinChatRoom', chatId);
    });
    socket.on('disconnect', () => {
      if (!httpLoaded && onMetaLoaded) {
        onMetaLoaded((prev) => ({ ...prev, connectionStatus: 'disconnected' }));
      }
    });
    socket.on('connect_error', (err) => {
      console.warn('[ChatDrawer] Socket.IO connect_error:', err?.message || err);
      if (!httpLoaded && onMetaLoaded) {
        onMetaLoaded((prev) => ({ ...prev, connectionStatus: 'disconnected' }));
      }
    });
    socket.on('reconnect', () => {
      if (onMetaLoaded) onMetaLoaded((prev) => ({ ...prev, connectionStatus: 'connected' }));
      socket.emit('joinChatRoom', chatId);
    });
    socket.on('receiveMessage', (message) => {
      const nm = normalizeMessage(message);
      const mid = nm._id;
      if (mid && messageIdsRef.current.has(mid)) return;
      if (mid) messageIdsRef.current.add(mid);
      setMessages((prev) => [...prev, nm]);
      const senderId = nm.senderId || nm.sender?._id;
      if (senderId && senderId.toString() !== (currentUserId || '').toString()) {
        playNotificationSound();
      }
    });

    socket.on('reactionUpdated', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    });

    const pollInterval = setInterval(() => {
      if (mounted && !socket.connected) {
        syncMessagesFromHttp(false);
      }
    }, 4000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [chatId, token, currentUserId, normalizeMessage, onMetaLoaded]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setReplyTo(null);
    };
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

  const handleToggleReaction = useCallback(
    (messageId, emoji) => {
      if (!socketRef.current?.connected) return;
      socketRef.current.emit('toggleReaction', { chatId, messageId, emoji });
    },
    [chatId]
  );

  const handleSelectPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Puoi allegare solo immagini.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La foto non può superare i 5MB.');
      return;
    }
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

  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !pendingFile) || uploading) {
      return;
    }

    const content = newMessage.trim();
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
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Errore nel caricamento della foto.');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    const payload = { chatId, content: content || '📷 Foto', attachments };
    if (replyTo) payload.replyTo = replyTo;
    setNewMessage('');
    setReplyTo(null);

    await dispatchPayload(payload, content);
  };

  const dispatchPayload = async (payload, restoreContent = '') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('sendMessage', payload, (ack) => {
        if (ack?.success && ack?.message) {
          const nm = normalizeMessage(ack.message);
          const mid = nm._id;
          if (mid && messageIdsRef.current.has(mid)) return;
          if (mid) messageIdsRef.current.add(mid);
          setMessages((prev) => [...prev, nm]);
        } else if (ack?.error) {
          toast.error(ack.error);
          if (restoreContent) setNewMessage(restoreContent);
        }
      });
    } else {
      try {
        const sent = await chatService.sendMessage(chatId, payload);
        if (sent) {
          const nm = normalizeMessage(sent);
          const mid = nm._id;
          if (!mid || !messageIdsRef.current.has(mid)) {
            if (mid) messageIdsRef.current.add(mid);
            setMessages((prev) => [...prev, nm]);
          }
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Errore nell’invio del messaggio.');
        if (restoreContent) setNewMessage(restoreContent);
      }
    }
  };

  const cleanupRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((t) => t.stop());
      recordingStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    recordingDurationRef.current = 0;
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const startRecording = async () => {
    if (uploading || isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('La registrazione vocale non è supportata su questo browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      audioChunksRef.current = [];
      recordingDurationRef.current = 0;

      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const chosenMime = mimeCandidates.find(
        (m) => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m)
      );
      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        recordingDurationRef.current += 1;
        setRecordingSeconds(recordingDurationRef.current);
      }, 1000);
    } catch (_) {
      toast.error('Consenti l’accesso al microfono per inviare messaggi vocali.');
      cleanupRecording();
    }
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      try { recorder.stop(); } catch (_) {}
    }
    cleanupRecording();
  };

  const stopAndSendRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      cleanupRecording();
      return;
    }
    const durationSec = Math.max(1, recordingDurationRef.current);
    const mimeType = recorder.mimeType || 'audio/webm';

    recorder.onstop = async () => {
      const chunks = [...audioChunksRef.current];
      cleanupRecording();
      if (chunks.length === 0) return;

      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) return;

      try {
        setUploading(true);
        const uploaded = await chatService.uploadChatAudio(chatId, blob, durationSec);
        if (uploaded?.url) {
          const payload = {
            chatId,
            content: '🎤 Messaggio vocale',
            attachments: [
              {
                type: 'audio',
                url: uploaded.url,
                name: uploaded.name || 'voice.webm',
                size: uploaded.size || blob.size,
                duration: uploaded.duration || durationSec,
              },
            ],
          };
          if (replyTo) {
            payload.replyTo = replyTo;
            setReplyTo(null);
          }
          await dispatchPayload(payload);
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Errore nell’invio del messaggio vocale.');
      } finally {
        setUploading(false);
      }
    };

    try {
      recorder.stop();
    } catch (_) {
      cleanupRecording();
    }
  };

  const canSend = (Boolean(newMessage.trim()) || Boolean(pendingFile)) && !uploading;

  return (
    <div className={styles.conversationShell}>
      <div className={styles.messagesCanvas}>
        {loading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⏳</div>
            <p className={styles.emptyText}>Caricamento messaggi…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💬</div>
            <h3 className={styles.emptyTitle}>Inizia la conversazione</h3>
            <p className={styles.emptyText}>
              Scrivi un messaggio o condividi una foto con i partecipanti del tuo table2Talk.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const own =
              (msg.senderId || msg.sender?._id)?.toString() ===
              (currentUserId || '').toString();
            const prev = index > 0 ? messages[index - 1] : null;
            const next = index < messages.length - 1 ? messages[index + 1] : null;

            const currDay = getDayKey(msg.timestamp);
            const prevDay = prev ? getDayKey(prev.timestamp) : null;
            const showDateDivider = currDay && currDay !== prevDay;

            const samePrevSender =
              prev &&
              !showDateDivider &&
              String(prev.senderId || prev.sender?._id || '') ===
                String(msg.senderId || msg.sender?._id || '') &&
              Math.abs(new Date(msg.timestamp) - new Date(prev.timestamp)) < GROUP_WINDOW_MS;

            const sameNextSender =
              next &&
              getDayKey(next.timestamp) === currDay &&
              String(next.senderId || next.sender?._id || '') ===
                String(msg.senderId || msg.sender?._id || '') &&
              Math.abs(new Date(next.timestamp) - new Date(msg.timestamp)) < GROUP_WINDOW_MS;

            return (
              <React.Fragment key={msg._id || index}>
                {showDateDivider && (
                  <div className={styles.dateDivider}>
                    <span className={styles.dateDividerPill}>
                      {formatDayLabel(msg.timestamp)}
                    </span>
                  </div>
                )}
                <MessageRow
                  msg={msg}
                  own={own}
                  isFirstInGroup={!samePrevSender}
                  isLastInGroup={!sameNextSender}
                  currentUserId={currentUserId}
                  onReply={handleReply}
                  onToggleReaction={handleToggleReaction}
                />
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className={styles.replyBanner}>
          <div className={styles.replyBannerBody}>
            <div className={styles.replyBannerAuthor}>{replyTo.senderName}</div>
            <div className={styles.replyBannerText}>{replyTo.message}</div>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            aria-label="Annulla risposta"
            className={styles.iconBtn}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {pendingPreview && (
        <div className={styles.pendingPhotoBar}>
          <div className={styles.pendingThumbWrap}>
            <img
              src={pendingPreview}
              alt="Anteprima foto"
              className={styles.pendingThumb}
            />
            <button
              type="button"
              onClick={clearPendingPhoto}
              aria-label="Rimuovi foto"
              className={styles.pendingRemoveBtn}
            >
              <X size={12} />
            </button>
          </div>
          <span className={styles.emptyText}>
            {uploading ? 'Caricamento foto…' : 'Foto pronta per l’invio'}
          </span>
        </div>
      )}

      <form onSubmit={handleSend} className={styles.composer}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleSelectPhoto}
          style={{ display: 'none' }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleSelectPhoto}
          style={{ display: 'none' }}
        />

        {isRecording ? (
          <>
            <button
              type="button"
              onClick={cancelRecording}
              aria-label="Annulla registrazione vocale"
              title="Annulla"
              className={styles.recordingCancelBtn}
            >
              <Trash2 size={18} />
            </button>
            <div className={styles.recordingBar}>
              <span className={styles.recordingDot} aria-hidden="true" />
              <span className={styles.recordingTimer}>
                {Math.floor(recordingSeconds / 60)}:
                {String(recordingSeconds % 60).padStart(2, '0')}
              </span>
              <span className={styles.recordingLabel}>Registrazione vocale…</span>
            </div>
            <button
              type="button"
              onClick={stopAndSendRecording}
              disabled={uploading}
              aria-label="Invia messaggio vocale"
              title="Invia messaggio vocale"
              className={styles.sendBtn}
            >
              <Send size={18} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Scegli foto dalla galleria"
              title="Foto dalla galleria"
              className={styles.attachBtn}
            >
              <ImagePlus size={19} />
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              aria-label="Scatta una foto"
              title="Scatta una foto"
              className={styles.attachBtn}
            >
              <Camera size={19} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
                if (e.key === 'Escape') setReplyTo(null);
              }}
              placeholder={
                uploading
                  ? 'Caricamento in corso…'
                  : replyTo
                  ? `Rispondi a ${replyTo.senderName}…`
                  : 'Scrivi un messaggio…'
              }
              disabled={uploading}
              className={styles.composerInput}
            />

            {canSend ? (
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Invia messaggio"
                className={styles.sendBtn}
              >
                <Send size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={uploading}
                aria-label="Registra messaggio vocale"
                title="Registra messaggio vocale"
                className={styles.sendBtn}
              >
                <Mic size={19} />
              </button>
            )}
          </>
        )}
      </form>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// DRAWER PRINCIPALE
// ─────────────────────────────────────────────────────────────
const ChatDrawer = () => {
  const { isOpen, activeChatId, openChat, closeDrawer, goToList } = useChatDrawer();
  const [closing, setClosing] = useState(false);
  const [activeMeta, setActiveMeta] = useState({
    name: 'Chat',
    avatar: null,
    participantsCount: null,
    connectionStatus: 'connecting',
  });

  const handleSelectChat = useCallback(
    (id, previewMeta) => {
      setActiveMeta({
        name: previewMeta?.name || 'Chat',
        avatar: previewMeta?.avatar || null,
        participantsCount: null,
        connectionStatus: 'connecting',
      });
      openChat(id);
    },
    [openChat]
  );

  const handleMetaUpdate = useCallback((update) => {
    setActiveMeta((prev) =>
      typeof update === 'function' ? update(prev) : { ...prev, ...update }
    );
  }, []);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      closeDrawer();
    }, 260);
  }, [closeDrawer]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
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
              <button
                type="button"
                className={styles.iconBtn}
                onClick={goToList}
                aria-label="Torna alla lista chat"
              >
                <ArrowLeft size={20} />
              </button>
            )}

            {activeChatId && activeMeta.avatar && (
              <img
                src={activeMeta.avatar}
                alt={activeMeta.name}
                className={styles.headerAvatar}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}

            <div className={styles.headerMeta}>
              <span className={styles.headerTitle}>
                {activeChatId ? activeMeta.name : '💬 Le tue chat'}
              </span>
              {activeChatId && (
                <span className={styles.headerSub}>
                  <span
                    className={
                      activeMeta.connectionStatus === 'connected'
                        ? styles.statusDotOnline
                        : styles.statusDotOffline
                    }
                  />
                  <span>
                    {activeMeta.connectionStatus === 'connected'
                      ? activeMeta.participantsCount
                        ? `Online · ${activeMeta.participantsCount} partecipanti`
                        : 'Online'
                      : 'Connessione…'}
                  </span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={handleClose}
            aria-label="Chiudi chat"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          {activeChatId ? (
            <DrawerChat chatId={activeChatId} onMetaLoaded={handleMetaUpdate} />
          ) : (
            <ChatList onSelectChat={handleSelectChat} />
          )}
        </div>
      </div>
    </>
  );
};

export default ChatDrawer;
