import { useEffect, useState, useCallback } from 'react';
import {
  connectSocket,
  joinChatRoom,
  leaveChatRoom,
  sendMessage,
  sendTyping,
  listenToMessages,
  listenToTyping,
  disconnectSocket
} from '../services/socket';

export const useChatSocket = (chatId) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    const initSocket = async () => {
      await connectSocket();

      setConnectionStatus('connected');

      joinChatRoom(chatId);

      listenToMessages((newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
      });

      listenToTyping(({ user, isTyping }) => {
        console.log(`[Socket] ${user.nickname} sta scrivendo: ${isTyping}`);
        setIsTyping(isTyping);
      });
    };

    initSocket();

    return () => {
      leaveChatRoom(chatId);
      disconnectSocket();
      setConnectionStatus('disconnected');
    };
  }, [chatId]);

  const handleSendMessage = useCallback((content, callback) => {
    sendMessage(chatId, content, callback);
  }, [chatId]);

  const handleTyping = useCallback((typingState) => {
    sendTyping(chatId, typingState);
  }, [chatId]);

  return {
    messages,
    isTyping,
    connectionStatus,
    handleSendMessage,
    handleTyping
  };
};
