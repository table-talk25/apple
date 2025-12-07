import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import chatService from '../services/chatService';

/**
 * Hook personalizzato per gestire l'indicatore "sta scrivendo" nella chat
 * @param {string} chatId - ID della chat
 * @param {function} onTypingUpdate - Callback per aggiornare lo stato di typing
 */
const useTypingIndicator = (chatId, onTypingUpdate) => {
  const { user } = useAuth();
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const lastTypingTimeRef = useRef(0);

  // Funzione per iniziare a scrivere
  const startTyping = useCallback(async () => {
    if (!chatId || !user) return;

    const now = Date.now();
    // Evita di inviare troppi eventi (minimo 1 secondo tra eventi)
    if (now - lastTypingTimeRef.current < 1000) return;
    
    lastTypingTimeRef.current = now;

    try {
      setIsTyping(true);
      await chatService.startTyping(chatId);
    } catch (error) {
      console.error('Errore nell\'avvio del typing indicator:', error);
    }
  }, [chatId, user]);

  // Funzione per smettere di scrivere
  const stopTyping = useCallback(async () => {
    if (!chatId || !user) return;

    try {
      setIsTyping(false);
      await chatService.stopTyping(chatId);
    } catch (error) {
      console.error('Errore nell\'arresto del typing indicator:', error);
    }
  }, [chatId, user]);

  // Gestisce il cambio di testo con debounce
  const handleTextChange = useCallback((text) => {
    if (!text || text.trim() === '') {
      // Se il testo è vuoto, smetti di scrivere
      if (isTyping) {
        stopTyping();
      }
      return;
    }

    // Inizia a scrivere se non stai già scrivendo
    if (!isTyping) {
      startTyping();
    }

    // Reset del timeout per smettere di scrivere
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Dopo 2 secondi di inattività, smetti di scrivere
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        stopTyping();
      }
    }, 2000);
  }, [isTyping, startTyping, stopTyping]);

  // Aggiorna la lista degli utenti che scrivono
  const updateTypingUsers = useCallback((users) => {
    // Filtra l'utente corrente dalla lista
    const otherUsers = users.filter(typingUser => 
      typingUser.user._id !== user?._id
    );
    setTypingUsers(otherUsers);
  }, [user]);

  // Effetto per pulire il timeout quando il componente si smonta
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Smetti di scrivere quando il componente si smonta
      if (isTyping) {
        stopTyping();
      }
    };
  }, [isTyping, stopTyping]);

  // Effetto per notificare i cambiamenti di typing
  useEffect(() => {
    if (onTypingUpdate) {
      onTypingUpdate({ isTyping, typingUsers });
    }
  }, [isTyping, typingUsers, onTypingUpdate]);

  return {
    isTyping,
    typingUsers,
    startTyping,
    stopTyping,
    handleTextChange,
    updateTypingUsers
  };
};

export default useTypingIndicator;
