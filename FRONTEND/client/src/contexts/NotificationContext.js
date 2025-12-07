// File: FRONTEND/client/src/contexts/NotificationContext.js (Versione Corretta)

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext'; // 1. IMPORTA IL CONTEXT DI AUTENTICAZIONE
import notificationService from '../services/notificationService';
import { toast } from 'react-toastify';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { isAuthenticated } = useAuth(); // 2. USA LO STATO DI AUTENTICAZIONE
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        // 3. CONTROLLO DI SICUREZZA:
        // Se l'utente non è autenticato, non fare nulla e pulisci i dati.
        if (!isAuthenticated) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        setLoading(true);
        try {
            const list = await notificationService.getNotifications();
            if (Array.isArray(list)) {
                setNotifications(list);
                const unread = list.filter(n => !(n.isRead || n.read)).length;
    setUnreadCount(unread);
} else {
                console.warn('Formato notifiche non valido ricevuto dal server:', list);
    setNotifications([]);
    setUnreadCount(0);
}
        } catch (error) {
            console.error("Errore nel caricamento delle notifiche:", error);
            // Non mostriamo un toast aggressivo per non allarmare l'utente per problemi temporanei
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]); // La funzione ora dipende da isAuthenticated

    useEffect(() => {
        // 4. EFFETTO INTELLIGENTE:
        // Questo useEffect si attiverà ogni volta che `isAuthenticated` cambia.
        // - Al login (da false a true), caricherà le notifiche.
        // - Al logout (da true a false), pulirà le notifiche.
        fetchNotifications();
    }, [fetchNotifications]);

    const markAsRead = async (notificationId) => {
        try {
            await notificationService.markAsRead(notificationId);
            setNotifications(prev => 
                prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
        } catch (error) {
            toast.error("Errore nel segnare la notifica come letta.");
        }
    };
    
    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            toast.error("Errore nel segnare tutte le notifiche come lette.");
        }
    };

    const value = {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);