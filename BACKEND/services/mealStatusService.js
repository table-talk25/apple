const Meal = require('../models/Meal');
const { calculateMealStatus, isTerminal } = require('../utils/mealLifecycle');
const FIELDS = '_id title date duration status host participants';

async function synchronizeSnapshot(meal, now) {
  const nextStatus = calculateMealStatus(meal, now);
  if (nextStatus === meal.status) return { changed: false };
  const changes = { status: nextStatus };
  if (isTerminal(nextStatus)) changes.videoCallStatus = 'ended';
  const updatedMeal = await Meal.findOneAndUpdate({
    _id: meal._id, status: meal.status, date: meal.date, duration: meal.duration,
    host: meal.host, participants: meal.participants,
  }, { $set: changes }, { new: true, runValidators: true });
  if (!updatedMeal) throw new Error('Pasto modificato durante la sincronizzazione; riprovare');
  return { changed: true, updatedMeal, nextStatus };
}

async function syncAllMealStatuses() {
  try {
    const now = new Date();
    const meals = await Meal.find({ status: { $in: ['upcoming', 'ongoing'] } }).select(FIELDS);
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    for (const meal of meals) {
      try {
        const result = await synchronizeSnapshot(meal, now);
        if (result.changed) updated++; else skipped++;
      } catch {
        failed++;
        console.error('[MealStatus] Sincronizzazione di un pasto fallita');
      }
    }
    return { success: failed === 0, updated, skipped, failed, total: meals.length,
      ...(failed ? { error: 'Sincronizzazione incompleta' } : {}) };
  } catch {
    console.error('[MealStatus] Ricerca pasti da sincronizzare fallita');
    return { success: false, error: 'Sincronizzazione stati fallita' };
  }
}

async function syncMealStatus(mealId) {
  try {
    const meal = await Meal.findById(mealId);
    if (!meal) return { success: false, error: 'Pasto non trovato' };
    const result = await synchronizeSnapshot(meal, new Date());
    if (!result.changed) return { success: true, message: 'Status invariato', mealId: meal._id, status: meal.status };
    return { success: true, mealId: meal._id, oldStatus: meal.status, newStatus: result.nextStatus, updatedMeal: result.updatedMeal };
  } catch {
    return { success: false, error: 'Sincronizzazione pasto fallita; riprovare' };
  }
}

async function getMealsNeedingStatusUpdate() {
  const now = new Date();
  // Let the caller observe database failures instead of returning a false empty result.
  return Meal.find({ status: { $in: ['upcoming', 'ongoing'] }, $or: [
    { status: 'upcoming', date: { $lte: now } },
    { $expr: { $lte: [
      { $add: ['$date', { $multiply: [{ $ifNull: ['$duration', 60] }, 60000] }] }, now,
    ] } },
  ] }).select(FIELDS);
}

async function getMealStatusStats() {
  try {
    const now = new Date();
    const statusStats = await Meal.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const meals = await Meal.find({}).select(FIELDS);
    const virtual = { upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 };
    for (const meal of meals) virtual[calculateMealStatus(meal, now)]++;
    return { success: true, stored: Object.fromEntries(statusStats.map((item) => [item._id, item.count])), virtual, timestamp: now };
  } catch { return { success: false, error: 'Calcolo statistiche fallito' }; }
}

async function initializeStatusService() {
  const initialSync = await syncAllMealStatuses();
  if (!initialSync.success) return { success: false, error: initialSync.error || 'Sincronizzazione iniziale fallita', initialSync };
  return { success: true, message: 'Servizio status pasti inizializzato', initialSync };
}

module.exports = { syncAllMealStatuses, syncMealStatus, getMealsNeedingStatusUpdate, getMealStatusStats, initializeStatusService };
