const cron = require('node-cron');
const Meal = require('../models/Meal');

let statusTask;
let reminderTask;

async function updateMealStatuses() {
  const now = new Date();
  try {
    await Meal.updateMany(
      { status: 'upcoming', date: { $lte: now } },
      { $set: { status: 'ongoing' } }
    );
    const meals = await Meal.find({ status: 'ongoing' });
    let failed = 0;
    for (const meal of meals) {
      try {
        const end = new Date(meal.date.getTime() + meal.duration * 60000);
        if (end <= now) {
          meal.status = meal.participants.length <= 1 ? 'cancelled' : 'completed';
          await meal.save();
        }
      } catch {
        failed++;
        console.error('[MealJobs] Aggiornamento di un pasto fallito');
      }
    }
    return { success: failed === 0, failed };
  } catch {
    console.error('[MealJobs] Aggiornamento stati fallito');
    return { success: false };
  }
}

async function sendMealReminders() {
  try {
    const sendEmail = require('../utils/sendEmail');
    const now = new Date();
    const meals = await Meal.find({
      status: 'upcoming',
      date: { $gte: new Date(now.getTime() + 10 * 60000), $lt: new Date(now.getTime() + 15 * 60000) },
    }).populate('host participants', 'email nickname name settings');
    let failed = 0;
    for (const meal of meals) {
      const participants = (meal.participants || []).filter(Boolean);
      if (meal.host && meal.host.settings?.notifications?.email) {
        try {
          await sendEmail.sendHostMealReminderEmail(meal.host.email, meal.host.nickname || meal.host.name, {
            title: meal.title, date: meal.date, participantCount: participants.length,
            participantNicknames: participants.map((participant) => participant.nickname || participant.name),
            mealId: meal._id,
          });
        } catch {
          failed++;
          console.error('[MealJobs] Invio promemoria host fallito');
        }
      }
      const sent = new Set();
      for (const participant of participants) {
        const id = participant._id?.toString();
        if (!id || id === meal.host?._id?.toString() || sent.has(id) || !participant.settings?.notifications?.email) continue;
        sent.add(id);
        try {
          await sendEmail.sendMealReminderEmail(participant.email, participant.nickname || participant.name, {
            title: meal.title, date: meal.date, hostName: meal.host?.nickname || meal.host?.name || 'Host', mealId: meal._id,
          });
        } catch {
          failed++;
          console.error('[MealJobs] Invio promemoria partecipante fallito');
        }
      }
    }
    return { success: failed === 0, failed };
  } catch {
    console.error('[MealJobs] Ricerca o invio promemoria fallito');
    return { success: false };
  }
}

function stop() {
  if (statusTask) statusTask.destroy();
  if (reminderTask) reminderTask.destroy();
  statusTask = undefined;
  reminderTask = undefined;
}

function startMealStatusUpdater() {
  if (statusTask && reminderTask) return;
  try {
    statusTask = cron.schedule('* * * * *', updateMealStatuses, { noOverlap: true, name: 'meal-status-updater' });
    reminderTask = cron.schedule('*/5 * * * *', sendMealReminders, { noOverlap: true, name: 'meal-email-reminders' });
  } catch (error) {
    stop();
    throw error;
  }
}

startMealStatusUpdater.stop = stop;
startMealStatusUpdater.updateMealStatuses = updateMealStatuses;
startMealStatusUpdater.sendMealReminders = sendMealReminders;
module.exports = startMealStatusUpdater;
