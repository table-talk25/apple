const cron = require('node-cron');
const Meal = require('../models/Meal');
const pushNotificationService = require('../services/pushNotificationService');

let task;

async function activateMealVideos() {
  const now = new Date();
  const eligibility = {
    mealType: 'virtual',
    status: { $in: ['upcoming', 'ongoing'] },
    videoCallStatus: 'pending',
    date: { $lte: new Date(now.getTime() + 10 * 60000) },
    $expr: { $gt: [
      { $add: ['$date', { $multiply: [{ $ifNull: ['$duration', 60] }, 60000] }] }, now,
    ] },
  };
  try {
    const candidates = await Meal.find(eligibility).select('_id date duration');
    let activated = 0;
    let failed = 0;
    for (const candidate of candidates) {
      try {
        // Recheck eligibility atomically: only one worker can claim a pending call.
        const meal = await Meal.findOneAndUpdate(
          { ...eligibility, _id: candidate._id },
          { $set: { videoCallStatus: 'active' } },
          { new: true, runValidators: true }
        ).populate('participants', 'fcmTokens');
        if (!meal) continue;
        activated++;
        const tokens = [...new Set((meal.participants || []).filter(Boolean)
          .flatMap((participant) => Array.isArray(participant.fcmTokens) ? participant.fcmTokens : [])
          .filter((token) => typeof token === 'string' && token.trim()))];
        if (tokens.length > 0) {
          await pushNotificationService.sendPushNotification(
            tokens, 'La videochiamata sta per iniziare!',
            `Unisciti ora al pasto "${meal.title}".`, { mealId: meal._id.toString() }
          );
        }
      } catch {
        failed++;
        console.error('[MealVideoJob] Attivazione o notifica fallita per un pasto');
      }
    }
    return { success: failed === 0, activated, failed };
  } catch {
    console.error('[MealVideoJob] Ricerca pasti da attivare fallita');
    return { success: false, activated: 0 };
  }
}

function scheduleMealVideoActivationCron() {
  if (task) return;
  task = cron.schedule('* * * * *', activateMealVideos, { noOverlap: true, name: 'meal-video-activation' });
}

function stopMealVideoActivationCron() {
  if (task) task.destroy();
  task = undefined;
}

module.exports = { scheduleMealVideoActivationCron, stopMealVideoActivationCron, activateMealVideos };
