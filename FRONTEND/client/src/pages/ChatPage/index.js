// File: src/pages/ChatPage/index.js (Versione Finale e Moderna)

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, Alert, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import chatService from '../../services/chatService';
import { getHostAvatarUrl } from '../../constants/mealConstants';
import styles from './ChatPage.module.css';
import { toast } from 'react-toastify';
import { IoSend } from 'react-icons/io5';
import BackButton from '../../components/common/BackButton';
import LeaveReportModal from '../../components/meals/LeaveReportModal';
import { sendLeaveReport } from '../../services/apiService';
import mealService from '../../services/mealService';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { API_URL } from '../../config/capacitorConfig';
import { playNotificationSound } from '../../utils/notificationSound';

const ChatPage = () => {
  const { t } = useTranslation();
  const params = useParams();
  
  let chatIdRaw = params.chatId;
  
  if (typeof chatIdRaw === 'string' && chatIdRaw.trim() !== '' && chatIdRaw !== 'undefined' && chatIdRaw !== 'null' && !chatIdRaw.includes('[object Object]')) {
    // stringa valida
  } else if (typeof chatIdRaw === 'object' && chatIdRaw !== null) {
    chatIdRaw = chatIdRaw._id || chatIdRaw.id || chatIdRaw.chatId || chatIdRaw.toString();
    console.warn('⚠️ [ChatPage] params.chatId era un oggetto, estratto:', chatIdRaw);
  }
  
  const chatId = String(chatIdRaw || '').trim();
  
  const isValidChatId = chatId && 
                        chatId !== 'undefined' && 
                        chatId !== 'null' && 
                        !chatId.includes('[object Object]') &&
                        chatId.length > 0;
  
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messageIdsRef = useRef(new Set());

  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  const currentUserId = user?._id || user?.id;
  const currentUserName = user?.nickname || user?.name || 'Tu';

  const [hostAvatar, setHostAvatar] = useState(null);
  const [participantsCount, setParticipantsCount] = useState(null);
  const [maxParticipants, setMaxParticipants] = useState(null);

  const normalizeMessage = (msg) => {
    const sender = msg.sender || msg.user || {};
    const senderId = sender._id || msg.userId;
    return {
      _id: msg._id || msg.id,
      sender,
      senderId,
      username: sender.nickname || msg.username || '',
      profileImage: sender.profileImage,
      content: msg.content,
      timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
    };
  };
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let showSub;
    const setupKeyboard = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          await Keyboard.setResizeMode({ mode: 'native' });
          showSub = Keyboard.addListener('keyboardDidShow', () => {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          });
        }
      } catch (error) {
        console.warn('[ChatPage] Errore nella configurazione della tastiera:', error);
      }
    };
    setupKeyboard();
    return () => { showSub?.remove?.(); };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchChatHistory = async () => {
      if (!isValidChatId) {
        setError(t('chat.loadError'));
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const chatData = await chatService.getChatById(chatId.trim());
        if (mounted) {
          setChat(chatData);
          const initial = (chatData.messages || []).map(normalizeMessage);
          setMessages(initial);
          messageIdsRef.current = new Set(initial.map(m => m._id).filter(Boolean));

          const countFromChat = Array.isArray(chatData.participants) ? chatData.participants.length : null;
          const maxFromChat = typeof chatData.maxParticipants === 'number' ? chatData.maxParticipants : null;
          if (countFromChat != null) setParticipantsCount(countFromChat);
          if (maxFromChat != null) setMaxParticipants(maxFromChat);

          if (chatData.mealId) {
            try {
              const meal = await mealService.getMealById(chatData.mealId);
              const mealObj = meal?.data || meal;
              if (mealObj) {
                setParticipantsCount(mealObj.participants?.length ?? participantsCount);
                setMaxParticipants(mealObj.maxParticipants ?? maxParticipants);
                const profileImage = mealObj.host?.profileImage;
                if (profileImage) setHostAvatar(getHostAvatarUrl(profileImage));
              }
            } catch (_) {}
          }
        }
      } catch (err) {
        if (mounted) {
          setError(t('chat.loadError'));
          toast.error(err.response?.data?.error || t('chat.loadError'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchChatHistory();

    if (!token) {
      setConnectionStatus('error');
      setError(t('chat.authRequired'));
      return;
    }

    const apiUrl = (process.env.REACT_APP_API_URL || API_URL || '').replace(/\/$/, '');
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');
    
    const socket = io(socketUrl, { 
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 15000,
      withCredentials: true
    });
        
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      if (chatId && typeof chatId === 'string' && chatId.trim() !== '') {
        socket.emit('joinChatRoom', chatId.trim());
      }
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[ChatPage] Errore connessione socket:', error);
      setConnectionStatus('error');
      setError(t('chat.connectionError'));
    });

    socket.on('reconnect', () => {
      setConnectionStatus('connected');
      if (chatId && typeof chatId === 'string' && chatId.trim() !== '') {
        socket.emit('joinChatRoom', chatId.trim());
      }
    });

    // Gestisce i messaggi in arrivo dagli ALTRI utenti
    // Suona per ogni messaggio ricevuto (non i propri)
    socket.on('receiveMessage', (message) => {
      const nm = normalizeMessage(message);
      const mid = nm._id;
      if (mid && messageIdsRef.current.has(mid)) return;
      if (mid) messageIdsRef.current.add(mid);
      setMessages(prev => [...prev, nm]);

      // Suona solo se il messaggio è di un altro utente
      const senderId = nm.senderId || nm.sender?._id;
      if (senderId && senderId.toString() !== (currentUserId || '').toString()) {
        playNotificationSound();
      }
    });

    socket.on('userTyping', ({ user: typingUser, isTyping }) => {
      if (!typingUser?._id) return;
      setTypingUsers(prev => {
        const exists = prev.find(u => u.userId === typingUser._id);
        if (isTyping) {
          if (exists) return prev;
          return [...prev, { userId: typingUser._id, username: typingUser.nickname }];
        }
        return prev.filter(u => u.userId !== typingUser._id);
      });
    });

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [chatId, token, t]);

  const handleTyping = () => {
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') return;
    const validChatId = chatId.trim();
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('typing', { chatId: validChatId, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('typing', { chatId: validChatId, isTyping: false });
        }
      }, 1000);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current?.connected) return;
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') return;

    const validChatId = chatId.trim();
    const contentToSend = newMessage.trim();
    setNewMessage('');

    socketRef.current.emit('sendMessage', { chatId: validChatId, content: contentToSend }, (ack) => {
      if (ack?.success && ack?.message) {
        const nm = normalizeMessage(ack.message);
        const mid = nm._id;
        if (mid && messageIdsRef.current.has(mid)) return;
        if (mid) messageIdsRef.current.add(mid);
        setMessages(prev => [...prev, nm]);
      } else if (ack?.error) {
        console.error('[ChatPage] Errore invio messaggio:', ack.error);
        toast.error(ack.error);
        setNewMessage(contentToSend);
      }
    });

    if (socketRef.current?.connected && validChatId) {
      socketRef.current.emit('typing', { chatId: validChatId, isTyping: false });
    }
  };

  const handleLeaveChatWithReason = async ({ reason, customReason }) => {
    try {
      if (isHost) {
        toast.info(t('chat.hostCannotLeave'));
        setShowLeaveModal(false);
        return;
      }
      await sendLeaveReport({ type: 'chat', id: chatId, reason, customReason });
      await chatService.leaveChat(chatId);
      toast.success(t('chat.leaveSuccess'));
      navigate('/meals');
    } catch (err) {
      const transient = err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED' || !err?.response;
      if (!transient) toast.error(t('chat.leaveError'));
      navigate('/meals');
    } finally {
      setShowLeaveModal(false);
    }
  };

  const hostId = chat?.mealId?.host?._id || chat?.mealId?.host || chat?.host?._id || chat?.host;
  const isHost = !!(chat && hostId && hostId.toString() === (currentUserId || '').toString());

  const handleCloseChat = async () => {
    try {
      await chatService.closeChat(chatId);
      toast.success(t('chat.closeSuccess'));
      navigate('/meals');
    } catch (err) {
      const transient = err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED' || !err?.response;
      if (!transient) toast.error(t('chat.closeError'));
      navigate('/meals');
    }
  };

  const loadChat = async () => {
    setError('');
    setLoading(true);
    if (!isValidChatId) {
      setError(t('chat.loadError'));
      setLoading(false);
      return;
    }
    try {
      const chatData = await chatService.getChatById(chatId.trim());
      setChat(chatData);
      const initial = (chatData.messages || []).map(normalizeMessage);
      setMessages(initial);
      messageIdsRef.current = new Set(initial.map(m => m._id).filter(Boolean));
      const countFromChat = Array.isArray(chatData.participants) ? chatData.participants.length : null;
      const maxFromChat = typeof chatData.maxParticipants === 'number' ? chatData.maxParticipants : null;
      if (countFromChat != null) setParticipantsCount(countFromChat);
      if (maxFromChat != null) setMaxParticipants(maxFromChat);
      if (chatData.mealId) {
        try {
          const meal = await mealService.getMealById(chatData.mealId);
          const mealObj = meal?.data || meal;
          if (mealObj) {
            setParticipantsCount(mealObj.participants?.length ?? participantsCount);
            setMaxParticipants(mealObj.maxParticipants ?? maxParticipants);
            const profileImage = mealObj.host?.profileImage;
            if (profileImage) setHostAvatar(getHostAvatarUrl(profileImage));
          }
        } catch (_) {}
      }
      setError('');
    } catch (err) {
      setError(t('chat.loadError'));
      toast.error(err.response?.data?.error || t('chat.loadError'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !chat) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
        <p className="mt-3">{t('chat.loading') || 'Caricamento...'}</p>
      </div>
    );
  }

  if (error && !chat) {
    return (
      <div className="text-center py-5">
        <Alert variant="danger">
          <Alert.Heading>{t('chat.errorTitle')}</Alert.Heading>
          <p>{error}</p>
          <Button onClick={loadChat} variant="primary" className="mt-2">{t('chat.retry') || 'Riprova'}</Button>
          <div className="mt-2"><BackButton /></div>
        </Alert>
      </div>
    );
  }
  
  if (!chat && !loading) {
    return (
      <div className="text-center py-5">
        <Alert variant="warning">
          <Alert.Heading>{t('chat.notFoundTitle')}</Alert.Heading>
          <p>{t('chat.notFoundMessage')}</p>
          <Button onClick={loadChat} variant="primary" className="mt-2">{t('chat.retry') || 'Riprova'}</Button>
          <div className="mt-2"><BackButton /></div>
        </Alert>
      </div>
    );
  }

  return (
    <div className={styles.chatPage}>
      {error && chat && (
        <Alert variant="warning" dismissible onClose={() => setError('')} className="m-2">
          <Alert.Heading>{t('chat.loadErrorButShowingOld') || 'Errore di caricamento'}</Alert.Heading>
          <p>{error}</p>
          <Button size="sm" onClick={loadChat} variant="outline-primary">{t('chat.retry') || 'Riprova'}</Button>
        </Alert>
      )}
      
      <div className={styles.chatHeader}>
        <BackButton className={styles.backButton} />
        <div className={styles.chatInfo}>
          <p className={styles.chatTitle}>{chat?.name || chat?.title || t('chat.subtitle')}</p>
          <div className={styles.headerMeta}>
            {hostAvatar && (
              <img src={hostAvatar} alt={t('profile.header.avatarAlt')} className={styles.headerAvatar} />
            )}
            {participantsCount != null && maxParticipants != null && (
              <span className={styles.participantsSummary}>
                {t('meals.detail.participantsText', { current: participantsCount, max: maxParticipants })}
              </span>
            )}
          </div>
        </div>
        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          {chat && isHost ? (
            <Button size="sm" variant="outline-danger" onClick={handleCloseChat}>{t('chat.close')}</Button>
          ) : chat ? (
            <Button size="sm" variant="outline-secondary" onClick={() => setShowLeaveModal(true)}>{t('chat.leave')}</Button>
          ) : null}
        </div>
      </div>

      <div className={styles.messagesContainer}>
        {messages && messages.length > 0 ? (
          messages.map((message, index) => (
            <div 
              key={message?._id || index} 
              className={`${styles.message} ${message?.senderId === currentUserId ? styles.ownMessage : styles.otherMessage}`}
            >
              <div className={styles.messageContent}>
                <div className={styles.messageHeader}>
                  <img 
                    src={getHostAvatarUrl(message?.user || message?.sender)} 
                    alt={t('chat.userAvatarAlt')}
                    className={styles.messageAvatar}
                  />
                  <span className={styles.messageAuthor}>{message?.username || message?.sender?.nickname || t('chat.unknownUser')}</span>
                  <span className={styles.messageTime}>
                    {message?.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>
                <div className={styles.messageText}>{message?.content || ''}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-muted">{t('chat.noMessagesYet') || 'Nessun messaggio ancora'}</div>
        )}
        
        {typingUsers.length > 0 && (
          <div className={styles.typingIndicator}>
            {typingUsers.map(user => user?.username || t('chat.unknownUser')).join(', ')} {t('chat.isTyping')}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className={styles.messageForm} style={{ pointerEvents: showLeaveModal ? 'none' : 'auto', opacity: showLeaveModal ? 0.4 : 1 }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          placeholder={t('chat.messagePlaceholder')}
          className={styles.messageInput}
          disabled={connectionStatus !== 'connected'}
          enterKeyHint="send"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        <button 
          type="submit" 
          className={styles.sendButton}
          disabled={!newMessage.trim() || connectionStatus !== 'connected'}
        >
          <IoSend />
        </button>
      </form>

      <LeaveReportModal
        show={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveChatWithReason}
        type="chat"
      />
    </div>
  );
};

export default ChatPage;
