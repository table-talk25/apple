const Meal = require('../models/Meal');
const Delivery = require('../models/MealReminderDelivery');
const emailService = require('../utils/sendEmail');
const { buildMealReminder } = require('../utils/mealReminderContent');

function deliveryKey(meal, recipientId, windowMinutes) {
  return JSON.stringify([meal._id.toString(), new Date(meal.date).toISOString(), windowMinutes, recipientId.toString()]);
}

async function sendOnce(meal, user, windowMinutes, role) {
  if (!user?._id || !user.email || user.settings?.notifications?.email !== true) return 'skipped';
  const content = buildMealReminder(user.nickname || user.name, {
    _id: meal._id, title: meal.title, location: meal.location, reminderMinutes: windowMinutes,
  }, role === 'host');
  const key = deliveryKey(meal, user._id, windowMinutes);
  try {
    await Delivery.create({ _id: key, meal: meal._id, recipient: user._id, scheduledAt: meal.date, windowMinutes, role, state: 'processing' });
  } catch (error) {
    if (error.code === 11000) return 'skipped';
    throw error;
  }
  try {
    const info = await emailService.sendEmail({ to: user.email, ...content });
    const accepted = Array.isArray(info?.accepted) && info.accepted.some((address) =>
      String(typeof address === 'string' ? address : address?.address).toLowerCase() === user.email.toLowerCase());
    const state = accepted ? 'accepted' : (Array.isArray(info?.rejected) && info.rejected.length > 0 ? 'failed' : 'uncertain');
    await Delivery.updateOne({ _id: key, state: 'processing' }, { $set: { state, completedAt: new Date() } });
    return accepted ? 'accepted' : 'failed';
  } catch {
    try {
      await Delivery.updateOne({ _id: key, state: 'processing' }, { $set: { state: 'uncertain', completedAt: new Date() } });
    } catch { console.error('[MealReminder] Impossibile registrare esito; tentativo resta bloccato'); }
    console.error('[MealReminder] Invio o registrazione esito falliti; nessun reinvio automatico');
    return 'failed';
  }
}

async function sendRemindersForWindow(minMinutes, maxMinutes, now = new Date()) {
  const summary = { success: true, accepted: 0, skipped: 0, failed: 0 };
  try {
    if (!((minMinutes === 10 && maxMinutes === 15) || (minMinutes === 60 && maxMinutes === 70))) {
      throw new Error('Finestra promemoria non supportata');
    }
    const meals = await Meal.find({ status: 'upcoming', date: {
      $gte: new Date(now.getTime() + minMinutes * 60000),
      $lt: new Date(now.getTime() + maxMinutes * 60000),
    } }).populate('host participants', 'email nickname name settings');
    for (const meal of meals) {
      const recipients = new Map();
      if (meal.host?._id) recipients.set(meal.host._id.toString(), { user: meal.host, role: 'host' });
      for (const user of meal.participants || []) {
        if (user?._id && !recipients.has(user._id.toString())) recipients.set(user._id.toString(), { user, role: 'participant' });
      }
      for (const { user, role } of recipients.values()) {
        try {
          const outcome = await sendOnce(meal, user, minMinutes, role);
          summary[outcome]++;
        } catch {
          summary.failed++;
          console.error('[MealReminder] Preparazione o prenotazione invio fallita');
        }
      }
    }
  } catch {
    summary.failed++;
    console.error('[MealReminder] Ricerca pasti o configurazione promemoria fallita');
  }
  summary.success = summary.failed === 0;
  return summary;
}

module.exports = { sendRemindersForWindow, deliveryKey };
