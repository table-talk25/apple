import apiClient from './apiService';

export const sendInvitation = async (recipientId, message) => {
  return apiClient.post('/invitations', { toUser: recipientId, message });
};

export const getReceivedInvitations = async () => {
  const response = await apiClient.get('/invitations/received');
  return response.data;
};

export const acceptInvitation = async (invitationId) => {
  const response = await apiClient.put(`/invitations/${invitationId}/accept`);
  return response.data;
}; 