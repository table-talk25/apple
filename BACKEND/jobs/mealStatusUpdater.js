// File: BACKEND/jobs/mealStatusUpdater.js (Versione con Archiviazione Intelligente)

const cron = require('node-cron');
const Meal = require('../models/Meal');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');

const updateMealStatuses = async () => {
  const now = new Date();
  console.log(`[Cron Job] Esecuzione alle: ${now.toISOString()} (UTC)`);

  try {
    // --- PASSO 1: Aggiorna i pasti da 'upcoming' a 'ongoing' (invariato) ---
    const upcomingResults = await Meal.updateMany(
      { status: 'upcoming', date: { $lte: now } },
      { $set: { status: 'ongoing' } }
    );
    if (upcomingResults.modifiedCount > 0) {
      console.log(`[Cron Job] ✅ Trovati e aggiornati ${upcomingResults.modifiedCount} pasti a 'ongoing'.`);
    } else {
      console.log("[Cron Job] Nessun pasto 'upcoming' da aggiornare a 'ongoing'.");
    }

    // --- PASSO 2: Gestisce i pasti 'ongoing' che sono terminati ---
    const ongoingMeals = await Meal.find({ status: 'ongoing' }).populate('participants');

    if (ongoingMeals.length > 0) {
      let changedCount = 0;
      for (const meal of ongoingMeals) {
        const endTime = new Date(meal.date.getTime() + meal.duration * 60000);
        
        if (endTime < now) {
          // ▼▼▼ NUOVA LOGICA INTELLIGENTE ▼▼▼
          // Se il pasto è finito e ha solo 1 partecipante (l'host), lo annulliamo.
          if (meal.participants.length <= 1) {
            meal.status = 'cancelled';
            console.log(`[Cron Job] 🚮 Pasto vuoto "${meal.title}" archiviato come 'cancellato'.`);
          } else {
            // Altrimenti, se c'erano partecipanti, lo completiamo.
            meal.status = 'completed';
            console.log(`[Cron Job] ✅ Pasto "${meal.title}" archiviato come 'completato'.`);
          }
          await meal.save();
          changedCount++;
          // ▲▲▲ FINE NUOVA LOGICA ▲▲▲
        }
      }

      if (changedCount === 0) {
        console.log("[Cron Job] Nessun pasto 'ongoing' è ancora terminato.");
      }
    } else {
      console.log("[Cron Job] Nessun pasto 'ongoing' trovato.");
    }

  } catch (error) {
    console.error('[Cron Job] ❌ Errore durante l\'aggiornamento degli stati:', error);
  }
};

const startMealStatusUpdater = () => {
  cron.schedule('* * * * *', updateMealStatuses); // Eseguiamo ogni minuto
  console.log('🚀 Job per l\'aggiornamento dello stato dei pasti avviato. Si eseguirà ogni minuto.');
};

// Job: invia mail riepilogativa all'host 10 minuti prima dell'inizio del pasto
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
  // Trova pasti che iniziano tra 10 e 15 minuti (per evitare doppioni)
  const meals = await Meal.find({
    status: 'upcoming',
    date: { $gte: tenMinutesLater, $lt: new Date(tenMinutesLater.getTime() + 5 * 60 * 1000) }
  }).populate('host participants', 'email nickname name settings');

  for (const meal of meals) {
    // Invia solo se l'host ha attivato le notifiche email
    if (meal.host && meal.host.settings?.notifications?.email) {
      try {
        await sendEmail.sendHostMealReminderEmail(
          meal.host.email,
          meal.host.nickname || meal.host.name,
          {
            title: meal.title,
            date: meal.date,
            participantCount: meal.participants.length,
            participantNicknames: meal.participants.map(p => p.nickname || p.name),
            mealId: meal._id
          }
        );
        console.log(`[EMAIL] Promemoria host inviato per il pasto "${meal.title}"`);
      } catch (err) {
        console.error('Errore invio email promemoria host:', err.message);
      }
    }

    // Invia promemoria anche ai partecipanti che hanno attivato le email
    for (const participant of meal.participants) {
      if (participant && participant.settings?.notifications?.email) {
        try {
          await sendEmail.sendMealReminderEmail(
            participant.email,
            participant.nickname || participant.name,
            {
              title: meal.title,
              date: meal.date,
              hostName: meal.host?.nickname || meal.host?.name || 'Host',
              mealId: meal._id
            }
          );
          console.log(`[EMAIL] Promemoria partecipante inviato a ${participant.email} per "${meal.title}"`);
        } catch (err) {
          console.error('Errore invio email promemoria partecipante:', err.message);
        }
      }
    }
  }
});

module.exports = startMealStatusUpdater;