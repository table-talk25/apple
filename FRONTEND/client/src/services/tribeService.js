import apiClient from './apiService';

const tribeService = {
  getMyTribe: async () => {
    const response = await apiClient.get('/tribe');
    return response.data?.data || { members: [], received: [], sent: [] };
  },

  sendInvite: async (toUserId, mealId) => {
    const response = await apiClient.post('/tribe/invites', { toUserId, mealId });
    return response.data;
  },

  acceptInvite: async (inviteId) => {
    const response = await apiClient.post(`/tribe/invites/${inviteId}/accept`);
    return response.data;
  },

  declineInvite: async (inviteId) => {
    const response = await apiClient.post(`/tribe/invites/${inviteId}/decline`);
    return response.data;
  },

  cancelInvite: async (inviteId) => {
    const response = await apiClient.delete(`/tribe/invites/${inviteId}`);
    return response.data;
  },

  removeMember: async (userId) => {
    const response = await apiClient.delete(`/tribe/members/${userId}`);
    return response.data;
  },
};

export default tribeService;
