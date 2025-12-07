const asyncHandler = require('express-async-handler');
const Chat = require('../models/Chat');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Ottenere i dettagli di una chat e i messaggi
// @route   GET /api/chats/:id
const getChatById = asyncHandler(async (req, res, next) => {
    const chatId = req.params.id;
    const userId = req.user.id;

    // 1. Validazione ID
    if (!chatId || !chatId.match(/^[0-9a-fA-F]{24}$/)) {
        return next(new ErrorResponse(`ID chat non valido`, 400));
    }

    // 2. Trova la chat (i messaggi sono già inclusi grazie al 'populate' nel modello)
    // Nota: Il modello Chat.js ha un middleware 'pre-find' che popola automaticamente i messaggi
    const chat = await Chat.findById(chatId);

    if (!chat) {
        return next(new ErrorResponse(`Chat non trovata`, 404));
    }

    // 3. Sicurezza: Verifica partecipazione
    const isParticipant = chat.participants.some(p => p._id.toString() === userId);
    if (!isParticipant) {
        return next(new ErrorResponse('Non autorizzato ad accedere a questa chat', 403));
    }

    // 4. Restituisci la chat e i messaggi incorporati
    // Ordiniamo i messaggi se necessario, ma solitamente arrivano in ordine di inserimento
    const messages = chat.messages || [];

    res.status(200).json({
        success: true,
        data: chat,      // Il frontend usa response.data.data come oggetto chat
        messages: messages // Passiamo anche i messaggi esplicitamente per sicurezza
    });
});

// @desc    Inviare un messaggio (Endpoint HTTP Fallback)
// @route   POST /api/chats/:id/messages
const sendMessage = asyncHandler(async (req, res, next) => {
    const chatId = req.params.id;
    const { content, type = 'text' } = req.body;
    const userId = req.user.id;

    if (!content) {
        return next(new ErrorResponse('Il messaggio non può essere vuoto', 400));
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        return next(new ErrorResponse('Chat non trovata', 404));
    }

    // Usa il metodo del modello per aggiungere il messaggio (gestisce date e readBy)
    await chat.addMessage(userId, content);
    
    // Recupera l'ultimo messaggio aggiunto e popolalo per il ritorno
    const savedMessage = chat.messages[chat.messages.length - 1];
    
    // Popoliamo il sender per il frontend
    const populatedChat = await chat.populate('messages.sender', 'nickname profileImage');
    const messageToSend = populatedChat.messages[populatedChat.messages.length - 1];

    // ⚡ SOCKET: Emetti l'evento alla stanza della chat
    // Nota: Assicurati che il frontend si sia unito alla stanza 'chatId'
    if (req.io) {
        req.io.to(chatId).emit('receiveMessage', messageToSend);
    }

    // 🔔 NOTIFICHE PUSH
    // Invia notifica agli altri partecipanti
    const otherParticipants = chat.participants
        .map(p => p._id ? p._id.toString() : p.toString())
        .filter(id => id !== userId);

    // (Logica notifiche semplificata)
    try {
        const sender = await User.findById(userId);
        for (const pId of otherParticipants) {
            const recipient = await User.findById(pId);
            if (recipient?.fcmToken) {
                await notificationService.sendPushNotification(
                    recipient.fcmToken,
                    `Messaggio da ${sender.nickname}`,
                    content,
                    { type: 'chat_message', chatId: chatId }
                );
            }
        }
    } catch (err) {
        console.error('Errore invio notifiche push chat:', err);
    }

    res.status(201).json({
        success: true,
        data: messageToSend
    });
});

module.exports = {
    getChatById,
    sendMessage,
    // Mantieni le altre funzioni se usate altrove, ma queste sono le principali
};
