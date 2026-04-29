import React, { createContext, useState, useEffect, useContext, useMemo, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import Spinner from '../components/common/Spinner';

import authService from '../services/authService';

import profileService from '../services/profileService';

import { flushPendingPushToken } from '../services/pushNotificationService';

import { authPreferences } from '../utils/preferences';



/** Unisce il profilo precedente con l'aggiornamento server senza perdere il flag email
 *  se la risposta fosse incompleta (non dovrebbe più succedere dopo il fix su /auth/me). */
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



const AuthContext = createContext();



export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);

    const [token, setToken] = useState(null); 

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    // Focus / visibility / appState: evita raffiche di GET /auth/me (vedi useEffect sotto)
    const lastRefreshUserAtRef = useRef(0);
    const refreshUserInFlightRef = useRef(false);



    useEffect(() => {

        let isMounted = true;

        

        const checkAuth = async () => {

            console.log('[AuthContext] START checkAuth...');

            

            // TIMEOUT DI 3 SECONDI: Se il telefono non risponde, entra comunque!

            const timeoutPromise = new Promise((resolve) => {

                setTimeout(() => {

                    console.warn('[AuthContext] ⚠️ TIMEOUT: Sblocco forzato.');

                    resolve({ isTimeout: true });

                }, 3000);

            });



            try {

                // Gara: vince chi arriva prima tra i dati reali e il timer

                const result = await Promise.race([

                    authPreferences.getUser().catch(e => null), 

                    timeoutPromise

                ]);



                if (!isMounted) return;



                if (result && result.isTimeout) {

                    // Ha vinto il timeout -> Sblocca l'app come ospite

                    setUser(null); setToken(null); setIsAuthenticated(false);

                } else if (result) {

                    // Dati trovati -> Login automatico

                    const storedUser = result;

                    const storedToken = await authPreferences.getToken().catch(e => null);

                    

                    if (storedUser && storedToken) {

                        setUser(storedUser);

                        setToken(storedToken);

                        setIsAuthenticated(true);

                        // 🔄 Verifica token in background AND aggiorna lo state in memoria
                        // se il backend ha dati più freschi (es. email verificata da
                        // un altro browser/tab nel frattempo). Senza questo, banner
                        // "Conferma email" rimaneva anche dopo la verifica avvenuta.

                        authService.verifyToken()
                            .then(freshUser => {
                                if (isMounted && freshUser) {
                                    setUser(prev => mergeUserFromServer(prev, freshUser));
                                }
                            })
                            .catch(e => console.log('Verifica background:', e));

                        // 📲 Se al boot l'utente è già loggato e c'è un token push
                        // parcheggiato (registrato prima del login), invialo ora.
                        flushPendingPushToken();

                    } else {

                        setUser(null); setToken(null); setIsAuthenticated(false);

                    }

                } else {

                    setUser(null); setToken(null); setIsAuthenticated(false);

                }

            } catch (error) {

                console.error('[AuthContext] Errore:', error);

                if (isMounted) { setUser(null); setToken(null); setIsAuthenticated(false); }

            } finally {

                // RIMUOVE LO SPINNER IN OGNI CASO

                if (isMounted) {

                    console.log('[AuthContext] STOP Loading. App pronta.');

                    setLoading(false);

                }

            }

        };



        checkAuth();

        return () => { isMounted = false; };

    }, []);



    // 👁️ Quando la finestra/app torna attiva, rinfresca i dati utente dal server.
    // Su mobile Capacitor il rientro dall'email/browser non sempre scatena "focus",
    // quindi ascoltiamo anche appStateChange per far sparire subito il banner.
    // Throttle + in-flight: un solo "ritorno in app" non deve generare 2–3 verifyToken
    // paralleli (focus+visibility+appState nello stesso istante).

    useEffect(() => {

        if (!isAuthenticated) return;

        let isCancelled = false;
        let appStateListener;
        const THROTTLE_MS = 10_000;

        const refreshUser = () => {
            if (isCancelled) return;
            if (refreshUserInFlightRef.current) return;
            const now = Date.now();
            if (now - lastRefreshUserAtRef.current < THROTTLE_MS) return;

            lastRefreshUserAtRef.current = now;
            refreshUserInFlightRef.current = true;

            authService.verifyToken()
                .then(freshUser => {
                    if (isCancelled) return;
                    if (freshUser) setUser(prev => mergeUserFromServer(prev, freshUser));
                })
                .catch(() => { /* silenzioso, non disturbiamo l'utente */ })
                .finally(() => {
                    refreshUserInFlightRef.current = false;
                });
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) refreshUser();
        };

        window.addEventListener('focus', refreshUser);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (Capacitor.isNativePlatform()) {
            CapacitorApp.addListener('appStateChange', ({ isActive }) => {
                if (isActive) refreshUser();
            }).then(listener => {
                appStateListener = listener;
            }).catch(() => { /* plugin non disponibile: focus/visibility bastano sul web */ });
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

      try {

        await authPreferences.saveToken(data.token);

        await authPreferences.saveUser(data.user);

      } catch(e) { console.error(e); }

      setUser(prev => mergeUserFromServer(prev, data.user)); setToken(data.token); setIsAuthenticated(true);

      // Drena un eventuale token push registrato prima del login (vedi pushNotificationService)
      flushPendingPushToken();

    };



    const register = async (d) => {

        const data = await authService.register(d);

        setUser(prev => mergeUserFromServer(prev, data.user)); setToken(data.token); setIsAuthenticated(true);

        flushPendingPushToken();

    };



    /**
     * 🔑 Auto-login da verifica email: salva token + user e aggiorna lo stato.
     * Chiamato dalla pagina /verify-email quando il backend ritorna un JWT
     * insieme alla conferma. Così l'utente non deve fare login manualmente
     * dopo aver cliccato il link nell'email.
     */
    const loginFromVerification = async (data) => {
        if (!data || !data.token || !data.user) return;
        try {
            await authPreferences.saveToken(data.token);
            await authPreferences.saveUser(data.user);
        } catch (e) { console.error(e); }
        setUser(prev => mergeUserFromServer(prev, data.user)); setToken(data.token); setIsAuthenticated(true);
        flushPendingPushToken();
    };



    const logout = async () => {

        setUser(null); setToken(null); setIsAuthenticated(false);

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

        user, token, isAuthenticated, loading, error,

        login, logout, register, deleteAccount, updateUser, loginFromVerification

      }), [user, token, isAuthenticated, loading, error]);

  

      return (

          <AuthContext.Provider value={value}>

              {loading ? <Spinner fullscreen label="Caricamento..." /> : children}

          </AuthContext.Provider>

      );

  };

  

export const useAuth = () => useContext(AuthContext);
