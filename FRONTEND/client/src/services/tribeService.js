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

  getLists: async () => {
    const response = await apiClient.get('/tribe/lists');
    return response.data?.data || [];
  },

  createList: async (name, members) => {
    const response = await apiClient.post('/tribe/lists', { name, members });
    return response.data?.data;
  },

  updateList: async (id, payload) => {
    const response = await apiClient.put(`/tribe/lists/${id}`, payload);
    return response.data?.data;
  },

  deleteList: async (id) => {
    const response = await apiClient.delete(`/tribe/lists/${id}`);
    return response.data;
  },

  removeMember: async (userId) => {
    const response = await apiClient.delete(`/tribe/members/${userId}`);
    return response.data;
  },
};

export default tribeService;
