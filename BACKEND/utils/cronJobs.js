const cron = require('node-cron');
const reminderService = require('../services/mealEmailReminderService');
let task;

async function sendOneHourReminders() {
  return reminderService.sendRemindersForWindow(60, 70);
}
function startCronJobs() {
  if (task) return;
  task = cron.schedule('*/10 * * * *', sendOneHourReminders, { noOverlap: true, name: 'meal-one-hour-reminders' });
}
startCronJobs.stop = () => { if (task) task.destroy(); task = undefined; };
startCronJobs.sendOneHourReminders = sendOneHourReminders;
module.exports = startCronJobs;
