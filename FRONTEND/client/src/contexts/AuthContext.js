import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';

import Spinner from '../components/common/Spinner';

import authService from '../services/authService'; 

import profileService from '../services/profileService';

import { authPreferences } from '../utils/preferences';



const AuthContext = createContext();



export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);

    const [token, setToken] = useState(null); 

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);



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

                        // Verifica token in background

                        authService.verifyToken().catch(e => console.log('Verifica background:', e));

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



    const login = async (credentials) => {

      const data = await authService.login(credentials);

      try {

        await authPreferences.saveToken(data.token);

        await authPreferences.saveUser(data.user);

      } catch(e) { console.error(e); }

      setUser(data.user); setToken(data.token); setIsAuthenticated(true);

    };

    

    const register = async (d) => {

        const data = await authService.register(d);

        setUser(data.user); setToken(data.token); setIsAuthenticated(true);

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

        login, logout, register, deleteAccount, updateUser

      }), [user, token, isAuthenticated, loading, error]);

  

      return (

          <AuthContext.Provider value={value}>

              {loading ? <Spinner fullscreen label="Caricamento..." /> : children}

          </AuthContext.Provider>

      );

  };

  

export const useAuth = () => useContext(AuthContext);
