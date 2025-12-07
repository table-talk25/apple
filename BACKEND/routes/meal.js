// File: BACKEND/routes/meal.js --- VERSIONE COMPLETA E CORRETTA ---

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload'); 

// Importiamo tutte le funzioni necessarie dal nostro controller
const {
  getMeals,
  getMeal,
  createMeal,
  updateMeal,
  deleteMeal,
  joinMeal,
  leaveMeal,
  searchMeals,
  getUserMeals,
  getVideoCallUrl,
  getMealStatusStats,
  syncMealStatus,
  getMealsForMap,
  getMealsGeoStats,
  advancedGeospatialSearch
} = require('../controllers/mealController');

// ==================== ROTTE ====================

// --- Rotte per la collezione di pasti (/api/meals) ---
router.route('/')
  .get(getMeals) // Ottiene la lista dei pasti (già funzionava)
  .post(protect, upload.single('image'), createMeal); // Crea un nuovo pasto con upload immagine

// --- Rotte per la ricerca e le statistiche ---
router.get('/map', getMealsForMap);
router.get('/geostats', getMealsGeoStats);
router.get('/search/advanced', advancedGeospatialSearch);
router.get('/search', searchMeals);
router.get('/status/stats', getMealStatusStats);

// --- Rotte per un pasto specifico (/api/meals/:id) ---
router.route('/:id')
  .get(getMeal) // Ottiene i dettagli di un singolo pasto
  .patch(protect, upload.single('image'), updateMeal) // AGGIORNAMENTO/VARIAZIONE con upload immagine
  .delete(protect, deleteMeal); // CANCELLAZIONE (adesso è attivo!)

// --- Rotta per la sincronizzazione dello stato di un pasto ---
router.post('/:id/sync-status', syncMealStatus);

// --- Rotte per la gestione dei partecipanti ---
router.route('/:id/participants')
  .post(protect, joinMeal) // UNISCITI a un pasto (adesso è attivo!)
  .delete(protect, leaveMeal); // LASCIA un pasto (adesso è attivo!)

// --- Rotta per la videochiamata ---
router.get('/:id/stream', protect, getVideoCallUrl); // VIDEOCHIAMATA (adesso è attivo!)

// --- Rotta per ottenere i pasti di un utente ---
router.get('/user/all', protect, getUserMeals);


module.exports = router;