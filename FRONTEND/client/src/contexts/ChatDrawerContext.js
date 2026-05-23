// File: src/contexts/ChatDrawerContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';

const ChatDrawerContext = createContext(null);

export const ChatDrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);

  const openDrawer = useCallback(() => {
    setActiveChatId(null);
    setIsOpen(true);
  }, []);

  const openChat = useCallback((chatId) => {
    setActiveChatId(chatId);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setActiveChatId(null);
  }, []);

  const goToList = useCallback(() => {
    setActiveChatId(null);
  }, []);

  return (
    <ChatDrawerContext.Provider value={{ isOpen, activeChatId, openDrawer, openChat, closeDrawer, goToList }}>
      {children}
    </ChatDrawerContext.Provider>
  );
};

export const useChatDrawer = () => {
  const ctx = useContext(ChatDrawerContext);
  if (!ctx) throw new Error('useChatDrawer must be used within ChatDrawerProvider');
  return ctx;
};
