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

const ChatPage = () => {
  const { t } = useTranslation();
  const params = useParams();
  
  // Normalizza chatId: estrai la stringa dall'oggetto params con logica più robusta
  let chatIdRaw = params.chatId;
  
  // Se è già una stringa valida, usala direttamente
  if (typeof chatIdRaw === 'string' && chatIdRaw.trim() !== '' && chatIdRaw !== 'undefined' && chatIdRaw !== 'null' && !chatIdRaw.includes('[object Object]')) {
    // È una stringa valida
  } else if (typeof chatIdRaw === 'object' && chatIdRaw !== null) {
    // Se è un oggetto, prova a estrarre l'ID
    chatIdRaw = chatIdRaw._id || chatIdRaw.id || chatIdRaw.chatId || chatIdRaw.toString();
    console.warn('⚠️ [ChatPage] params.chatId era un oggetto, estratto:', chatIdRaw);
  }
  
  // Converti sempre in stringa e rimuovi valori invalidi
  const chatId = String(chatIdRaw || '').trim();
  
  // Validazione finale: controlla se è valido
  const isValidChatId = chatId && 
                        chatId !== 'undefined' && 
                        chatId !== 'null' && 
                        !chatId.includes('[object Object]') &&
                        chatId.length > 0;
  
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Log per debug
  console.log('[ChatPage] params completo:', params);
  console.log('[ChatPage] chatIdRaw originale:', chatIdRaw);
  console.log('[ChatPage] chatId normalizzato:', chatId);
  console.log('[ChatPage] chatId valido?', isValidChatId);

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messageIdsRef = useRef(new Set());

  console.log(`[DEBUG] Render - Stato Connessione: ${connectionStatus}`);


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

  // Effetto per lo scroll automatico 
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Gestione tastiera mobile: usa 'native' per ridimensionamento automatico della WebView
  useEffect(() => {
    let showSub;
    
    const setupKeyboard = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // 'native' ridimensiona l'intera WebView visibile quando appare la tastiera
          await Keyboard.setResizeMode({ mode: 'native' });
          
          // Quando la tastiera si apre, scrolla in fondo per vedere l'ultimo messaggio
          showSub = Keyboard.addListener('keyboardDidShow', () => {
            // Aspetta che la WebView si sia ridimensionata, poi scrolla
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
    
    return () => {
      showSub?.remove?.();
    };
  }, []);

  // Effetto principale per dati e socket 
  useEffect(() => {
    let mounted = true;

    const fetchChatHistory = async () => {
      // Validazione chatId: deve essere una stringa valida
      if (!isValidChatId) {
        console.error('[ChatPage] ERRORE: chatId non valido dopo normalizzazione:', {
          chatIdRaw: params.chatId,
          chatIdNormalized: chatId,
          isValidChatId
        });
        setError(t('chat.loadError'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('[ChatPage] Chiamata API con chatId:', chatId, 'Tipo:', typeof chatId);
        const chatData = await chatService.getChatById(chatId.trim());
        console.log('[ChatPage] Dati chat ricevuti dal servizio:', {
          hasChat: !!chatData,
          hasMessages: !!chatData?.messages,
          messagesCount: chatData?.messages?.length || 0,
          chatKeys: chatData ? Object.keys(chatData) : []
        });
        if (mounted) {
          setChat(chatData);
          const initial = (chatData.messages || []).map(normalizeMessage);
          console.log('[ChatPage] Messaggi normalizzati:', initial.length);
          setMessages(initial);
          // Registra gli ID per deduplicare
          messageIdsRef.current = new Set(initial.map(m => m._id).filter(Boolean));

          // Prova a ricavare meta dalla chat; altrimenti fallback al meal
          const countFromChat = Array.isArray(chatData.participants) ? chatData.participants.length : null;
          const maxFromChat = typeof chatData.maxParticipants === 'number' ? chatData.maxParticipants : null;
          if (countFromChat != null) setParticipantsCount(countFromChat);
          if (maxFromChat != null) setMaxParticipants(maxFromChat);

          if (chatData.mealId) {
            try {
              const meal = await mealService.getMealById(chatData.mealId);
              // Se il servizio restituisce { data: meal }, uniformiamo
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

    console.log('[DEBUG] Tentativo di connessione, token presente:', !!token);

  
    // Se non c'è il token, non tentare di connettere il socket
    if (!token) {
      setConnectionStatus('error');
      setError(t('chat.authRequired'));
      console.error('[DEBUG] ERRORE: Token non trovato. Impossibile connettere il socket.');

      return;
  }


    // Usa esattamente lo stesso indirizzo IP delle API HTTP
    const apiUrl = (process.env.REACT_APP_API_URL || API_URL || '').replace(/\/$/, '');
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');
    console.log(`[DEBUG] API URL: ${apiUrl}`);
    console.log(`[DEBUG] Socket URL: ${socketUrl}`);
    
    const socket = io(socketUrl, { 
      auth: { token },
      // Permetti fallback a polling per reti che bloccano i WebSocket
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 15000,
      withCredentials: true
    });
        
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[DEBUG] Socket connesso!');
      setConnectionStatus('connected');
      // Unisciti alla stanza dopo la connessione - passa solo la stringa chatId
      if (chatId && typeof chatId === 'string' && chatId.trim() !== '') {
        console.log('[ChatPage] joinChatRoom con chatId:', chatId.trim());
        socket.emit('joinChatRoom', chatId.trim());
      } else {
        console.error('[ChatPage] ERRORE: chatId non valido per joinChatRoom:', chatId);
      }
    });

    socket.on('disconnect', () => {
      console.log('[DEBUG] Socket disconnesso!');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[DEBUG] Errore di connessione socket:', error);
      setConnectionStatus('error');
      setError(t('chat.connectionError'));
    });

    socket.on('reconnect', (attempt) => {
      console.log('[DEBUG] Socket riconnesso, tentativo:', attempt);
      setConnectionStatus('connected');
      // Riunisciti alla stanza dopo la riconnessione - passa solo la stringa chatId
      if (chatId && typeof chatId === 'string' && chatId.trim() !== '') {
        console.log('[ChatPage] joinChatRoom (reconnect) con chatId:', chatId.trim());
        socket.emit('joinChatRoom', chatId.trim());
      } else {
        console.error('[ChatPage] ERRORE: chatId non valido per joinChatRoom (reconnect):', chatId);
      }
    });

    socket.on('receiveMessage', (message) => {
      console.log('[DEBUG] Nuovo messaggio ricevuto:', message);
      const nm = normalizeMessage(message);
      const mid = nm._id;
      if (mid && messageIdsRef.current.has(mid)) return;
      if (mid) messageIdsRef.current.add(mid);
      setMessages(prev => [...prev, nm]);
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

    // Join gestito sui callback di connect/reconnect

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [chatId, token, t]);

  const handleTyping = () => {
    // Validazione chatId prima di inviare typing
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
      return;
    }
    
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
    
    // Validazione chatId prima di inviare
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
      console.error('[ChatPage] ERRORE: chatId non valido in handleSendMessage:', chatId);
      return;
    }

    const validChatId = chatId.trim();
    const messageData = {
      chatId: validChatId,
      content: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    socketRef.current.emit('sendMessage', { chatId: validChatId, content: messageData.content }, (ack) => {
      // Non aggiungiamo subito il messaggio: arriverà tramite 'receiveMessage'.
      // Evitiamo duplicati lato mittente.
    });
    setNewMessage('');
    
    // Stop typing indicator
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
      // Silenzia errori di rete transitori
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

  // Funzione per riprovare a caricare la chat
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

  // --- NUOVA LOGICA DI RENDERING CON PRIORITÀ AI DATI ---
  // Mostra lo spinner solo se sta caricando E non abbiamo ancora dati da mostrare
  // --- INSERISCI QUESTI LOG DI DEBUG QUI ---
  console.log(`[ChatPage Rendering Check] loading=${loading}, error=${JSON.stringify(error)}, chatExists=${!!chat}`);
  // -----------------------------------------
  if (loading && !chat) {
    console.log('[ChatPage Rendering Decision] Mostro Spinner (loading e no chat)');
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
        <p className="mt-3">{t('chat.loading') || 'Caricamento...'}</p>
      </div>
    );
  }

  // Se c'è un errore E NON abbiamo dati validi da mostrare, allora mostra l'errore
  if (error && !chat) {
    console.log(`[ChatPage Rendering Decision] Mostro Errore Bloccante (error=${JSON.stringify(error)} e no chat)`);
    return (
      <div className="text-center py-5">
        <Alert variant="danger">
          <Alert.Heading>{t('chat.errorTitle')}</Alert.Heading>
          <p>{error}</p>
          <Button onClick={loadChat} variant="primary" className="mt-2">{t('chat.retry') || 'Riprova'}</Button>
          <div className="mt-2">
            <BackButton />
          </div>
        </Alert>
      </div>
    );
  }
  
  // Controllo finale: se non abbiamo chat e non stiamo caricando, mostra un warning
  if (!chat && !loading) {
    console.log('[ChatPage Rendering Decision] Mostro No Data Alert (chat is null/undefined)');
    return (
      <div className="text-center py-5">
        <Alert variant="warning">
          <Alert.Heading>{t('chat.notFoundTitle')}</Alert.Heading>
          <p>{t('chat.notFoundMessage')}</p>
          <Button onClick={loadChat} variant="primary" className="mt-2">{t('chat.retry') || 'Riprova'}</Button>
          <div className="mt-2">
            <BackButton />
          </div>
        </Alert>
      </div>
    );
  }

  console.log('[ChatPage Rendering Decision] Mostro Interfaccia Chat Principale');
  return (
    <div className={styles.chatPage}>
      {/* Mostra un piccolo avviso se c'è stato un errore ma stiamo mostrando dati esistenti */}
      {error && chat && (
        <>
          {console.log(`[ChatPage Rendering Decision] Mostro Warning Non Bloccante (error=${JSON.stringify(error)} ma chat esiste)`)}
        <Alert variant="warning" dismissible onClose={() => setError('')} className="m-2">
          <Alert.Heading>{t('chat.loadErrorButShowingOld') || 'Errore di caricamento'}</Alert.Heading>
          <p>{error}</p>
          <Button size="sm" onClick={loadChat} variant="outline-primary">{t('chat.retry') || 'Riprova'}</Button>
        </Alert>
        </>
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