// File: src/constants/mealConstants.js (Versione Finale con Traduttore Universale)

import dayjs from 'dayjs';
import 'dayjs/locale/it';
import { DEV_SERVER_URL, SERVER_URL, isNative, API_URL } from '../config/capacitorConfig';

// --- TIPI DI TABLETALK® ---

// 1. Definiamo le CHIAVI INGLESI che il backend si aspetta
export const MEAL_TYPES = {
  BREAKFAST: 'breakfast',
  BRUNCH: 'brunch',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  APERITIF: 'aperitif' // Corretto da APERITIVO per coerenza
};

// 2. Mappiamo le chiavi inglesi alle ETICHETTE ITALIANE per l'utente
// Queste sono le etichette di fallback, ma ora useremo le traduzioni
export const MEAL_TYPE_LABELS = {
  [MEAL_TYPES.BREAKFAST]: 'Colazione',
  [MEAL_TYPES.BRUNCH]: 'Brunch',
  [MEAL_TYPES.LUNCH]: 'Pranzo',
  [MEAL_TYPES.DINNER]: 'Cena',
  [MEAL_TYPES.APERITIF]: 'Aperitivo',
};

// 3. Creiamo le opzioni per i form, che mostrano l'italiano ma salvano l'inglese
export const mealTypeOptions = Object.values(MEAL_TYPES).map(typeKey => ({
  value: typeKey, // Il valore inviato al backend (es. 'lunch')
  label: MEAL_TYPE_LABELS[typeKey] // L'etichetta mostrata all'utente (es. 'Pranzo')
}));

// --- TIPI DI MEAL (VIRTUALE/FISICO) ---
export const MEAL_MODES = {
  VIRTUAL: 'virtual',
  PHYSICAL: 'physical'
};

export const MEAL_MODE_LABELS = {
  [MEAL_MODES.VIRTUAL]: 'Virtuale',
  [MEAL_MODES.PHYSICAL]: 'Fisico'
};

export const MEAL_MODE_DESCRIPTIONS = {
  [MEAL_MODES.VIRTUAL]: 'I partecipanti si incontreranno tramite videochiamata',
  [MEAL_MODES.PHYSICAL]: 'I partecipanti si incontreranno di persona in un luogo specifico'
};

export const MEAL_MODE_ICONS = {
  [MEAL_MODES.VIRTUAL]: '🎥',
  [MEAL_MODES.PHYSICAL]: '📍'
};

export const getMealModeText = (modeKey) => MEAL_MODE_LABELS[modeKey] || modeKey;

export const getMealModeDescription = (modeKey) => MEAL_MODE_DESCRIPTIONS[modeKey] || '';

export const getMealModeIcon = (modeKey) => MEAL_MODE_ICONS[modeKey] || '🍽️';

export const getMealModeColor = (modeKey) => {
  const colors = {
    [MEAL_MODES.VIRTUAL]: '#007bff', // Blu per virtuale
    [MEAL_MODES.PHYSICAL]: '#28a745'  // Verde per fisico
  };
  return colors[modeKey] || '#6c757d';
};

// --- STATI DEI TABLETALK® ---
export const MEAL_STATUS = { UPCOMING: 'upcoming', ONGOING: 'ongoing', COMPLETED: 'completed', CANCELLED: 'cancelled' };
export const MEAL_STATUS_LABELS = {
  [MEAL_STATUS.UPCOMING]: 'In Programma',
  [MEAL_STATUS.ONGOING]: 'In Corso',
  [MEAL_STATUS.COMPLETED]: 'Completato',
  [MEAL_STATUS.CANCELLED]: 'Cancellato',
};


// --- FUNZIONI HELPER UNIFICATE ---

// Queste funzioni ora usano le traduzioni, ma mantengono fallback per compatibilità
export const getMealTypeText = (typeKey) => MEAL_TYPE_LABELS[typeKey] || typeKey;

export const getMealStatusText = (statusKey) => MEAL_STATUS_LABELS[statusKey] || statusKey;

export const getMealTypeColor = (typeKey) => {
  const colors = {
    [MEAL_TYPES.BREAKFAST]: '#ffc107',
    [MEAL_TYPES.BRUNCH]: '#ff9800',
    [MEAL_TYPES.LUNCH]: '#28a745',
    [MEAL_TYPES.DINNER]: '#6f42c1',
    [MEAL_TYPES.APERITIF]: '#fd7e14'
  };
  return colors[typeKey] || '#007bff';
};

export const formatDate = (dateString, formatString = "DD MMM, HH:mm") => {
    if (!dateString) return 'Data non disponibile';
    try {
        return dayjs(dateString).locale('it').format(formatString);
    } catch (error) {
        console.error("Errore nella formattazione della data:", error);
        return 'Data non valida';
    }
};

/**
 * Ottiene l'URL completo per l'immagine di copertina del pasto.
 * Gestisce URL Firebase, URL completi, data URLs, percorsi relativi e fallback.
 * @param {string} imagePath - Il percorso o nome del file dell'immagine.
 * @returns {string} L'URL completo o un'immagine di fallback.
 */
export const getMealCoverImageUrl = (imagePath) => {
  if (!imagePath) return '/assets/images/default-meal-placeholder.jpeg';

  // ✅ NUOVO: Se è un URL Firebase, usalo direttamente
  if (imagePath.includes('storage.googleapis.com')) {
    return imagePath;
  }

  // Se è già un URL completo (es. http o https o data:image), usalo così com'è
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // Se è un percorso relativo del backend (/uploads/...), aggiungi il dominio base
  const baseUrl = (API_URL || '').replace(/\/api\/?$/, '');
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

  return `${baseUrl}${cleanPath}`;
};

/**
 * Ottiene l'URL completo per l'avatar dell'host.
 * Gestisce URL Firebase, URL assoluti, e percorsi relativi.
 * NOTA: NON aggiunge timestamp — causerebbe un reload dell'immagine ad ogni render
 *       e impedirebbe il caching del browser. Per forzare refresh dopo upload usa
 *       un parametro stabile (es. updatedAt o versione del profilo).
 * @param {string} profileImage - Il nome del file dell'immagine del profilo.
 * @returns {string} - L'URL completo dell'immagine.
 */
export const getHostAvatarUrl = (profileImage) => {
  // ✅ Se è un URL Firebase Storage, usalo direttamente
  if (typeof profileImage === 'string' && profileImage.includes('storage.googleapis.com')) {
    return profileImage;
  }

  // Se non c'è un'immagine o è quella di default, usa il default dal backend
  if (!profileImage || typeof profileImage !== 'string' || profileImage === 'null' || profileImage === 'undefined' || profileImage.includes('default-avatar.jpg')) {
    const baseUrl = (API_URL || '').replace(/\/api\/?$/, '');
    return `${baseUrl}/uploads/profile-images/default-avatar.jpg`;
  }

  // Caso Capacitor (foto locale su device)
  if (typeof profileImage === 'string' && profileImage.startsWith('capacitor://')) {
    return profileImage;
  }

  // Caso URL assoluto (già pronto)
  if (typeof profileImage === 'string' && profileImage.startsWith('http')) {
    return profileImage;
  }

  // Caso path relativo dal backend
  const baseUrl = (API_URL || '').replace(/\/api\/?$/, '');
  const cleanPath = profileImage.startsWith('/') ? profileImage : `/${profileImage}`;
  return `${baseUrl}${cleanPath}`;
};
