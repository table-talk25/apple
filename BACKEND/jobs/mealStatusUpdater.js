const cron = require('node-cron');
const mealStatusService = require('../services/mealStatusService');
const reminderService = require('../services/mealEmailReminderService');

let statusTask;
let reminderTask;

async function updateMealStatuses() {
  try {
    const result = await mealStatusService.syncAllMealStatuses();
    if (!result.success) console.error('[MealJobs] Sincronizzazione stati incompleta');
    return result;
  } catch {
    console.error('[MealJobs] Aggiornamento stati fallito');
    return { success: false };
  }
}
async function sendMealReminders() {
  return reminderService.sendRemindersForWindow(10, 15);
}
function stop() {
  if (statusTask) statusTask.destroy();
  if (reminderTask) reminderTask.destroy();
  statusTask = undefined; reminderTask = undefined;
}
function startMealStatusUpdater() {
  if (statusTask && reminderTask) return;
  try {
    statusTask = cron.schedule('* * * * *', updateMealStatuses, { noOverlap: true, name: 'meal-status-updater' });
    reminderTask = cron.schedule('*/5 * * * *', sendMealReminders, { noOverlap: true, name: 'meal-email-reminders' });
  } catch (error) { stop(); throw error; }
}
startMealStatusUpdater.stop = stop;
startMealStatusUpdater.updateMealStatuses = updateMealStatuses;
startMealStatusUpdater.sendMealReminders = sendMealReminders;
module.exports = startMealStatusUpdater;
