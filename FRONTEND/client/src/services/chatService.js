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

const uploadChatImage = async (chatId, file) => {
  const normalizedId = normalizeChatId(chatId);
  const formData = new FormData();
  formData.append('image', file);
  const response = await apiClient.post(`/chats/${normalizedId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    suppressErrorAlert: true,
  });
  return response.data?.data || response.data;
};

const uploadChatAudio = async (chatId, audioBlob, durationSeconds) => {
  const normalizedId = normalizeChatId(chatId);
  const ext = (audioBlob?.type || '').includes('mp4') ? 'm4a' : 'webm';
  const file = new File([audioBlob], `voice_${Date.now()}.${ext}`, {
    type: audioBlob?.type || 'audio/webm',
  });
  const formData = new FormData();
  formData.append('audio', file);
  if (durationSeconds) {
    formData.append('duration', String(Math.max(1, Math.round(durationSeconds))));
  }
  const response = await apiClient.post(`/chats/${normalizedId}/upload-audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    suppressErrorAlert: true,
  });
  return response.data?.data || response.data;
};

const sendMessage = async (chatId, payload) => {
  const normalizedId = normalizeChatId(chatId);
  const response = await apiClient.post(`/chats/${normalizedId}/messages`, payload, {
    suppressErrorAlert: true,
  });
  return response.data?.data || response.data;
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
  uploadChatImage,
  uploadChatAudio,
  sendMessage,
};

export default chatService;
