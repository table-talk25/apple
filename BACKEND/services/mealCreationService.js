// File: BACKEND/services/mealCreationService.js --- VERSIONE POTENZIATA ---

const Meal = require('../models/Meal');
const Chat = require('../models/Chat');
const User = require('../models/User');
const twilio = require('twilio');
const geolocationNotificationService = require('./geolocationNotificationService');

// Inizializziamo il client di Twilio qui, così è responsabilità di questo servizio
const twilioClient = twilio(
  process.env.TWILIO_API_KEY,
  process.env.TWILIO_API_SECRET,
  { accountSid: process.env.TWILIO_ACCOUNT_SID }
);

/**
 * Orchestra la creazione completa di un pasto e delle sue dipendenze.
 * @param {object} mealData - I dati del pasto già pronti per essere salvati.
 * @param {object} user - L'utente che sta creando il pasto.
 * @param {object} file - Il file immagine caricato (opzionale).
 * @returns {Promise<Document>} Il documento del pasto creato.
 */
async function createFullMeal(mealData, user, file) {
  let meal; // Li dichiariamo fuori dal try/catch per poterli usare in caso di errore
  let chat;

  try {
    // 1. PREPARA I DATI DEL PASTO
    console.log('🏗️ [MealCreationService] Inizio creazione pasto per:', user.nickname);
    console.log('🔍 [MealCreationService] mealData ricevuto:', {
      title: mealData.title,
      imageUrl: mealData.imageUrl,
      mealType: mealData.mealType,
      type: mealData.type
    });
    
    // 🔧 GESTIONE IMMAGINE: Se c'è un file, aggiungi imageUrl ai dati
    const finalMealData = { ...mealData, host: user.id };
    if (file) {
      finalMealData.imageUrl = `/uploads/meal-images/${file.filename}`;
      console.log('📷 [Service] Immagine aggiunta ai dati:', finalMealData.imageUrl);
    }
    
    // 2. CREA IL PASTO
    meal = await Meal.create({
      ...finalMealData,
      participants: [user.id], // L'host è sempre il primo partecipante
      chatId: null // Placeholder, verrà aggiornato dopo la creazione della chat
    });
    console.log(`✅ [MealCreationService] Pasto creato con ID: ${meal._id}`);
    console.log('🔍 [MealCreationService] imageUrl salvato nel documento:', meal.imageUrl);

    // 3. CREA LA CHAT 💬
    console.log('[Service] Tentativo di creare la chat...');
    chat = await Chat.create({
      name: `TableTalk: ${meal.title}`, // Nome riconoscibile
      mealId: meal._id,
      participants: [user.id]
    });
    
    // Aggiungi messaggio di benvenuto iniziale
    await chat.addMessage(
      user.id,
      'Benvenuti nel TableTalk! 🍽️ Organizzatevi qui.'
    );
    
    meal.chatId = chat._id; // Colleghiamo la chat al pasto
    console.log(`✅ [Service] Chat creata con ID: ${chat._id}`);
    console.log(`✅ [Service] Messaggio di benvenuto aggiunto alla chat`);
    console.log(`✅ [Service] chatId assegnato al pasto: ${meal.chatId}`);

    // 4. CREA LA STANZA VIDEO (solo se è un pasto virtuale)
    if (meal.mealType === 'virtual') {
      console.log('[Service] Pasto virtuale, creo la stanza Twilio...');
      try {
        const room = await twilioClient.video.v1.rooms.create({
          uniqueName: meal._id.toString(),
          type: 'group'
        });
        meal.twilioRoomSid = room.sid;
        console.log(`[Service] Stanza Twilio creata con SID: ${room.sid}`);
      } catch (twilioError) {
        // Se Twilio fallisce, non blocchiamo tutto, ma avvisiamo.
        console.warn('⚠️ Attenzione: Creazione stanza Twilio fallita.', twilioError.message);
      }
    }

    // 4. SALVA LE MODIFICHE e AGGIORNA L'UTENTE
    await meal.save();
    console.log(`✅ [MealCreationService] Pasto salvato con chatId: ${meal.chatId}`);
    
    // Aggiorna l'User (opzionale, per statistiche)
    await User.findByIdAndUpdate(user.id, { $push: { createdMeals: meal._id } });
    console.log(`✅ [MealCreationService] Statistiche utente aggiornate`);

    // 5. INVIA NOTIFICHE (in background, non blocca la risposta)
    if (meal.mealType === 'physical' && meal.isPublic && meal.location?.coordinates) {
      setImmediate(() => {
        geolocationNotificationService.sendNearbyMealNotifications(meal)
          .then(() => console.log(`[Service] Notifiche geolocalizzate per ${meal._id} inviate.`))
          .catch(err => console.error(`[Service] Errore invio notifiche geolocalizzate:`, err));
      });
    }
    
    // 7. RESTITUISCI IL PASTO CREATO
    return meal;

  } catch (error) {
    // GESTIONE ERRORI: Se qualcosa va storto, cancelliamo quello che abbiamo creato.
    console.error('❌ [Service] Errore durante la creazione del pasto. Avvio pulizia...');
    if (meal) await Meal.findByIdAndDelete(meal._id);
    if (chat) await Chat.findByIdAndDelete(chat._id);
    
    // Rilanciamo l'errore, così il controller saprà che qualcosa è andato storto.
    throw error;
  }
}

module.exports = {
  createFullMeal,
};
