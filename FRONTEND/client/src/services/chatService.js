// File: FRONTEND/client/src/services/chatService.js

import apiClient from './apiService';

// Funzione helper per normalizzare chatId
const normalizeChatId = (chatId) => {
  if (typeof chatId === 'object' && chatId !== null) {
    return chatId._id || chatId.id || chatId.chatId || String(chatId);
  }
  return String(chatId || '').trim();
};

/**
 * Ottiene la lista di tutte le chat attive dell'utente loggato
 * @returns {Promise<Array>} Array di chat
 */
const getUserChats = async () => {
  const response = await apiClient.get('/chats');
  return response.data?.data || response.data || [];
};

/**
 * Ottiene i dati di una chat e la sua cronologia messaggi
 * @param {string} chatId - L'ID della chat da recuperare
 * @returns {Promise<Object>} L'oggetto della chat
 */
const getChatById = async (chatId) => {
  try {
    let normalizedChatId = chatId;
    
    if (typeof chatId === 'object' && chatId !== null) {
      normalizedChatId = chatId._id || chatId.id || chatId.chatId || String(chatId);
      console.warn('⚠️ [ChatService] chatId era un oggetto, normalizzato a:', normalizedChatId);
    }
    
    normalizedChatId = String(normalizedChatId || '').trim();
    
    if (!normalizedChatId || normalizedChatId === 'undefined' || normalizedChatId === 'null' || normalizedChatId === '[object Object]') {
      const error = new Error('chatId non valido: ricevuto un oggetto o valore vuoto');
      console.error('❌ [ChatService]', error.message, 'chatId originale:', chatId);
      throw error;
    }
    
    const response = await apiClient.get(`/chats/${normalizedChatId}`);
    
    const chatData = response.data?.data || response.data?.chat || response.data;
    const messages = response.data?.messages || chatData?.messages || [];
    
    if (!chatData) {
      throw new Error('Nessun dato chat ricevuto dalla risposta API');
    }
    
    return { ...chatData, messages };
  } catch (error) {
    console.error('💬 [ChatService] Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      responseData: error.response?.data
    });
    throw error;
  }
};

const leaveChat = async (chatId) => {
  const normalizedId = normalizeChatId(chatId);
  const response = await apiClient.delete(`/chats/${normalizedId}/participants`, { suppressErrorAlert: true });
  return response.data;
};

const closeChat = async (chatId) => {
  const normalizedId = normalizeChatId(chatId);
  const response = await apiClient.put(`/chats/${normalizedId}/close`, {}, { suppressErrorAlert: true });
  return response.data;
};

const startTyping = async (chatId) => {
  const normalizedId = normalizeChatId(chatId);
  const response = await apiClient.post(`/chats/${normalizedId}/typing/start`);
  return response.data;
};

const stopTyping = async (chatId) => {
  const normalizedId = normalizeChatId(chatId);
  const response = await apiClient.post(`/chats/${normalizedId}/typing/stop`);
  return response.data;
};

const markAsRead = async (chatId) => {
  const normalizedId = normalizeChatId(chatId);
  const response = await apiClient.post(`/chats/${normalizedId}/read`);
  return response.data;
};

const getChatStatus = async (chatId) => {
  const normalizedId = normalizeChatId(chatId);
  const response = await apiClient.get(`/chats/${normalizedId}/status`);
  return response.data;
};

const chatService = {
  getUserChats,
  getChatById,
  leaveChat,
  closeChat,
  startTyping,
  stopTyping,
  markAsRead,
  getChatStatus,
};

export default chatService;
