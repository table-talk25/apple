// File: src/pages/ChatPage/index.js
// Reindirizza qualsiasi link diretto /chat/:chatId al ChatDrawer unificato
// (con vocali stile WhatsApp, fotocamera/galleria, modifica/elimina e nuvolette terracotta).

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatDrawer } from '../../contexts/ChatDrawerContext';

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { openChat, openDrawer } = useChatDrawer();

  useEffect(() => {
    const cleaned = String(chatId || '').trim();
    if (cleaned && cleaned !== 'undefined' && cleaned !== 'null') {
      openChat(cleaned);
    } else {
      openDrawer();
    }
    navigate('/', { replace: true });
  }, [chatId, openChat, openDrawer, navigate]);

  return null;
};

export default ChatPage;
