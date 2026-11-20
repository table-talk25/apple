const express = require('express');
const multer = require('multer');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

const chatImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Formato file non supportato. Solo immagini permesse.'), false);
    }
  },
});

const chatAudioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm')) {
      cb(null, true);
    } else {
      cb(new Error('Formato file non supportato. Solo audio permesso.'), false);
    }
  },
});

// GET /api/chats         - Lista chat attive dell'utente
router.get('/', protect, chatController.getUserChats);
// GET /api/chats/:id     - Dettaglio singola chat + messaggi
router.get('/:id', protect, chatController.getChatById);
// POST /api/chats/:id/messages - Invia messaggio (HTTP fallback)
router.post('/:id/messages', protect, chatController.sendMessage);
// PUT /api/chats/:id/messages/:messageId - Modifica un proprio messaggio
router.put('/:id/messages/:messageId', protect, chatController.editMessage);
// DELETE /api/chats/:id/messages/:messageId - Elimina un proprio messaggio
router.delete('/:id/messages/:messageId', protect, chatController.deleteMessage);
// POST /api/chats/:id/upload   - Carica foto in chat
router.post('/:id/upload', protect, chatImageUpload.single('image'), chatController.uploadChatImage);
// POST /api/chats/:id/upload-audio - Carica messaggio vocale in chat
router.post('/:id/upload-audio', protect, chatAudioUpload.single('audio'), chatController.uploadChatAudio);

module.exports = router;
