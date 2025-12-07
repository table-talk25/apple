// File: src/hooks/usePluralization.js
// 🌍 HOOK PER PLURALIZZAZIONE DINAMICA
// 
// Questo hook fornisce funzioni semantiche per la pluralizzazione
// utilizzando le regole native di i18next per ogni lingua supportata

import { useTranslation } from 'react-i18next';

export const usePluralization = () => {
  const { t } = useTranslation();

  // 🍽️ Pluralizzazione per pasti
  const pluralizeMeal = (count) => {
    return t('meals.mealCount', { count });
  };

  // 👥 Pluralizzazione per partecipanti
  const pluralizeParticipant = (count) => {
    return t('meals.participant', { count });
  };

  // 📨 Pluralizzazione per inviti
  const pluralizeInvitation = (count) => {
    return t('meals.invitation', { count });
  };

  // 💬 Pluralizzazione per messaggi
  const pluralizeMessage = (count) => {
    return t('meals.message', { count });
  };

  // 🔔 Pluralizzazione per notifiche
  const pluralizeNotification = (count) => {
    return t('meals.notification', { count });
  };

  // 👤 Pluralizzazione per utenti
  const pluralizeUser = (count) => {
    return t('meals.user', { count });
  };

  // 🚨 Pluralizzazione per segnalazioni
  const pluralizeReport = (count) => {
    return t('meals.report', { count });
  };

  // 📅 Pluralizzazione per giorni
  const pluralizeDay = (count) => {
    return t('meals.day', { count });
  };

  // ⏰ Pluralizzazione per ore
  const pluralizeHour = (count) => {
    return t('meals.hour', { count });
  };

  // ⏱️ Pluralizzazione per minuti
  const pluralizeMinute = (count) => {
    return t('meals.minute', { count });
  };

  // 🛣️ Pluralizzazione per chilometri
  const pluralizeKilometer = (count) => {
    return t('meals.kilometer', { count });
  };

  // 📏 Pluralizzazione per metri
  const pluralizeMeter = (count) => {
    return t('meals.meter', { count });
  };

  // 🌐 Pluralizzazione generica per qualsiasi chiave
  const pluralize = (key, count, options = {}) => {
    return t(key, { count, ...options });
  };

  // 📊 Formattazione numeri con pluralizzazione
  const formatCount = (count, singularKey, pluralKey, options = {}) => {
    if (count === 1) {
      return t(singularKey, { count, ...options });
    }
    return t(pluralKey, { count, ...options });
  };

  // 🎯 Pluralizzazione condizionale con fallback
  const smartPluralize = (key, count, fallback = null) => {
    try {
      const result = t(key, { count });
      // Se la traduzione è uguale alla chiave, usa il fallback
      if (result === key && fallback) {
        return fallback(count);
      }
      return result;
    } catch (error) {
      console.warn(`[usePluralization] Errore pluralizzazione per ${key}:`, error);
      return fallback ? fallback(count) : `${count}`;
    }
  };

  return {
    // Funzioni specifiche
    pluralizeMeal,
    pluralizeParticipant,
    pluralizeInvitation,
    pluralizeMessage,
    pluralizeNotification,
    pluralizeUser,
    pluralizeReport,
    pluralizeDay,
    pluralizeHour,
    pluralizeMinute,
    pluralizeKilometer,
    pluralizeMeter,
    
    // Funzioni generiche
    pluralize,
    formatCount,
    smartPluralize
  };
};

export default usePluralization;
