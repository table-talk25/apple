// File: src/pages/ChatListPage/index.js

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import chatService from '../../services/chatService';
import { getMealCoverImageUrl } from '../../constants/mealConstants';
import styles from './ChatListPage.module.css';

const ChatListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const data = await chatService.getUserChats();
        setChats(data);
      } catch (err) {
        setError('Impossibile caricare le chat.');
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    if (chat.mealId?.title) return chat.mealId.title;
    const others = (chat.participants || []).filter(
      p => (p._id || p) !== (user?._id || user?.id)
    );
    if (others.length > 0) return others.map(p => p.nickname || 'Utente').join(', ');
    return 'Chat';
  };

  // Usa la foto del TableTalk come avatar della chat.
  // Fallback: immagine di default del pasto.
  const getAvatarSrc = (chat) => {
    const mealImage = chat.mealId?.imageUrl || chat.mealId?.coverImage || null;
    return getMealCoverImageUrl(mealImage);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>💬 Chat</h1>
      </div>

      {loading && (
        <div className={styles.centered}>
          <div className={styles.spinner} />
        </div>
      )}

      {error && !loading && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⚠️</span>
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={() => { setError(null); setLoading(true); chatService.getUserChats().then(setChats).catch(() => setError('Errore.')).finally(() => setLoading(false)); }}>
            Riprova
          </button>
        </div>
      )}

      {!loading && !error && chats.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>💬</span>
          <p className={styles.emptyTitle}>Nessuna chat attiva</p>
          <p className={styles.emptySubtitle}>Le tue chat appariranno qui quando parteciperai a un TableTalk®.</p>
          <button className={styles.retryBtn} onClick={() => navigate('/meals')}>
            Esplora i TableTalk®
          </button>
        </div>
      )}

      {!loading && !error && chats.length > 0 && (
        <ul className={styles.chatList}>
          {chats.map((chat) => (
            <li
              key={chat._id}
              className={`${styles.chatItem} ${chat.unreadCount > 0 ? styles.unread : ''}`}
              onClick={() => navigate(`/chat/${chat._id}`)}
            >
              <div className={styles.avatarWrap}>
                <img
                  src={getAvatarSrc(chat)}
                  alt={getChatName(chat)}
                  className={styles.avatar}
                  loading="lazy"
                  onError={(e) => { e.target.src = '/assets/images/default-meal-placeholder.jpeg'; }}
                />
                {chat.unreadCount > 0 && (
                  <span className={styles.unreadBadge}>
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </span>
                )}
              </div>
              <div className={styles.chatBody}>
                <div className={styles.chatTop}>
                  <span className={styles.chatName}>{getChatName(chat)}</span>
                  <span className={styles.chatTime}>{formatTime(chat.lastMessage?.timestamp || chat.updatedAt)}</span>
                </div>
                <p className={styles.lastMsg}>
                  {chat.lastMessage?.content || 'Nessun messaggio ancora'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatListPage;
