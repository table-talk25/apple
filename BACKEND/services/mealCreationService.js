// File: BACKEND/services/mealCreationService.js (Versione Fix Immagini Windows/Mac)

const Meal = require('../models/Meal');
const Chat = require('../models/Chat');
const User = require('../models/User');
const twilio = require('twilio');
const geolocationNotificationService = require('./geolocationNotificationService');

// Inizializziamo il client di Twilio
const twilioClient = twilio(
  process.env.TWILIO_API_KEY,
  process.env.TWILIO_API_SECRET,
  { accountSid: process.env.TWILIO_ACCOUNT_SID }
);

/**
 * Orchestra la creazione completa di un pasto e delle sue dipendenze.
 */
async function createFullMeal(mealData, user, file) {
  let meal; 
  let chat;

  try {
    // 1. PREPARA I DATI DEL PASTO
    console.log('🏗️ [MealCreationService] Inizio creazione pasto per:', user.nickname);
    
    // 🔧 GESTIONE IMMAGINE (FIX DEFINITIVO)
    const finalMealData = { ...mealData, host: user.id };
    
    if (file) {
      // ⚠️ FIX: Usiamo file.path e sostituiamo i backslash (\) con slash (/)
      // Questo risolve il problema delle immagini "fantasma" su Windows
      finalMealData.imageUrl = file.path.replace(/\\/g, '/');
      console.log('📷 [Service] Immagine normalizzata:', finalMealData.imageUrl);
    }
    
    // 2. CREA IL PASTO
    meal = await Meal.create({
      ...finalMealData,
      participants: [user.id], 
      chatId: null 
    });
    console.log(`✅ [Service] Pasto creato: ${meal._id}`);

    // 3. CREA LA CHAT
    chat = await Chat.create({
      name: `TableTalk: ${meal.title}`, 
      mealId: meal._id,
      participants: [user.id]
    });
    
    await chat.addMessage(user.id, 'Benvenuti nel TableTalk! 🍽️ Organizzatevi qui.');
    
    meal.chatId = chat._id; 

    // 4. CREA LA STANZA VIDEO (solo virtuali)
    if (meal.mealType === 'virtual') {
      try {
        const room = await twilioClient.video.v1.rooms.create({
          uniqueName: meal._id.toString(),
          type: 'group'
        });
        meal.twilioRoomSid = room.sid;
      } catch (twilioError) {
        console.warn('⚠️ Errore creazione stanza Twilio:', twilioError.message);
      }
    }

    // 5. SALVA E AGGIORNA UTENTE
    await meal.save();
    await User.findByIdAndUpdate(user.id, { $push: { createdMeals: meal._id } });

    // 6. NOTIFICHE GEOLOCALIZZATE
    if (meal.mealType === 'physical' && meal.isPublic && meal.location?.coordinates) {
      setImmediate(() => {
        geolocationNotificationService.sendNearbyMealNotifications(meal)
          .catch(err => console.error(`[Service] Errore notifiche geo:`, err));
      });
    }
    
    return meal;

  } catch (error) {
    console.error('❌ [Service] Errore creazione pasto. Rollback...', error);
    if (meal) await Meal.findByIdAndDelete(meal._id);
    if (chat) await Chat.findByIdAndDelete(chat._id);
    throw error;
  }
}

module.exports = {
  createFullMeal,
};