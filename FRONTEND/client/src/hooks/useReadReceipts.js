import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import chatService from '../services/chatService';

/**
 * Hook personalizzato per gestire le conferme di lettura dei messaggi
 * @param {string} chatId - ID della chat
 * @param {Array} messages - Array dei messaggi della chat
 * @param {function} onReadUpdate - Callback per aggiornare lo stato di lettura
 */
const useReadReceipts = (chatId, messages, onReadUpdate) => {
  const { user } = useAuth();
  const [readStatus, setReadStatus] = useState({});
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const markAsReadTimeoutRef = useRef(null);
  const lastMarkAsReadTimeRef = useRef(0);

  // Funzione per marcare i messaggi come letti
  const markAsRead = useCallback(async () => {
    if (!chatId || !user || isMarkingAsRead) return;

    const now = Date.now();
    // Evita di inviare troppi eventi (minimo 500ms tra eventi)
    if (now - lastMarkAsReadTimeRef.current < 500) return;
    
    lastMarkAsReadTimeRef.current = now;

    try {
      setIsMarkingAsRead(true);
      await chatService.markAsRead(chatId);
    } catch (error) {
      console.error('Errore nel marcare i messaggi come letti:', error);
    } finally {
      setIsMarkingAsRead(false);
    }
  }, [chatId, user, isMarkingAsRead]);

  // Funzione per ottenere lo stato di lettura di un messaggio
  const getMessageReadStatus = useCallback((messageId) => {
    return readStatus[messageId] || [];
  }, [readStatus]);

  // Funzione per verificare se un messaggio è stato letto da tutti i partecipanti
  const isMessageReadByAll = useCallback((message, participants) => {
    if (!message || !participants) return false;
    
    // Se il messaggio è dell'utente corrente, controlla se è stato letto da tutti gli altri
    if (message.sender._id === user?._id) {
      const otherParticipants = participants.filter(p => p._id !== user?._id);
      const readByOthers = getMessageReadStatus(message._id);
      return readByOthers.length >= otherParticipants.length;
    }
    
    return false;
  }, [user, getMessageReadStatus]);

  // Funzione per ottenere il numero di letture di un messaggio
  const getMessageReadCount = useCallback((message, participants) => {
    if (!message || !participants) return 0;
    
    // Se il messaggio è dell'utente corrente, conta quanti altri l'hanno letto
    if (message.sender._id === user?._id) {
      const otherParticipants = participants.filter(p => p._id !== user?._id);
      const readByOthers = getMessageReadStatus(message._id);
      return Math.min(readByOthers.length, otherParticipants.length);
    }
    
    return 0;
  }, [user, getMessageReadStatus]);

  // Funzione per ottenere il numero totale di partecipanti (escluso l'utente corrente)
  const getOtherParticipantsCount = useCallback((participants) => {
    if (!participants) return 0;
    return participants.filter(p => p._id !== user?._id).length;
  }, [user]);

  // Effetto per marcare automaticamente i messaggi come letti quando diventano visibili
  useEffect(() => {
    if (!chatId || !messages || messages.length === 0) return;

    // Reset del timeout precedente
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }

    // Marca i messaggi come letti dopo 1 secondo di visibilità
    markAsReadTimeoutRef.current = setTimeout(() => {
      markAsRead();
    }, 1000);

    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
    };
  }, [chatId, messages, markAsRead]);

  // Effetto per pulire il timeout quando il componente si smonta
  useEffect(() => {
    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
    };
  }, []);

  // Effetto per notificare i cambiamenti di lettura
  useEffect(() => {
    if (onReadUpdate) {
      onReadUpdate({ readStatus, isMarkingAsRead });
    }
  }, [readStatus, isMarkingAsRead, onReadUpdate]);

  return {
    readStatus,
    isMarkingAsRead,
    markAsRead,
    getMessageReadStatus,
    isMessageReadByAll,
    getMessageReadCount,
    getOtherParticipantsCount
  };
};

export default useReadReceipts;
