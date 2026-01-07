// File: src/constants/mealConstants.js (Versione Finale con Traduttore Universale)

import dayjs from 'dayjs';
import 'dayjs/locale/it';
import { DEV_SERVER_URL, SERVER_URL, isNative, API_URL } from '../config/capacitorConfig';

// --- TIPI DI TABLETALK® ---

// 1. Definiamo le CHIAVI INGLESI che il backend si aspetta
export const MEAL_TYPES = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  APERITIF: 'aperitif' // Corretto da APERITIVO per coerenza
};

// 2. Mappiamo le chiavi inglesi alle ETICHETTE ITALIANE per l'utente
// Queste sono le etichette di fallback, ma ora useremo le traduzioni
export const MEAL_TYPE_LABELS = {
  [MEAL_TYPES.BREAKFAST]: 'Colazione',
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
 * Gestisce URL completi, data URLs, percorsi relativi e fallback.
 * @param {string} imagePath - Il percorso o nome del file dell'immagine.
 * @returns {string} L'URL completo o un'immagine di fallback.
 */
export const getMealCoverImageUrl = (imagePath) => {
  if (!imagePath) return '/assets/images/default-meal-placeholder.jpeg';

  // Se è già un URL completo (es. http o https o data:image), usalo così com'è
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // Se è un percorso relativo del backend (/uploads/...), aggiungi il dominio base
  // Rimuoviamo '/api' dalla fine di API_URL perché la cartella uploads è alla radice
  const baseUrl = (API_URL || '').replace(/\/api\/?$/, '');

  // Assicuriamoci che imagePath inizi con /
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

  return `${baseUrl}${cleanPath}`;
};

/**
 * Ottiene l'URL completo per l'avatar dell'host.
 * Restituisce un avatar di default se non specificato.
 * @param {string} profileImage - Il nome del file dell'immagine del profilo.
 * @returns {string} - L'URL completo dell'immagine.
 */
export const getHostAvatarUrl = (profileImage) => {
  console.log('🖼️ [getHostAvatarUrl] Input:', profileImage);
  
  // Se non c'è un'immagine o è quella di default, usa l'URL completo del backend per l'avatar di default
  if (!profileImage || typeof profileImage !== 'string' || profileImage === 'null' || profileImage === 'undefined' || profileImage.includes('default-avatar.jpg')) {
    const baseUrl = (API_URL || '').replace(/\/api\/?$/, '');
    const defaultUrl = `${baseUrl}/uploads/profile-images/default-avatar.jpg`;
    console.log('🖼️ [getHostAvatarUrl] Usando avatar di default dal backend:', defaultUrl);
    return defaultUrl;
  }
  
  // Caso Capacitor (foto locale su device)
  if (typeof profileImage === 'string' && profileImage.startsWith('capacitor://')) {
    console.log('🖼️ [getHostAvatarUrl] URL Capacitor:', profileImage);
    return profileImage;
  }
  
  // Caso URL assoluto (già pronto)
  if (typeof profileImage === 'string' && profileImage.startsWith('http')) {
    console.log('🖼️ [getHostAvatarUrl] URL assoluto:', profileImage);
    return profileImage;
  }
  
  // Caso path relativo dal backend - usa la configurazione corretta
  // Rimuoviamo '/api' dalla fine di API_URL perché la cartella uploads è alla radice
  const baseUrl = (API_URL || '').replace(/\/api\/?$/, '');
  const cleanPath = profileImage.startsWith('/') ? profileImage : `/${profileImage}`;
  // Aggiungi timestamp per forzare il refresh dell'immagine
  const timestamp = new Date().getTime();
  const fullUrl = `${baseUrl}${cleanPath}?t=${timestamp}`;
  
  console.log('🖼️ [getHostAvatarUrl] URL costruito:', fullUrl);
  return fullUrl;
};