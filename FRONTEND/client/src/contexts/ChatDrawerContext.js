// File: src/contexts/ChatDrawerContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';

const ChatDrawerContext = createContext(null);

export const ChatDrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  // activeChatId: null = lista chat, string = chat specifica aperta
  const [activeChatId, setActiveChatId] = useState(null);

  const openDrawer = useCallback((chatId = null) => {
    setActiveChatId(chatId);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    // reset chat attiva dopo animazione chiusura
    setTimeout(() => setActiveChatId(null), 300);
  }, []);

  const goToList = useCallback(() => {
    setActiveChatId(null);
  }, []);

  const openChat = useCallback((chatId) => {
    setActiveChatId(chatId);
  }, []);

  return (
    <ChatDrawerContext.Provider value={{ isOpen, activeChatId, openDrawer, closeDrawer, goToList, openChat }}>
      {children}
    </ChatDrawerContext.Provider>
  );
};

export const useChatDrawer = () => {
  const ctx = useContext(ChatDrawerContext);
  if (!ctx) throw new Error('useChatDrawer must be used inside ChatDrawerProvider');
  return ctx;
};

export default ChatDrawerContext;
