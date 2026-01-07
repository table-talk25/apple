// File: /src/constants/mealConstants.js (Versione Corretta e Coerente)

/**
 * Costanti relative ai pasti
 */

// ======================================================
// TIPI DI PASTO
// ======================================================

// Chiavi e valori usati nel codice e nel database
const MEAL_TYPES = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  APERITIVO: 'aperitif',
};

// Etichette per la visualizzazione nell'interfaccia utente
const MEAL_TYPE_LABELS = {
  [MEAL_TYPES.BREAKFAST]: 'Colazione',
  [MEAL_TYPES.LUNCH]: 'Pranzo',
  [MEAL_TYPES.DINNER]: 'Cena',
  [MEAL_TYPES.APERITIVO]: 'Aperitivo',
};

// Colori per la UI
const MEAL_TYPE_COLORS = {
  [MEAL_TYPES.BREAKFAST]: '#FFD54F', // Giallo
  [MEAL_TYPES.LUNCH]: '#4CAF50',     // Verde
  [MEAL_TYPES.DINNER]: '#5C6BC0',    // Blu
  [MEAL_TYPES.APERITIVO]: '#EC407A',  // Rosa
};

// Opzioni per i menu a tendina
const mealTypeOptions = [
  { value: MEAL_TYPES.BREAKFAST, label: MEAL_TYPE_LABELS[MEAL_TYPES.BREAKFAST] },
  { value: MEAL_TYPES.LUNCH,     label: MEAL_TYPE_LABELS[MEAL_TYPES.LUNCH] },
  { value: MEAL_TYPES.DINNER,    label: MEAL_TYPE_LABELS[MEAL_TYPES.DINNER] },
  { value: MEAL_TYPES.APERITIVO, label: MEAL_TYPE_LABELS[MEAL_TYPES.APERITIVO] },
];


// ======================================================
// STATI DEI PASTI (il tuo codice qui era già perfetto)
// ======================================================
const MEAL_STATUS = {
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const MEAL_STATUS_LABELS = {
  [MEAL_STATUS.UPCOMING]: 'In programma',
  [MEAL_STATUS.ONGOING]: 'In corso',
  [MEAL_STATUS.COMPLETED]: 'Completato',
  [MEAL_STATUS.CANCELLED]: 'Cancellato',
};


// ======================================================
// VINCOLI E MESSAGGI (il tuo codice qui era già perfetto)
// ======================================================
const MEAL_CONSTRAINTS = {
  MAX_TITLE_LENGTH: 100,
  MIN_TITLE_LENGTH: 3,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_PARTICIPANTS: 10,
  MIN_PARTICIPANTS: 2,
};

const MEAL_ERROR_MESSAGES = {
  TITLE_TOO_SHORT: `Il titolo deve essere di almeno ${MEAL_CONSTRAINTS.MIN_TITLE_LENGTH} caratteri`,
  // ... e tutti gli altri tuoi ottimi messaggi
};

// Esporta tutto usando CommonJS
module.exports = {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_COLORS,
  mealTypeOptions,
  MEAL_STATUS,
  MEAL_STATUS_LABELS,
  MEAL_CONSTRAINTS,
  MEAL_ERROR_MESSAGES,
};

