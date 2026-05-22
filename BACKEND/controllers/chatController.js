```javascript
const asyncHandler = require('express-async-handler');
const Chat = require('../models/Chat');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Ottenere i dettagli di una chat e i messaggi
// @route   GET /api/chats/:id
const getChatById = asyncHandler(async (req, res, next) => {
    try {
        const chatId = req.params.id;
        const userId = req.user.id;

        // 1. Validazione ID
        if (!chatId || !chatId.match(/^[0-9a-fA-F]{24}$/)) {
            return next(new ErrorResponse(`ID chat non valido`, 400));
        }

        // 2. Trova la chat (i messaggi sono già inclusi grazie al 'populate' nel modello)
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return next(new ErrorResponse(`Chat non trovata`, 404));
        }

        // 3. Sicurezza: Verifica partecipazione
        const isParticipant = chat.participants.some(p => {
            const participantId = p._id ? p._id.toString() : p.toString();
            return participantId === userId;
        });
        
        if (!isParticipant) {
            return next(new ErrorResponse('Non autorizzato ad accedere a questa chat', 403));
        }

        // 4. Restituisci la chat e i messaggi incorporati
        const messages = chat.messages || [];

        res.status(200).json({
            success: true,
            data: chat,
            messages: messages
        });
    } catch (error) {
        console.error('Errore nel recupero della chat:', error);
        return next(new ErrorResponse('Errore nel recupero della chat', 500));
    }
});

// @desc    Inviare un messaggio (Endpoint HTTP Fallback)
// @route   POST /api/chats/:id/messages
const sendMessage = asyncHandler(async (req, res, next) => {
    try {
        const chatId = req.params.id;
        const { content, type = 'text' } = req.body;
        const userId = req.user.id;

        // Validazione input
        if (!content || !content.trim()) {
            return next(new ErrorResponse('Il messaggio non può essere vuoto', 400));
        }

        if (!chatId || !chatId.match(/^[0-9a-fA-F]{24}$/)) {
            return next(new ErrorResponse(`ID chat non valido`, 400));
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return next(new ErrorResponse('Chat non trovata', 404));
        }

        // Verifica partecipazione
        const isParticipant = chat.participants.some(p => {
            const participantId = p._id ? p._id.toString() : p.toString();
            return participantId === userId;
        });

        if (!isParticipant) {
            return next(new ErrorResponse('Non autorizzato a inviare messaggi in questa chat', 403));
        }

        // Usa il metodo del modello per aggiungere il messaggio
        await chat.addMessage(userId, content, type);
        
        // Recupera l'ultimo messaggio aggiunto e popolalo per il ritorno
        const populatedChat = await Chat.findById(chatId).populate('messages.sender', 'nickname profileImage');
        const messageToSend = populatedChat.messages[populatedChat.messages.length - 1];

        // ⚡ SOCKET: Emetti l'evento alla stanza della chat
        if (req.io) {
            req.io.to(chatId).emit('receiveMessage', messageToSend);
        }

        // 🔔 NOTIFICHE PUSH
        try {
            const sender = await User.findById(userId);
            if (sender) {
                const otherParticipants = chat.participants
                    .map(p => p._id ? p._id.toString() : p.toString())
                    .filter(id => id !== userId);

                for (const pId of otherParticipants) {
                    const recipient = await User.findById(pId);
                    if (recipient?.fcmToken) {
                        await notificationService.sendPushNotification(
                            recipient.fcmToken,
                            `Messaggio da ${sender.nickname || sender.username}`,
                            content.substring(0, 100), // Limita la lunghezza del contenuto
                            { 
                                type: 'chat_message', 
                                chatId: chatId,
                                senderId: userId
                            }
                        );
                    }
                }
            }
        } catch (err) {
            console.error('Errore invio notifiche push chat:', err);
            // Non blocchiamo la risposta per errori di notifica
        }

        res.status(201).json({
            success: true,
            data: messageToSend
        });
    } catch (error) {
        console.error('Errore nell\'invio del messaggio:', error);
        return next(new ErrorResponse('Errore nell\'invio del messaggio', 500));
    }
});

module.exports = {
    getChatById,
    sendMessage
};
```