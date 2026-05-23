const asyncHandler = require('express-async-handler');
const Chat = require('../models/Chat');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Lista di tutte le chat attive dell'utente loggato
// @route   GET /api/chats
const getUserChats = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;

    const chats = await Chat.find({
        participants: userId,
        status: { $ne: 'closed' }
    })
    .populate('participants', 'nickname profileImage')
    .populate('mealId', 'title date host imageUrl coverImage')
    .lean();

    const enriched = chats.map(chat => {
        const msgs = chat.messages || [];
        const lastMsg = msgs[msgs.length - 1] || null;
        const unread = msgs.filter(m => {
            const readBy = m.readBy || [];
            return !readBy.some(r => r.toString() === userId);
        }).length;
        return {
            _id: chat._id,
            name: chat.name || chat.title || null,
            mealId: chat.mealId,
            participants: chat.participants,
            lastMessage: lastMsg ? { content: lastMsg.content, timestamp: lastMsg.timestamp || lastMsg.createdAt } : null,
            unreadCount: unread,
            updatedAt: chat.updatedAt,
        };
    });

    enriched.sort((a, b) => {
        if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.status(200).json({ success: true, data: enriched });
});

// @desc    Ottenere i dettagli di una chat e i messaggi
// @route   GET /api/chats/:id
const getChatById = asyncHandler(async (req, res, next) => {
    const chatId = req.params.id;
    const userId = req.user.id;

    if (!chatId || !chatId.match(/^[0-9a-fA-F]{24}$/)) {
        return next(new ErrorResponse(`ID chat non valido`, 400));
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
        return next(new ErrorResponse(`Chat non trovata`, 404));
    }

    const isParticipant = chat.participants.some(p => p._id.toString() === userId);
    if (!isParticipant) {
        return next(new ErrorResponse('Non autorizzato ad accedere a questa chat', 403));
    }

    const messages = chat.messages || [];

    res.status(200).json({
        success: true,
        data: chat,
        messages: messages
    });
});

// @desc    Inviare un messaggio (Endpoint HTTP Fallback)
// @route   POST /api/chats/:id/messages
const sendMessage = asyncHandler(async (req, res, next) => {
    const chatId = req.params.id;
    const { content, type = 'text', replyTo } = req.body;
    const userId = req.user.id;

    if (!content) {
        return next(new ErrorResponse('Il messaggio non può essere vuoto', 400));
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        return next(new ErrorResponse('Chat non trovata', 404));
    }

    // Sanitizza replyTo: accetta solo campi attesi
    const sanitizedReplyTo = (replyTo && replyTo._id && replyTo.message)
        ? { _id: replyTo._id, senderName: replyTo.senderName || '', message: String(replyTo.message).substring(0, 200) }
        : null;

    await chat.addMessage(userId, content, [], sanitizedReplyTo);
    
    const populatedChat = await chat.populate('messages.sender', 'nickname profileImage');
    const messageToSend = populatedChat.messages[populatedChat.messages.length - 1];

    if (req.io) {
        req.io.to(chatId).emit('receiveMessage', messageToSend);
    }

    const otherParticipants = chat.participants
        .map(p => p._id ? p._id.toString() : p.toString())
        .filter(id => id !== userId);

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
    getUserChats,
    getChatById,
    sendMessage,
};
