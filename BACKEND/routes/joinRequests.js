const express = require('express');
const {
  requestToJoin,
  handleJoinRequest,
  getJoinRequests,
  getMyRequests
} = require('../controllers/joinRequestController');

const router = express.Router();

// Proteggi tutte le route
const { protect } = require('../middleware/auth');

// Applica middleware di autenticazione a tutte le route
router.use(protect);

// POST /api/join-requests - Richiedi di unirsi a un pasto pubblico
router.post('/', requestToJoin);

// PUT /api/join-requests/:requestId - Host accetta/rifiuta richiesta
router.put('/:requestId', handleJoinRequest);

// GET /api/join-requests/meal/:mealId - Ottieni richieste per un pasto (solo host)
router.get('/meal/:mealId', getJoinRequests);

// GET /api/join-requests/my - Ottieni le richieste inviate dall'utente corrente
router.get('/my', getMyRequests);

module.exports = router; 