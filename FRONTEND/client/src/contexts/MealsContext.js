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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const createMeal = useCallback(async (formData) => {
        setLoading(true);
        try {
            const created = await mealService.createMeal(formData);
            // Inserisci subito in cima al feed locale
            setMeals(current => Array.isArray(current) ? [created, ...current] : [created]);
            return created;
        } catch (error) {
            console.error("Errore durante la creazione del TableTalk® nel context:", error);
            throw error;
        } finally {
            setLoading(false);
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

    // 4. Prepariamo l'oggetto 'value' che il provider condividerà.
    // Ho rimosso 'updateMeal' perché non era definito, causando un altro potenziale errore.
    const value = {
        meals,
        loading,
        error,
        fetchMeals,
        removeMealFromState,
        upsertMeal,
        createMeal,
    };

    // 5. Il Provider avvolge i figli e fornisce il 'value'
    return (
        <MealsContext.Provider value={value}>
            {children}
        </MealsContext.Provider>
    );
};