import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { API_URL } from '../../config/capacitorConfig';

const MealChat = ({ mealId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Connessione Socket.IO
    const socketBase = (process.env.REACT_APP_API_URL || API_URL || '').replace(/\/api\/?$/, '');
    const newSocket = io(socketBase);
    setSocket(newSocket);

    // Join chat room
    newSocket.emit('join_meal_chat', mealId);

    // Listen for new messages
    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Load initial messages
    loadMessages();

    return () => {
      newSocket.emit('leave_meal_chat', mealId);
      newSocket.disconnect();
    };
  }, [mealId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      // 🔍 Debug logs per tracciare le chiamate
      console.log('🔍 [MealChat] Loading messages for mealId:', mealId);
      console.log('🔍 [MealChat] MealId type:', typeof mealId, 'Length:', mealId?.length);
      console.log('🔍 [MealChat] MealId valid MongoDB format:', mealId?.match(/^[0-9a-fA-F]{24}$/) ? '✅ Valid' : '❌ Invalid');
      
      const token = localStorage.getItem('token');
      console.log('🔍 [MealChat] Token present:', token ? '✅ Yes' : '❌ No');
      
      const apiBase = (process.env.REACT_APP_API_URL || API_URL || '').replace(/\/$/, '');
      const response = await fetch(`${apiBase}/chats/meal/${mealId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('🔍 [MealChat] API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [MealChat] Messages loaded successfully:', data);
        setMessages(data);
      } else {
        console.error('Errore nel caricamento messaggi:', response.statusText);
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
      const response = await fetch(`${apiBase}/chats/meal/${mealId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage.trim() })
      });

      if (response.ok) {
        setNewMessage('');
      } else {
        console.error('Errore nell\'invio messaggio:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ 
      height: '400px', 
      display: 'flex', 
      flexDirection: 'column',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: 'white'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '10px 15px',
        backgroundColor: '#FF6B35',
        color: 'white',
        borderRadius: '8px 8px 0 0',
        fontWeight: 'bold'
      }}>
        💬 Chat del Pasto
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        backgroundColor: '#f8f9fa'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Caricamento messaggi...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Nessun messaggio ancora. Inizia la conversazione! 💬
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg._id || index}
              style={{
                marginBottom: '10px',
                display: 'flex',
                flexDirection: msg.senderId._id === currentUser.id ? 'row-reverse' : 'row'
              }}
            >
              <div style={{
                maxWidth: '70%',
                padding: '8px 12px',
                borderRadius: '12px',
                backgroundColor: msg.senderId._id === currentUser.id ? '#FF6B35' : 'white',
                color: msg.senderId._id === currentUser.id ? 'white' : 'black',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                {msg.senderId._id !== currentUser.id && (
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', opacity: 0.8 }}>
                    {msg.senderId.nickname || msg.senderId.name}
                  </div>
                )}
                <div style={{ wordBreak: 'break-word' }}>{msg.message}</div>
                <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>
                  {new Date(msg.createdAt).toLocaleTimeString('it-IT', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div style={{
        display: 'flex',
        padding: '10px',
        borderTop: '1px solid #ddd',
        backgroundColor: 'white',
        borderRadius: '0 0 8px 8px'
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Scrivi un messaggio..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '20px',
            outline: 'none',
            fontSize: '14px'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || loading}
          style={{
            marginLeft: '8px',
            padding: '8px 16px',
            backgroundColor: newMessage.trim() ? '#FF6B35' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
            fontSize: '16px'
          }}
        >
          📤
        </button>
      </div>
    </div>
  );
};

export default MealChat;
