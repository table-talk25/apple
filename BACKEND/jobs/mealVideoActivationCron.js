const cron = require('node-cron');
const Meal = require('../models/Meal');
const pushNotificationService = require('../services/pushNotificationService');

function scheduleMealVideoActivationCron() {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    console.log(`[Cron Job] Esecuzione alle: ${now.toISOString()}`);
    try {
      const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

      const mealsToActivate = await Meal.find({
        date: { $lte: tenMinutesFromNow },
        status: 'upcoming',
        videoCallStatus: 'pending',
      }).populate('participants', 'fcmTokens');

      if (mealsToActivate.length > 0) {
        console.log(`[Cron Job] Attivazione di ${mealsToActivate.length} videochiamate.`);

        for (const meal of mealsToActivate) {
          meal.videoCallStatus = 'active';
          await meal.save();

          const allParticipantTokens = meal.participants.flatMap((p) => p.fcmTokens).filter((token) => token);

          const uniqueTokens = [...new Set(allParticipantTokens)];

          if (uniqueTokens.length > 0) {
            console.log(
              `[Cron Job] Invio notifiche a ${uniqueTokens.length} token per il pasto "${meal.title}"`
            );

            pushNotificationService.sendPushNotification(
              uniqueTokens,
              'La videochiamata sta per iniziare!',
              `Unisciti ora al pasto "${meal.title}".`,
              { mealId: meal._id.toString() }
            );
          }
        }
      }

      const fourHoursAgoHourAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      await Meal.updateMany(
        { date: { $lt: fourHoursAgoHourAgo }, status: 'upcoming', participantsCount: { $lte: 1 } },
        { $set: { status: 'completed' } }
      );
    } catch (error) {
      console.error('[Cron Job] ❌ Errore:', error);
    }
  });
}

module.exports = { scheduleMealVideoActivationCron };
