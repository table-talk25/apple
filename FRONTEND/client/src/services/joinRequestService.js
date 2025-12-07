import apiClient from './apiService';

// Richiedi di unirsi a un TableTalk® pubblico
const requestToJoin = async (mealId, message = '') => {
  const response = await apiClient.post('/join-requests', {
    mealId,
    message
  });
  return response.data;
};

// Host accetta/rifiuta richiesta
const handleJoinRequest = async (requestId, action) => {
  const response = await apiClient.put(`/join-requests/${requestId}`, {
    action // 'accept' o 'decline'
  });
  return response.data;
};

// Ottieni richieste per un TableTalk® (solo per l'host)
const getJoinRequests = async (mealId) => {
  const response = await apiClient.get(`/join-requests/meal/${mealId}`);
  return response.data;
};

// Ottieni le richieste inviate dall'utente corrente
const getMyRequests = async () => {
  const response = await apiClient.get('/join-requests/my');
  return response.data;
};

const joinRequestService = {
  requestToJoin,
  handleJoinRequest,
  getJoinRequests,
  getMyRequests
};

export default joinRequestService; 