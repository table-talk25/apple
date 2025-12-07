import { io } from 'socket.io-client';
import { SERVER_URL } from '../utils/config';
import { Preferences } from '@capacitor/preferences';

let socket = null;

export const connectSocket = async () => {
    const { value: token } = await Preferences.get({ key: 'token' });
    if (!token) {
        console.warn('[Socket] ❌ Token mancante, impossibile connettersi');
        return;
    }

    socket = io(SERVER_URL, {
        auth: { token },
        transports: ['websocket'], // Evita polling error
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 3000,
        timeout: 20000,
        autoConnect: true
    });

    socket.on('connect', () => {
        console.log(`[Socket] ✅ Connesso con ID: ${socket.id}`);
    });

    socket.on('connect_error', (err) => {
        console.error(`[Socket] ❌ Errore connessione socket: ${err.message}`);
    });

    socket.on('disconnect', (reason) => {
        console.warn(`[Socket] ⚠️ Disconnessione socket: ${reason}`);
    });
};

export const joinChatRoom = (chatId) => {
    if (socket) {
        console.log(`[Socket] ✅ Unisco alla stanza: ${chatId}`);
        socket.emit('joinChatRoom', chatId);
    }
};

export const leaveChatRoom = (chatId) => {
    if (socket) {
        console.log(`[Socket] 🟠 Esco dalla stanza: ${chatId}`);
        socket.emit('leaveChatRoom', chatId);
    }
};

export const sendTyping = (chatId, isTyping) => {
    if (socket) {
        socket.emit('typing', { chatId, isTyping });
    }
};

export const sendMessage = (chatId, content, callback) => {
    if (socket) {
        socket.emit('sendMessage', { chatId, content }, (response) => {
            if (callback) callback(response);
        });
    }
};

export const listenToMessages = (handler) => {
    if (socket) {
        socket.on('receiveMessage', handler);
    }
};

export const listenToTyping = (handler) => {
    if (socket) {
        socket.on('userTyping', handler);
    }
};

export const disconnectSocket = () => {
    if (socket) {
        console.log('[Socket] 🔌 Disconnessione manuale');
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = () => socket;
