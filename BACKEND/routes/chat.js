const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// GET /api/chats         - Lista chat attive dell'utente
router.get('/', protect, chatController.getUserChats);
// GET /api/chats/:id     - Dettaglio singola chat + messaggi
router.get('/:id', protect, chatController.getChatById);
// POST /api/chats/:id/messages - Invia messaggio (HTTP fallback)
router.post('/:id/messages', protect, chatController.sendMessage);

module.exports = router;
