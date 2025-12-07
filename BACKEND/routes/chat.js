const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// Chat routes
// GET /api/chats/:id - Ottiene la chat con tutti i messaggi (getChatById già restituisce i messaggi)
router.get('/:id', protect, chatController.getChatById);
// POST /api/chats/:id/messages - Invia un nuovo messaggio
router.post('/:id/messages', protect, chatController.sendMessage);

module.exports = router;