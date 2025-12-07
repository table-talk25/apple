import apiClient from './apiService';

// Blocca un utente
const blockUser = async (userId) => {
  const response = await apiClient.post(`/users/${userId}/block`);
  return response.data;
};

// Sblocca un utente
const unblockUser = async (userId) => {
  const response = await apiClient.delete(`/users/${userId}/block`);
  return response.data;
};

// Ottieni la lista degli utenti bloccati
const getBlockedUsers = async () => {
  const response = await apiClient.get('/users/blocked');
  return response.data;
};

// Verifica se un utente è bloccato
const isUserBlocked = async (userId) => {
  const response = await apiClient.get(`/users/${userId}/is-blocked`);
  return response.data;
};

const userBlockService = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  isUserBlocked
};

export default userBlockService; 