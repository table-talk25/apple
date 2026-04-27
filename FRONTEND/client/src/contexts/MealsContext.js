// File: FRONTEND/client/src/contexts/MealsContext.js (Versione Corretta e Riorganizzata)

import React, { createContext, useContext, useState, useCallback } from 'react';
import mealService from '../services/mealService';
import { toast } from 'react-toastify';

// 1. Creiamo il Context a livello principale del file
const MealsContext = createContext(null);

// 2. Creiamo e ESPORTIAMO il nostro hook personalizzato a livello principale
export const useMeals = () => {
    const context = useContext(MealsContext);
    if (context === null) {
        throw new Error('Il componente che stai usando non è all\'interno del MealsProvider.');
    }
    return context;
};

// 3. Creiamo e ESPORTIAMO il componente Provider
export const MealsProvider = ({ children }) => {
    const [meals, setMeals] = useState([]);
    // ⚠️ Stato di caricamento separato per azione, così un refetch generale
    // non disabilita i bottoni "Unisciti"/"Abbandona", e un join su un meal
    // non blocca le azioni sugli altri.
    //   - loading      → solo per fetchMeals (lista)
    //   - creating     → solo per createMeal
    //   - actionMealId → ID del meal su cui c'è un join/leave in volo (uno alla volta)
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [actionMealId, setActionMealId] = useState(null);
    const [error, setError] = useState('');

    const createMeal = useCallback(async (formData) => {
        setCreating(true);
        try {
            const created = await mealService.createMeal(formData);
            // Inserisci subito in cima al feed locale
            setMeals(current => Array.isArray(current) ? [created, ...current] : [created]);
            return created;
        } catch (error) {
            console.error("Errore durante la creazione del TableTalk® nel context:", error);
            throw error;
        } finally {
            setCreating(false);
        }
    }, []);

    const fetchMeals = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const baseParams = { status: 'upcoming,ongoing', limit: 100, suppressErrorAlert: true, ...params };
            const globalResp = await mealService.getMeals(baseParams);
            const globalMeals = Array.isArray(globalResp) ? globalResp : (globalResp?.data || []);
            // Unione con i miei futuri (per garantire visibilità immediata dei creati da me)
            let myMeals = [];
            try {
                const myResp = await mealService.getUserMeals({ status: 'upcoming,ongoing', suppressErrorAlert: true });
                myMeals = Array.isArray(myResp?.data) ? myResp.data : (Array.isArray(myResp) ? myResp : []);
            } catch (_) { /* opzionale */ }
            const mapById = new Map();
            // Metti prima i globali, poi i miei: i miei (appena creati/aggiornati) sovrascrivono i globali
            [...globalMeals, ...myMeals].forEach(m => { if (m && m._id) mapById.set(m._id, m); });
            const merged = Array.from(mapById.values()).sort((a, b) => new Date(a?.date || 0) - new Date(b?.date || 0));
            setMeals(merged);
            setError('');
        } catch (err) {
            setError('Errore nel caricamento dei TableTalk®. Riprova più tardi.');
            setMeals([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const removeMealFromState = (mealId) => {
        setMeals(currentMeals => currentMeals.filter(meal => meal._id !== mealId));
    };

    const upsertMeal = (updatedMeal) => {
        if (!updatedMeal || !updatedMeal._id) return;
        setMeals(current => {
            const exists = Array.isArray(current) && current.some(m => m._id === updatedMeal._id);
            if (!exists) return [updatedMeal, ...(current || [])];
            return current.map(m => (m._id === updatedMeal._id ? { ...m, ...updatedMeal } : m));
        });
    };

    // 🍽️ Iscrizione a un TableTalk®: callback unica con toast di successo/errore
    // e aggiornamento dello state locale (upsert immediato + refetch dopo successo)
    const joinMeal = useCallback(async (mealId) => {
        if (!mealId) {
            const err = new Error('mealId mancante');
            toast.error('Impossibile unirsi al TableTalk®: ID mancante.');
            throw err;
        }
        setActionMealId(mealId);
        try {
            const response = await mealService.joinMeal(mealId);
            // Il backend può restituire { data: meal } oppure direttamente il meal
            const updatedMeal = response?.data && response.data._id
                ? response.data
                : (response && response._id ? response : null);

            // Aggiornamento ottimistico immediato dello state locale (se il server ha risposto con il meal)
            if (updatedMeal) {
                upsertMeal(updatedMeal);
            }

            toast.success('Ti sei unito al TableTalk® con successo!');

            // Refetch in background per allineare lo state (partecipanti, conteggi, ecc.)
            // Non blocchiamo il return: il chiamante può già usare updatedMeal.
            fetchMeals().catch(() => { /* errore già gestito da fetchMeals */ });

            return updatedMeal || response;
        } catch (err) {
            const status = err?.response?.status;
            const serverMessage = err?.response?.data?.message;
            let userMessage = serverMessage || 'Errore durante l\'iscrizione al TableTalk®. Riprova più tardi.';
            if (status === 401) {
                userMessage = 'Devi effettuare l\'accesso per unirti a un TableTalk®.';
            } else if (status === 403) {
                userMessage = serverMessage || 'Non sei autorizzato a unirti a questo TableTalk®.';
            } else if (status === 404) {
                userMessage = 'TableTalk® non trovato. Potrebbe essere stato rimosso.';
            } else if (status === 409) {
                userMessage = serverMessage || 'Sei già iscritto a questo TableTalk®.';
            }
            toast.error(userMessage);
            console.error('Errore durante joinMeal nel context:', err);
            throw err;
        } finally {
            setActionMealId(null);
        }
    }, [fetchMeals]);

    // 🚪 Abbandono di un TableTalk®: callback unica con toast di successo/errore
    // e aggiornamento dello state locale (rimozione/upsert + refetch dopo successo)
    const leaveMeal = useCallback(async (mealId) => {
        if (!mealId) {
            const err = new Error('mealId mancante');
            toast.error('Impossibile abbandonare il TableTalk®: ID mancante.');
            throw err;
        }
        setActionMealId(mealId);
        try {
            const response = await mealService.leaveMeal(mealId);
            // Il backend può restituire { data: meal } oppure direttamente il meal aggiornato
            const updatedMeal = response?.data && response.data._id
                ? response.data
                : (response && response._id ? response : null);

            if (updatedMeal) {
                // Aggiornamento ottimistico: rimpiazziamo il meal nello state con la versione senza di noi
                upsertMeal(updatedMeal);
            }

            toast.success('Hai abbandonato il TableTalk®.');

            // Refetch in background per riallineare partecipanti/contatori globali
            fetchMeals().catch(() => { /* errore già gestito da fetchMeals */ });

            return updatedMeal || response;
        } catch (err) {
            const status = err?.response?.status;
            const serverMessage = err?.response?.data?.message;
            let userMessage = serverMessage || 'Errore durante l\'abbandono del TableTalk®. Riprova più tardi.';
            if (status === 401) {
                userMessage = 'Devi effettuare l\'accesso per abbandonare un TableTalk®.';
            } else if (status === 403) {
                userMessage = serverMessage || 'Non sei autorizzato a abbandonare questo TableTalk®.';
            } else if (status === 404) {
                userMessage = 'TableTalk® non trovato. Potrebbe essere stato rimosso.';
            }
            toast.error(userMessage);
            console.error('Errore durante leaveMeal nel context:', err);
            throw err;
        } finally {
            setActionMealId(null);
        }
    }, [fetchMeals]);

    // Helper per i bottoni: vero solo se c'è un'azione (join/leave) in volo
    // su QUESTO specifico meal. I bottoni degli altri meal restano cliccabili.
    const isActionLoading = useCallback((mealId) => {
        return Boolean(mealId) && actionMealId === mealId;
    }, [actionMealId]);

    // 4. Prepariamo l'oggetto 'value' che il provider condividerà.
    // - `loading` resta = "loading lista" (consumatori: MealsPage, SearchMealsPage)
    // - `creating` = createMeal in corso
    // - `actionMealId` + `isActionLoading(id)` = join/leave in corso, per-meal
    const value = {
        meals,
        loading,
        creating,
        actionMealId,
        isActionLoading,
        error,
        fetchMeals,
        removeMealFromState,
        upsertMeal,
        createMeal,
        joinMeal,
        leaveMeal,
    };

    // 5. Il Provider avvolge i figli e fornisce il 'value'
    return (
        <MealsContext.Provider value={value}>
            {children}
        </MealsContext.Provider>
    );
};