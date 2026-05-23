import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { API_URL } from '../../config/capacitorConfig';
import ChatMessage from './ChatMessage';
import styles from './Chat.module.css';

// Emoji categorizzate (nessuna libreria esterna)
const EMOJI_CATEGORIES = [
  {
    label: '😊 Smileys',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  },
  {
    label: '👋 Gesti',
    emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄'],
  },
  {
    label: '🍕 Cibo',
    emojis: ['🍕','🍔','🌮','🌯','🥪','🥗','🍜','🍝','🍣','🍱','🍛','🥘','🫕','🍲','🥫','🍿','🧆','🥚','🍳','🧇','🥞','🧈','🥓','🥩','🍗','🍖','🦴','🌭','🫔','🥙','🧀','🥚','🍙','🍘','🍥','🥮','🍡','🧁','🎂','🍰','🍫','🍬','🍭','🍮','🍯','🍦','🍧','🍨','🍩','🍪','☕','🫖','🍵','🧃','🥤','🧋','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🥄','🍴','🥢'],
  },
  {
    label: '❤️ Cuori',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☯️','🕉','✡️','🔯','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'],
  },
  {
    label: '🌍 Luoghi',
    emojis: ['🌍','🌎','🌏','🌐','🗺','🧭','🏔','⛰','🌋','🗻','🏕','🏖','🏜','🏝','🏞','🏟','🏛','🏗','🧱','🏘','🏚','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩','🕋','⛲','⛺','🌁','🌃','🏙','🌄','🌅','🌆','🌇','🌉','♨️','🎠','🎡','🎢','💈','🎪'],
  },
];

