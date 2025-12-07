// File: FRONTEND/client/src/services/chatService.js (Corretto con apiService)

import apiClient from './apiService'; // <-- Usa il tuo servizio centralizzato

/**
 * Ottiene i dati di una chat e la sua cronologia messaggi
 * @param {string} chatId - L'ID della chat da recuperare
 * @returns {Promise<Object>} L'oggetto della chat
 */
const getChatById = async (chatId) => {
  try {
    // 🔍 Normalizza e valida chatId
    let normalizedChatId = chatId;
    
    // Se è un oggetto, estrai l'ID
    if (typeof chatId === 'object' && chatId !== null) {
      normalizedChatId = chatId._id || chatId.id || chatId.chatId || String(chatId);
      console.warn('⚠️ [ChatService] chatId era un oggetto, normalizzato a:', normalizedChatId);
    }
    
    // Converti in stringa e trim
    normalizedChatId = String(normalizedChatId || '').trim();
    
    // Validazione finale
    if (!normalizedChatId || normalizedChatId === 'undefined' || normalizedChatId === 'null' || normalizedChatId === '[object Object]') {
      const error = new Error('chatId non valido: ricevuto un oggetto o valore vuoto');
      console.error('❌ [ChatService]', error.message, 'chatId originale:', chatId);
      throw error;
    }
    
    // 🔍 Debug logs per tracciare le chiamate
    console.log('🔍 [Frontend] Calling chat API with chatId:', normalizedChatId);
    console.log('🔍 [Frontend] ChatId type:', typeof normalizedChatId, 'Length:', normalizedChatId?.length);
    console.log('🔍 [Frontend] ChatId valid MongoDB format:', normalizedChatId?.match(/^[0-9a-fA-F]{24}$/) ? '✅ Valid' : '❌ Invalid');
    
    const response = await apiClient.get(`/chats/${normalizedChatId}`);
    console.log('✅ [Frontend] Chat API response received:', response.data);
    console.log('🔍 [Frontend] Response structure:', {
      hasData: !!response.data?.data,
      hasChat: !!response.data?.chat,
      hasMessages: !!response.data?.messages,
      hasSuccess: !!response.data?.success,
      keys: Object.keys(response.data || {})
    });
    
    // Il backend restituisce: {success: true, chat: {...}, messages: [...]}
    // Estraiamo la chat (che potrebbe essere in data, chat, o direttamente in response.data)
    const chatData = response.data?.data || response.data?.chat || response.data;
    
    // Estraiamo i messaggi se presenti nella risposta separata
    const messages = response.data?.messages || chatData?.messages || [];
    
    console.log('🔍 [Frontend] Chat data extracted:', chatData);
    console.log('🔍 [Frontend] Messages extracted:', messages?.length || 0, 'messages');
    
    if (!chatData) {
      throw new Error('Nessun dato chat ricevuto dalla risposta API');
    }
    
    // Uniamo chat e messages in un unico oggetto per compatibilità con la ChatPage
    return {
      ...chatData,
      messages: messages
    };
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

// Funzione helper per normalizzare chatId
const normalizeChatId = (chatId) => {
  if (typeof chatId === 'object' && chatId !== null) {
    return chatId._id || chatId.id || chatId.chatId || String(chatId);
  }
  return String(chatId || '').trim();
};

/**
 * Permette all'utente autenticato di lasciare una chat
 * @param {string} chatId - L'ID della chat da lasciare
 * @returns {Promise<Object>} La risposta dall'API
 */
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

/**
 * Inizia l'indicatore "sta scrivendo"
 * @param {string} chatId - L'ID della chat
 * @returns {Promise<Object>} La risposta dall'API
 */
const startTyping = async (chatId) => {
  const normalizedId = normalizeChatId(chatId);
  const response = await apiClient.post(`/chats/${normalizedId}/typing/start`);
  return response.data;
};

/**
 * Ferma l'indicatore "sta scrivendo"
 * @param {string} chatId - L'ID della chat
 * @returns {Promise<Object>} La risposta dall'API
 */
const stopTyping = async (chatId) => {
  const normalizedId = normalizeChatId(chatId);
  const response = await apiClient.post(`/chats/${normalizedId}/typing/stop`);
  return response.data;
};

/**
 * Marca i messaggi come letti
 * @param {string} chatId - L'ID della chat
 * @returns {Promise<Object>} La risposta dall'API
 */
const markAsRead = async (chatId) => {
  const normalizedId = normalizeChatId(chatId);
  const response = await apiClient.post(`/chats/${normalizedId}/read`);
  return response.data;
};

/**
 * Ottiene lo stato della chat (typing e lettura)
 * @param {string} chatId - L'ID della chat
 * @returns {Promise<Object>} La risposta dall'API
 */
const getChatStatus = async (chatId) => {
  const normalizedId = normalizeChatId(chatId);
  const response = await apiClient.get(`/chats/${normalizedId}/status`);
  return response.data;
};

const chatService = {
  getChatById,
  leaveChat,
  startTyping,
  stopTyping,
  markAsRead,
  getChatStatus
};
// Esporta anche closeChat per gli host
chatService.closeChat = closeChat;

export default chatService;