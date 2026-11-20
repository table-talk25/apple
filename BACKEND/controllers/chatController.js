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
            const senderId = m.sender && m.sender._id ? m.sender._id.toString() : (m.sender ? m.sender.toString() : '');
            if (senderId === userId) return false;
            const readArr = Array.isArray(m.read) ? m.read : [];
            const inRead = readArr.some(r => (r && r._id ? r._id.toString() : String(r)) === userId);
            if (inRead) return false;
            const readBy = Array.isArray(m.readBy) ? m.readBy : [];
            const inReadBy = readBy.some(r => {
                const uid = r && r.user ? (r.user._id ? r.user._id.toString() : r.user.toString()) : (r ? r.toString() : '');
                return uid === userId;
            });
            return !inReadBy;
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

    const getChatSortTs = (c) => {
        const raw = c.lastMessage?.timestamp || c.updatedAt || 0;
        const ts = new Date(raw).getTime();
        return Number.isFinite(ts) ? ts : 0;
    };

    // Ordine cronologico rigoroso: dalla chat più recente in alto fino alla più vecchia
    enriched.sort((a, b) => getChatSortTs(b) - getChatSortTs(a));

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

    const chat = await Chat.findById(chatId)
        .populate('mealId', 'title date host imageUrl coverImage status')
        .lean();

    if (!chat) {
        return next(new ErrorResponse(`Chat non trovata`, 404));
    }

    const isParticipant = (chat.participants || []).some(
        p => (p && p._id ? p._id.toString() : String(p)) === userId
    );
    if (!isParticipant) {
        return next(new ErrorResponse('Non autorizzato ad accedere a questa chat', 403));
    }

    // Segna i messaggi della chat come letti in background per questo utente
    Chat.updateOne(
        { _id: chatId },
        { $addToSet: { 'messages.$[].read': userId } }
    ).catch(() => {});

    const messages = chat.messages || [];

    res.status(200).json({
        success: true,
        data: chat,
        messages: messages
    });
});

const path = require('path');