// ─────────────────────────────────────────────────────────────
// BUBBLE REPLY PREVIEW
// ─────────────────────────────────────────────────────────────
const ReplyPreview = ({ replyTo, own }) => {
  if (!replyTo?.message) return null;
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
// SINGOLA RIGA MESSAGGIO con swipe-to-reply su mobile
// ─────────────────────────────────────────────────────────────
const MessageRow = ({ msg, own, onReply, getSenderName }) => {
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

  const swipeProgress = Math.min(swipeX / SWIPE_THRESHOLD, 1);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: own ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: '8px',
        marginBottom: '6px',
        position: 'relative',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Icona reply animata durante swipe */}
      {swiping && swipeX > 8 && (
        <div style={{
          position: 'absolute',
          [own ? 'left' : 'right']: 4,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: swipeProgress,
          fontSize: 20,
          color: '#FF6B35',
          pointerEvents: 'none',
        }}>
          ↩
        </div>
      )}

      {/* Contenuto traslato durante swipe */}
      <div style={{
        display: 'flex',
        flexDirection: own ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: '8px',
        flex: 1,
        transform: swiping ? `translateX(${own ? -swipeX : swipeX}px)` : 'translateX(0)',
        transition: swiping ? 'none' : 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
      }}>
        {!own && (
          <img
            src={msg.senderId?.profileImage || '/default-avatar.jpg'}
            alt={getSenderName(msg)}
            style={{
              width: '32px', height: '32px',
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
              border: '2px solid #fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}
          />
        )}

        <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
          {!own && (
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#FF6B35', marginBottom: '3px', marginLeft: '4px' }}>
              {getSenderName(msg)}
            </span>
          )}

          {/* Bubble */}
          <div
            style={{
              position: 'relative',
              padding: '10px 14px',
              borderRadius: own ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
              background: own ? 'linear-gradient(135deg, #FF6B35, #ff8c5a)' : '#fff',
              color: own ? '#fff' : '#1a1a2e',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              wordBreak: 'break-word',
              fontSize: '14px',
              lineHeight: '1.5',
            }}
          >
            <ReplyPreview replyTo={msg.replyTo} own={own} />
            <div>{msg.message}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', opacity: 0.65 }}>
                {new Date(msg.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Pulsante Rispondi (desktop) */}
          <button
            onClick={() => onReply(msg)}
            title="Rispondi"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#aaa',
              padding: '2px 6px',
              marginTop: '2px',
              borderRadius: '8px',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#FF6B35'; e.currentTarget.style.background = '#fff0eb'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.background = 'none'; }}
          >
            ↩ Rispondi
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MEALCHAT principale
// ─────────────────────────────────────────────────────────────
const MealChat = ({ mealId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const socketBase = (process.env.REACT_APP_API_URL || API_URL || '').replace(/\/api\/?$/, '');
    const newSocket = io(socketBase);
    setSocket(newSocket);
    newSocket.emit('join_meal_chat', mealId);
    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });
    loadMessages();
    return () => {
      newSocket.emit('leave_meal_chat', mealId);
      newSocket.disconnect();
    };
  }, [mealId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiBase = (process.env.REACT_APP_API_URL || API_URL || '').replace(/\/$/, '');
      const response = await fetch(`${apiBase}/chats/meal/${mealId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const apiBase = (process.env.REACT_APP_API_URL || API_URL || '').replace(/\/$/, '');
      const body = { message: newMessage.trim() };
      if (replyTo) {
        body.replyTo = {
          _id: replyTo._id,
          message: replyTo.message,
          senderName: replyTo.senderId?.nickname || replyTo.senderId?.name || 'Utente'
        };
      }
      const response = await fetch(`${apiBase}/chats/meal/${mealId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        setNewMessage('');
        setReplyTo(null);
        setShowEmojiPicker(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape') {
      setReplyTo(null);
      setShowEmojiPicker(false);
    }
  };

  const handleEmojiClick = (emoji) => {
    const input = inputRef.current;
    if (!input) { setNewMessage(prev => prev + emoji); return; }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const updated = newMessage.slice(0, start) + emoji + newMessage.slice(end);
    setNewMessage(updated);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleReply = useCallback((msg) => {
    setReplyTo(msg);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const getSenderName = (msg) => msg?.senderId?.nickname || msg?.senderId?.name || 'Utente';
  const isOwn = (msg) => msg?.senderId?._id === currentUser?.id || msg?.senderId?._id === currentUser?._id;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '520px',
      border: '1px solid #e9ecef',
      borderRadius: '16px',
      overflow: 'hidden',
      backgroundColor: '#fff',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>

      {/* HEADER */}
      <div style={{
        padding: '14px 18px',
        background: 'linear-gradient(135deg, #FF6B35, #ff8c5a)',
        color: '#fff',
        fontWeight: '700',
        fontSize: '15px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '20px' }}>💬</span> Chat del Pasto
      </div>

      {/* MESSAGGI */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 12px',
        background: '#f7f8fa',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
            Caricamento messaggi…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>💬</div>
            Nessun messaggio ancora.<br />Inizia la conversazione!
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageRow
              key={msg._id || index}
              msg={msg}
              own={isOwn(msg)}
              onReply={handleReply}
              getSenderName={getSenderName}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* EMOJI PICKER */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          style={{
            position: 'relative',
            borderTop: '1px solid #f0f0f0',
            background: '#fff',
            padding: '8px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => setEmojiCategory(i)}
                style={{
                  background: emojiCategory === i ? '#fff0eb' : 'transparent',
                  border: `1px solid ${emojiCategory === i ? '#FF6B35' : '#e9ecef'}`,
                  borderRadius: '8px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  color: emojiCategory === i ? '#FF6B35' : '#666',
                  fontWeight: emojiCategory === i ? '600' : '400',
                  transition: 'all 0.15s',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))',
            gap: '2px',
            maxHeight: '140px',
            overflowY: 'auto',
          }}>
            {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
              <button
                key={i}
                onClick={() => handleEmojiClick(emoji)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '20px', padding: '3px', borderRadius: '6px',
                  transition: 'background 0.1s', lineHeight: 1,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f7f8fa'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* REPLY BANNER */}
      {replyTo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: '#fff0eb',
          borderTop: '1px solid #ffd5c2',
          fontSize: '13px',
          color: '#444',
          flexShrink: 0,
        }}>
          <span style={{ color: '#FF6B35', fontWeight: '700', flexShrink: 0 }}>↩</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <span style={{ fontWeight: '700', color: '#FF6B35' }}>{getSenderName(replyTo)}</span>
            <span style={{
              marginLeft: '6px', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '220px', verticalAlign: 'bottom',
            }}>
              {replyTo.message}
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999', padding: '0 4px', lineHeight: 1 }}
            aria-label="Annulla risposta"
          >
            ✕
          </button>
        </div>
      )}

      {/* INPUT BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        borderTop: '1px solid #e9ecef',
        background: '#fff',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setShowEmojiPicker(v => !v)}
          title="Emoji"
          style={{
            background: showEmojiPicker ? '#fff0eb' : 'none',
            border: `1px solid ${showEmojiPicker ? '#FF6B35' : '#e9ecef'}`,
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '5px 8px',
            lineHeight: 1,
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          😊
        </button>

        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={replyTo ? `Rispondi a ${getSenderName(replyTo)}…` : 'Scrivi un messaggio…'}
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: '1.5px solid #e9ecef',
            borderRadius: '22px',
            outline: 'none',
            fontSize: '14px',
            background: '#f7f8fa',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = '#FF6B35'}
          onBlur={e => e.target.style.borderColor = '#e9ecef'}
        />

        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || loading}
          title="Invia"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: newMessage.trim() ? 'linear-gradient(135deg, #FF6B35, #ff8c5a)' : '#e9ecef',
            color: '#fff',
            border: 'none',
            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s, transform 0.1s',
            boxShadow: newMessage.trim() ? '0 2px 8px rgba(255,107,53,0.35)' : 'none',
          }}
          onMouseEnter={e => { if (newMessage.trim()) e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export default MealChat;
