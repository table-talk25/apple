import React, { createContext, useState, useEffect, useContext, useMemo, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import Spinner from '../components/common/Spinner';
import authService from '../services/authService';
import profileService from '../services/profileService';
import { flushPendingPushToken } from '../services/pushNotificationService';
import { authPreferences } from '../utils/preferences';

function mergeUserFromServer(prev, server) {
    if (!server) return prev;
    const merged = { ...(prev || {}), ...server };
    if (Object.prototype.hasOwnProperty.call(server, 'isEmailVerified')) {
        merged.isEmailVerified = Boolean(server.isEmailVerified);
    }
    if (Object.prototype.hasOwnProperty.call(server, 'profileCompleted')) {
        merged.profileCompleted = Boolean(server.profileCompleted);
    }
    return merged;
}

// Chiavi usate da @capacitor/preferences su web (localStorage sottostante)
const CAP_PREF_KEYS = ['user', 'cap_usr', 'tt_user', 'authUser'];
const CAP_TOK_KEYS  = ['token', 'cap_tok', 'tt_token', 'authToken'];

/** Lettura sincrona da localStorage: istantanea su web, nessun await */
function readFromLocalStorage() {
    let user = null;
    let token = null;
    try {
        for (const k of CAP_PREF_KEYS) {
            const v = localStorage.getItem(k);
            if (v && v !== 'undefined' && v !== 'null') {
                user = JSON.parse(v);
                break;
            }
        }
        for (const k of CAP_TOK_KEYS) {
            const v = localStorage.getItem(k);
            if (v && v !== 'undefined' && v !== 'null') {
                token = v;
                break;
            }
        }
    } catch (_) {}
    return { user, token };
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser]                   = useState(null);
    const [token, setToken]                 = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState(null);
    const [serverVerified, setServerVerified] = useState(false);
    const lastRefreshUserAtRef  = useRef(0);
    const refreshUserInFlightRef = useRef(false);

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            console.log('[AuthContext] START checkAuth...');

            // ⚡ Percorso rapido: lettura sincrona da localStorage (0ms su web)
            const { user: fastUser, token: fastToken } = readFromLocalStorage();
            if (fastUser && fastToken) {
                if (isMounted) {
                    setUser(fastUser);
                    setToken(fastToken);
                    setIsAuthenticated(true);
                    setLoading(false); // sblocca l'app immediatamente
                }
                // Verifica token in background
                authService.verifyToken()
                    .then(freshUser => {
                        if (isMounted && freshUser) setUser(prev => mergeUserFromServer(prev, freshUser));
                    })
                    .catch(e => console.log('Verifica background:', e))
                    .finally(() => { if (isMounted) setServerVerified(true); });
                flushPendingPushToken();
                return; // uscita anticipata, nessun timeout necessario
            }

            // 🐢 Percorso lento: Capacitor Preferences (IndexedDB su web) con timeout 8s
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    console.warn('[AuthContext] ⚠️ TIMEOUT: Sblocco forzato.');
                    resolve({ isTimeout: true });
                }, 8000);
            });

            try {
                const result = await Promise.race([
                    authPreferences.getUser().catch(() => null),
                    timeoutPromise
                ]);

                if (!isMounted) return;

                if (result?.isTimeout) {
                    setUser(null); setToken(null); setIsAuthenticated(false);
                    setServerVerified(true);
                } else if (result) {
                    const storedToken = await authPreferences.getToken().catch(() => null);
                    if (result && storedToken) {
                        setUser(result);
                        setToken(storedToken);
                        setIsAuthenticated(true);
                        authService.verifyToken()
                            .then(freshUser => {
                                if (isMounted && freshUser) setUser(prev => mergeUserFromServer(prev, freshUser));
                            })
                            .catch(e => console.log('Verifica background:', e))
                            .finally(() => { if (isMounted) setServerVerified(true); });
                        flushPendingPushToken();
                    } else {
                        setUser(null); setToken(null); setIsAuthenticated(false);
                        setServerVerified(true);
                    }
                } else {
                    setUser(null); setToken(null); setIsAuthenticated(false);
                    setServerVerified(true);
                }
            } catch (err) {
                console.error('[AuthContext] Errore:', err);
                if (isMounted) { setUser(null); setToken(null); setIsAuthenticated(false); }
                setServerVerified(true);
            } finally {
                if (isMounted) {
                    console.log('[AuthContext] STOP Loading. App pronta.');
                    setLoading(false);
                }
            }
        };

        checkAuth();
        return () => { isMounted = false; };
    }, []);

    // 👁️ Quando la finestra/app torna attiva, rinfresca i dati utente dal server
    useEffect(() => {
        if (!isAuthenticated) return;

        let isCancelled = false;
        let appStateListener;
        const THROTTLE_MS = 10_000;

        const refreshUser = () => {
            if (isCancelled || refreshUserInFlightRef.current) return;
            const now = Date.now();
            if (now - lastRefreshUserAtRef.current < THROTTLE_MS) return;
            lastRefreshUserAtRef.current = now;
            refreshUserInFlightRef.current = true;
            authService.verifyToken()
                .then(freshUser => {
                    if (isCancelled) return;
                    if (freshUser) setUser(prev => mergeUserFromServer(prev, freshUser));
                })
                .catch(() => {})
                .finally(() => { refreshUserInFlightRef.current = false; });
        };

        const handleVisibilityChange = () => { if (!document.hidden) refreshUser(); };

        window.addEventListener('focus', refreshUser);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (Capacitor.isNativePlatform()) {
            CapacitorApp.addListener('appStateChange', ({ isActive }) => {
                if (isActive) refreshUser();
            }).then(l => { appStateListener = l; }).catch(() => {});
        }

        return () => {
            isCancelled = true;
            window.removeEventListener('focus', refreshUser);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (appStateListener) appStateListener.remove();
        };
    }, [isAuthenticated]);

    const login = async (credentials) => {
        const data = await authService.login(credentials);
        try { await authPreferences.saveToken(data.token); await authPreferences.saveUser(data.user); } catch(e) { console.error(e); }
        setUser(prev => mergeUserFromServer(prev, data.user)); setToken(data.token); setIsAuthenticated(true); setServerVerified(true);
        flushPendingPushToken();
    };

    const register = async (d) => {
        const data = await authService.register(d);
        setUser(prev => mergeUserFromServer(prev, data.user)); setToken(data.token); setIsAuthenticated(true); setServerVerified(true);
        flushPendingPushToken();
    };

    const loginFromVerification = async (data) => {
        if (!data || !data.token || !data.user) return;
        try { await authPreferences.saveToken(data.token); await authPreferences.saveUser(data.user); } catch (e) { console.error(e); }
        setUser(prev => mergeUserFromServer(prev, data.user)); setToken(data.token); setIsAuthenticated(true); setServerVerified(true);
        flushPendingPushToken();
    };

    const logout = async () => {
        setUser(null); setToken(null); setIsAuthenticated(false); setServerVerified(false);
        await authPreferences.clearAuth();
        try { await authService.logout(); } catch(e) {}
    };

    const deleteAccount = async (p) => {
        await profileService.deleteAccount(p);
        await logout();
        return { success: true };
    };

    const updateUser = async (u) => {
        const m = u ? { ...user, ...u } : user;
        setUser(m);
        try { await authPreferences.saveUser(m); } catch (_) {}
    };

    const value = useMemo(() => ({
        user, token, isAuthenticated, loading, error, serverVerified,
        login, logout, register, deleteAccount, updateUser, loginFromVerification
    }), [user, token, isAuthenticated, loading, error, serverVerified]);

    return (
        <AuthContext.Provider value={value}>
            {loading ? <Spinner fullscreen label="Caricamento..." /> : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
