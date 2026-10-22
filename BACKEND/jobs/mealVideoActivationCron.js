const cron = require('node-cron');
const Meal = require('../models/Meal');
const notifications = require('../services/videoNotificationService');
let task;

async function activateMealVideos() {
  const now = new Date();
  const eligibility = {
    mealType: 'virtual', status: { $in: ['upcoming', 'ongoing'] }, videoCallStatus: 'pending',
    date: { $lte: new Date(now.getTime() + 10 * 60000) },
    $expr: { $gt: [{ $add: ['$date', { $multiply: [{ $ifNull: ['$duration', 60] }, 60000] }] }, now] },
  };
  let activated = 0;
  let failed = 0;
  try {
    const candidates = await Meal.find(eligibility).select('_id date duration');
    for (const candidate of candidates) {
      try {
        // Persist the event first: a crash after activation does not lose the notification intent.
        await notifications.queueActivationEvent(candidate);
        const meal = await Meal.findOneAndUpdate(
          { ...eligibility, _id: candidate._id, date: candidate.date, duration: candidate.duration },
          { $set: { videoCallStatus: 'active' } }, { new: true, runValidators: true }
        );
        if (meal) activated++;
      } catch { failed++; console.error('[MealVideoJob] Registrazione evento o attivazione fallita'); }
    }
  } catch { failed++; console.error('[MealVideoJob] Ricerca pasti fallita'); }
  try {
    // Runs even without new activations, so active calls can recover outstanding sends.
    const result = await notifications.processVideoNotificationEvents();
    return { success: failed === 0 && result.success, activated, failed: failed + result.failed, notifications: result };
  } catch { return { success: false, activated, failed: failed + 1 }; }
}
function scheduleMealVideoActivationCron() {
  if (task) return;
  task = cron.schedule('* * * * *', activateMealVideos, { noOverlap: true, name: 'meal-video-activation' });
}
function stopMealVideoActivationCron() { if (task) task.destroy(); task = undefined; }
module.exports = { scheduleMealVideoActivationCron, stopMealVideoActivationCron, activateMealVideos };
