// File: BACKEND/utils/cronJobs.js (NUOVO FILE)

const cron = require('node-cron');
const Meal = require('../models/Meal');
const sendEmail = require('./sendEmail'); // Assicurati che il percorso sia giusto

const startCronJobs = () => {
  console.log('⏰ Servizio Cron Jobs avviato...');

  // Esegui ogni 10 minuti
  cron.schedule('*/10 * * * *', async () => {
    console.log('⏰ Controllo pasti in partenza tra 1 ora...');
    
    const now = new Date();
    // Cerchiamo pasti che iniziano tra 60 e 70 minuti da adesso
    const startWindow = new Date(now.getTime() + 60 * 60 * 1000);
    const endWindow = new Date(now.getTime() + 70 * 60 * 1000);

    try {
      const mealsStarting = await Meal.find({
        date: { 
          $gte: startWindow, 
          $lt: endWindow 
        },
        status: 'upcoming'
      }).populate('participants host');

      if (mealsStarting.length > 0) {
          console.log(`🔔 Trovati ${mealsStarting.length} pasti in partenza.`);
      }

      for (const meal of mealsStarting) {
        // Email ai partecipanti
        if (meal.participants && meal.participants.length > 0) {
            for (const participant of meal.participants) {
                // Non mandare email all'host se è anche nella lista partecipanti
                if (participant._id.toString() !== meal.host._id.toString()) {
                    await sendEmail.sendMealReminderEmail(participant.email, participant.nickname || participant.name, meal);
                }
            }
        }

        // Email all'host
        await sendEmail.sendHostMealReminderEmail(meal.host.email, meal.host.nickname || meal.host.name, meal);
      }
    } catch (error) {
      console.error('❌ Errore Cron Job Promemoria:', error);
    }
  });
};

module.exports = startCronJobs;