const sanitizeAttachments = (attachments) => {
    if (!Array.isArray(attachments)) return [];
    return attachments
        .filter((a) => a && (a.type === 'image' || a.type === 'audio') && typeof a.url === 'string' && /^https?:\/\//i.test(a.url))
        .slice(0, 4)
        .map((a) => ({
            type: a.type,
            url: a.url,
            name: typeof a.name === 'string' ? a.name.slice(0, 120) : (a.type === 'audio' ? 'voice.webm' : 'image.jpg'),
            size: typeof a.size === 'number' ? a.size : undefined,
            duration: typeof a.duration === 'number' ? Math.round(a.duration) : undefined,
        }));
};

// @desc    Caricare una foto in chat
// @route   POST /api/chats/:id/upload
const uploadChatImage = asyncHandler(async (req, res, next) => {
    const chatId = req.params.id;
    const userId = req.user.id;

    if (!chatId || !chatId.match(/^[0-9a-fA-F]{24}$/)) {
        return next(new ErrorResponse('ID chat non valido', 400));
    }

    if (!req.file || !req.file.buffer) {
        return next(new ErrorResponse('Nessuna immagine fornita', 400));
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return next(new ErrorResponse('Formato immagine non supportato. Usa JPEG, PNG, GIF o WebP.', 400));
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        return next(new ErrorResponse('Chat non trovata', 404));
    }

    const isParticipant = chat.participants.some(
        (p) => (p._id ? p._id.toString() : p.toString()) === userId
    );
    if (!isParticipant) {
        return next(new ErrorResponse('Non autorizzato a caricare foto in questa chat', 403));
    }

    const { uploadImage } = require('../services/firebaseStorageService');
    const ext = path.extname(req.file.originalname || '') || '.jpg';
    const uniqueFileName = `chat_${chatId}_${userId}_${Date.now()}${ext}`;

    try {
        const url = await uploadImage(req.file.buffer, uniqueFileName, 'chat-images', req.file.mimetype);
        res.status(201).json({
            success: true,
            data: {
                type: 'image',
                url,
                name: req.file.originalname || uniqueFileName,
                size: req.file.size,
            },
        });
    } catch (error) {
        console.error('❌ [ChatUpload] Errore upload foto chat:', error);
        return next(new ErrorResponse('Errore nel caricamento della foto.', 500));
    }
});

// @desc    Caricare un messaggio vocale in chat
// @route   POST /api/chats/:id/upload-audio
const uploadChatAudio = asyncHandler(async (req, res, next) => {
    const chatId = req.params.id;
    const userId = req.user.id;

    if (!chatId || !chatId.match(/^[0-9a-fA-F]{24}$/)) {
        return next(new ErrorResponse('ID chat non valido', 400));
    }

    if (!req.file || !req.file.buffer) {
        return next(new ErrorResponse('Nessun file audio fornito', 400));
    }

    const rawMime = (req.file.mimetype || '').split(';')[0].trim().toLowerCase();
    const isAudio = rawMime.startsWith('audio/') || rawMime === 'video/webm';
    if (!isAudio) {
        return next(new ErrorResponse('Formato audio non supportato.', 400));
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        return next(new ErrorResponse('Chat non trovata', 404));
    }

    const isParticipant = chat.participants.some(
        (p) => (p._id ? p._id.toString() : p.toString()) === userId
    );
    if (!isParticipant) {
        return next(new ErrorResponse('Non autorizzato a inviare vocali in questa chat', 403));
    }

    const extMap = {
        'audio/webm': '.webm',
        'video/webm': '.webm',
        'audio/mp4': '.m4a',
        'audio/x-m4a': '.m4a',
        'audio/aac': '.aac',
        'audio/ogg': '.ogg',
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
    };
    const ext = extMap[rawMime] || path.extname(req.file.originalname || '') || '.webm';
    const contentType = rawMime === 'video/webm' ? 'audio/webm' : rawMime;
    const uniqueFileName = `voice_${chatId}_${userId}_${Date.now()}${ext}`;
    const durationNum = req.body?.duration ? Math.max(1, Math.round(Number(req.body.duration))) : undefined;

    const { uploadImage } = require('../services/firebaseStorageService');
    try {
        const url = await uploadImage(req.file.buffer, uniqueFileName, 'chat-audio', contentType);
        res.status(201).json({
            success: true,
            data: {
                type: 'audio',
                url,
                name: req.file.originalname || uniqueFileName,
                size: req.file.size,
                duration: Number.isFinite(durationNum) ? durationNum : undefined,
            },
        });
    } catch (error) {
        console.error('❌ [ChatUploadAudio] Errore upload vocale chat:', error);
        return next(new ErrorResponse('Errore nel caricamento del messaggio vocale.', 500));
    }
});

// @desc    Inviare un messaggio (Endpoint HTTP Fallback)
// @route   POST /api/chats/:id/messages
const sendMessage = asyncHandler(async (req, res, next) => {
    const chatId = req.params.id;
    const { content, replyTo, attachments } = req.body;
    const userId = req.user.id;

    const sanitizedAttachments = sanitizeAttachments(attachments);
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    const hasAudio = sanitizedAttachments.some((a) => a.type === 'audio');
    const fallbackLabel = hasAudio ? '🎤 Messaggio vocale' : (sanitizedAttachments.length > 0 ? '📷 Foto' : '');
    const finalContent = trimmedContent || fallbackLabel;

    if (!finalContent) {
        return next(new ErrorResponse('Il messaggio non può essere vuoto', 400));
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        return next(new ErrorResponse('Chat non trovata', 404));
    }

    const isParticipant = chat.participants.some(
        (p) => (p._id ? p._id.toString() : p.toString()) === userId
    );
    if (!isParticipant) {
        return next(new ErrorResponse('Non autorizzato a scrivere in questa chat', 403));
    }

    // Sanitizza replyTo: accetta solo campi attesi
    const sanitizedReplyTo = (replyTo && replyTo._id && replyTo.message)
        ? { _id: replyTo._id, senderName: replyTo.senderName || '', message: String(replyTo.message).substring(0, 200) }
        : null;

    await chat.addMessage(userId, finalContent, sanitizedAttachments, sanitizedReplyTo);
    
    const populatedChat = await chat.populate('messages.sender', 'nickname profileImage');
    const messageToSend = populatedChat.messages[populatedChat.messages.length - 1];

    const { getIO } = require('../socket');
    const io = req.io || getIO();
    if (io) {
        io.to(chatId).emit('receiveMessage', messageToSend);
    }

    try {
        const sender = await User.findById(userId).select('nickname profileImage');
        if (sender && typeof notificationService.handleChatNotification === 'function') {
            await notificationService.handleChatNotification(chat, sender, finalContent, messageToSend);
        }
    } catch (err) {
        console.error('Errore invio notifiche chat:', err);
    }

    res.status(201).json({
        success: true,
        data: messageToSend
    });
});

// @desc    Modificare un proprio messaggio in chat
// @route   PUT /api/chats/:id/messages/:messageId
const editMessage = asyncHandler(async (req, res, next) => {
    const { id: chatId, messageId } = req.params;
    const userId = req.user.id;
    const trimmed = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

    if (!trimmed || trimmed.length > 500) {
        return next(new ErrorResponse('Testo non valido (1-500 caratteri)', 400));
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        return next(new ErrorResponse('Chat non trovata', 404));
    }

    const message = chat.messages.id(messageId);
    if (!message) {
        return next(new ErrorResponse('Messaggio non trovato', 404));
    }

    const senderId = message.sender && message.sender._id
        ? message.sender._id.toString()
        : message.sender.toString();
    if (senderId !== userId) {
        return next(new ErrorResponse('Puoi modificare solo i tuoi messaggi', 403));
    }

    message.content = trimmed;
    message.edited = true;
    message.editedAt = new Date();
    await chat.save();

    const payload = {
        chatId,
        messageId: message._id.toString(),
        content: message.content,
        edited: true,
        editedAt: message.editedAt,
    };

    const { getIO } = require('../socket');
    const io = req.io || getIO();
    if (io) {
        io.to(chatId).emit('messageEdited', payload);
    }

    res.status(200).json({ success: true, data: payload });
});

// @desc    Eliminare un proprio messaggio in chat
// @route   DELETE /api/chats/:id/messages/:messageId
const deleteMessage = asyncHandler(async (req, res, next) => {
    const { id: chatId, messageId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
        return next(new ErrorResponse('Chat non trovata', 404));
    }

    const message = chat.messages.id(messageId);
    if (!message) {
        return next(new ErrorResponse('Messaggio non trovato', 404));
    }

    const senderId = message.sender && message.sender._id
        ? message.sender._id.toString()
        : message.sender.toString();
    if (senderId !== userId) {
        return next(new ErrorResponse('Puoi eliminare solo i tuoi messaggi', 403));
    }

    chat.messages.pull({ _id: message._id });
    await chat.save();

    const payload = { chatId, messageId: message._id.toString() };

    const { getIO } = require('../socket');
    const io = req.io || getIO();
    if (io) {
        io.to(chatId).emit('messageDeleted', payload);
    }

    res.status(200).json({ success: true, data: payload });
});

module.exports = {
    getUserChats,
    getChatById,
    sendMessage,
    editMessage,
    deleteMessage,
    uploadChatImage,
    uploadChatAudio,
};
