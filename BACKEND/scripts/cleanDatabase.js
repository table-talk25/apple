// File: BACKEND/scripts/cleanDatabase.js
// 🧹 SCRIPT DI PULIZIA COMPLETA DEL DATABASE
// 
// Questo script rimuove tutti i dati di test sporchi e prepara il database
// per essere popolato con dati puliti e realistici

const mongoose = require('mongoose');
const User = require('../models/User');
const Meal = require('../models/Meal');
const Chat = require('../models/Chat');
// const Message = require('../models/Message'); // Modello non esistente
const Report = require('../models/Report');
// const Notification = require('../models/Notification'); // Modello non esistente
// const VideoCall = require('../models/VideoCall'); // Modello non esistente

// Configurazione connessione MongoDB
const { assertDestructiveAllowed, resolveMongoUri, maskMongoUri } = require('./lib/safety');

// Un solo nome di variabile (MONGO_URI); fallisce se MONGO_URI e MONGODB_URI sono diverse
const MONGODB_URI = resolveMongoUri(process.env);

class DatabaseCleaner {
  constructor() {
    this.connection = null;
    this.stats = {
      usersRemoved: 0,
      mealsRemoved: 0,
      chatsRemoved: 0,
      messagesRemoved: 0,
      reportsRemoved: 0,
      notificationsRemoved: 0,
      videoCallsRemoved: 0
    };
  }

  /**
   * 🔌 Connette al database
   */
  async connect() {
    assertDestructiveAllowed('cleanDatabase');
    try {
      console.log('🔌 [DatabaseCleaner] Connessione al database...');
      
      this.connection = await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log('✅ [DatabaseCleaner] Connesso al database:', maskMongoUri(MONGODB_URI));
      return true;
    } catch (error) {
      console.error('❌ [DatabaseCleaner] Errore connessione:', error);
      return false;
    }
  }

  /**
   * 🚪 Disconnette dal database
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        console.log('✅ [DatabaseCleaner] Disconnesso dal database');
      }
    } catch (error) {
      console.error('❌ [DatabaseCleaner] Errore disconnessione:', error);
    }
  }

  /**
   * 🧹 Pulisce tutti i dati di test sporchi
   */
  async cleanAllData() {
    assertDestructiveAllowed('cleanDatabase');
    try {
      console.log('🧹 [DatabaseCleaner] Inizio pulizia completa del database...');
      
      // 1. Rimuovi utenti di test sporchi
      await this.cleanTestUsers();
      
      // 2. Rimuovi pasti incompleti e di test
      await this.cleanTestMeals();
      
      // 3. Rimuovi chat e messaggi sporchi
      await this.cleanTestChats();
      
      // 4. Rimuovi report di test
      await this.cleanTestReports();
      
      // 5. Rimuovi notifiche di test (modello non esistente)
      // await this.cleanTestNotifications();
      
      // 6. Rimuovi videochiamate di test (modello non esistente)
      // await this.cleanTestVideoCalls();
      
      // 7. Rimuovi dati orfani
      await this.cleanOrphanedData();
      
      console.log('✅ [DatabaseCleaner] Pulizia completata con successo!');
      this.printStats();
      
    } catch (error) {
      console.error('❌ [DatabaseCleaner] Errore durante la pulizia:', error);
      throw error;
    }
  }

  /**
   * 👥 Pulisce utenti di test sporchi
   */
  async cleanTestUsers() {
    try {
      console.log('👥 [DatabaseCleaner] Pulizia utenti di test...');
      
      // Criteri per utenti di test sporchi
      const testUserCriteria = {
        $or: [
          // Email di test
          { email: { $regex: /test|example|demo|fake|dummy/i } },
          { email: { $regex: /@test\.|@example\.|@demo\./i } },
          
          // Nomi di test
          { name: { $regex: /test|example|demo|fake|dummy|user\d+/i } },
          { surname: { $regex: /test|example|demo|fake|dummy|user\d+/i } },
          
          // Nickname di test
          { nickname: { $regex: /test|example|demo|fake|dummy|user\d+/i } },
          
          // Utenti senza email verificata (potenzialmente di test)
          { isEmailVerified: false },
          
          // Utenti creati recentemente con dati sospetti
          { 
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Ultimi 7 giorni
            $or: [
              { name: { $regex: /^[a-z]{1,3}$/i } }, // Nomi troppo corti
              { surname: { $regex: /^[a-z]{1,3}$/i } }, // Cognomi troppo corti
              { nickname: { $regex: /^[a-z]{1,3}$/i } } // Nickname troppo corti
            ]
          }
        ]
      };
      
      const usersToRemove = await User.find(testUserCriteria);
      console.log(`📊 [DatabaseCleaner] Trovati ${usersToRemove.length} utenti di test da rimuovere`);
      
      if (usersToRemove.length > 0) {
        // Rimuovi utenti e aggiorna statistiche
        const result = await User.deleteMany(testUserCriteria);
        this.stats.usersRemoved = result.deletedCount;
        
        console.log(`✅ [DatabaseCleaner] Rimossi ${result.deletedCount} utenti di test`);
      }
      
    } catch (error) {
      console.error('❌ [DatabaseCleaner] Errore pulizia utenti:', error);
      throw error;
    }
  }

  /**
   * 🍽️ Pulisce pasti di test sporchi
   */
  async cleanTestMeals() {
    try {
      console.log('🍽️ [DatabaseCleaner] Pulizia pasti di test...');
      
      // Criteri per pasti di test sporchi
      const testMealCriteria = {
        $or: [
          // Titoli di test
          { title: { $regex: /test|example|demo|fake|dummy|meal\d+/i } },
          
          // Descrizioni di test
          { description: { $regex: /test|example|demo|fake|dummy|description\d+/i } },
          
          // Pasti senza partecipanti (incompleti)
          { participants: { $size: 0 } },
          
          // Pasti con dati incompleti
          { 
            $or: [
              { title: { $exists: false } },
              { title: { $in: ['', null, undefined] } },
              { description: { $exists: false } },
              { date: { $exists: false } },
              { location: { $exists: false } }
            ]
          },
          
          // Pasti con date passate e senza partecipanti
          { 
            date: { $lt: new Date() },
            participants: { $size: 0 }
          },
          
          // Pasti con titoli troppo corti o generici
          { title: { $regex: /^[a-z]{1,5}$/i } }
        ]
      };
      
      const mealsToRemove = await Meal.find(testMealCriteria);
      console.log(`📊 [DatabaseCleaner] Trovati ${mealsToRemove.length} pasti di test da rimuovere`);
      
      if (mealsToRemove.length > 0) {
        // Rimuovi pasti e aggiorna statistiche
        const result = await Meal.deleteMany(testMealCriteria);
        this.stats.mealsRemoved = result.deletedCount;
        
        console.log(`✅ [DatabaseCleaner] Rimossi ${result.deletedCount} pasti di test`);
      }
      
    } catch (error) {
      console.error('❌ [DatabaseCleaner] Errore pulizia pasti:', error);
      throw error;
    }
  }

  /**
   * 💬 Pulisce chat e messaggi di test sporchi
   */
  async cleanTestChats() {
    try {
      console.log('💬 [DatabaseCleaner] Pulizia chat e messaggi di test...');
      
      // Rimuovi chat vuote o di test
      const testChatCriteria = {
        $or: [
          // Chat senza messaggi
          { messages: { $size: 0 } },
          
          // Chat con nomi di test
          { name: { $regex: /test|example|demo|fake|dummy/i } },
          
          // Chat senza partecipanti
          { participants: { $size: 0 } }
        ]
      };
      
      const chatsToRemove = await Chat.find(testChatCriteria);
      console.log(`📊 [DatabaseCleaner] Trovati ${chatsToRemove.length} chat di test da rimuovere`);
      
      if (chatsToRemove.length > 0) {
        const result = await Chat.deleteMany(testChatCriteria);
        this.stats.chatsRemoved = result.deletedCount;
        console.log(`✅ [DatabaseCleaner] Rimossi ${result.deletedCount} chat di test`);
      }
      
    } catch (error) {
      console.error('❌ [DatabaseCleaner] Errore pulizia chat:', error);
      throw error;
    }
  }

  /**
   * 🚨 Pulisce report di test sporchi
   */
  async cleanTestReports() {
    try {
      console.log('🚨 [DatabaseCleaner] Pulizia report di test...');
      
      const testReportCriteria = {
        $or: [
          // Report con contenuto di test
          { reason: { $regex: /test|example|demo|fake|dummy/i } },
          { description: { $regex: /test|example|demo|fake|dummy/i } },
          
          // Report vuoti o incompleti
          { reason: { $exists: false } },
          { description: { $exists: false } },
          
          // Report con descrizioni troppo corte
          { description: { $regex: /^[a-z\s]{1,10}$/i } }
        ]
      };
      
      const reportsToRemove = await Report.find(testReportCriteria);
      console.log(`📊 [DatabaseCleaner] Trovati ${reportsToRemove.length} report di test da rimuovere`);
      
      if (reportsToRemove.length > 0) {
        const result = await Report.deleteMany(testReportCriteria);
        this.stats.reportsRemoved = result.deletedCount;
        console.log(`✅ [DatabaseCleaner] Rimossi ${result.deletedCount} report di test`);
      }
      
    } catch (error) {
      console.error('❌ [DatabaseCleaner] Errore pulizia report:', error);
      throw error;
    }
  }

  /**
   * 🔔 Pulisce notifiche di test sporche (DISABILITATO - modello non esistente)
   */
  async cleanTestNotifications() {
    try {
      console.log('🔔 [DatabaseCleaner] Pulizia notifiche di test... (DISABILITATO)');
      // Funzione disabilitata perché il modello Notification non esiste
      this.stats.notificationsRemoved = 0;
      
    } catch (error) {
      console.error('❌ [DatabaseCleaner] Errore pulizia notifiche:', error);
      throw error;
    }
  }

  /**
   * 📹 Pulisce videochiamate di test sporche (DISABILITATO - modello non esistente)
   */
  async cleanTestVideoCalls() {
    try {
      console.log('📹 [DatabaseCleaner] Pulizia videochiamate di test... (DISABILITATO)');
      // Funzione disabilitata perché il modello VideoCall non esiste
      this.stats.videoCallsRemoved = 0;
      
    } catch (error) {
      console.error('❌ [DatabaseCleaner] Errore pulizia videochiamate:', error);
      throw error;
    }
  }

  /**
   * 🗑️ Pulisce dati orfani e referenze rotte
   */
  async cleanOrphanedData() {
    try {
      console.log('🗑️ [DatabaseCleaner] Pulizia dati orfani...');
      
      // 1. Rimuovi pasti con host inesistenti
      const orphanedMeals = await Meal.find({
        host: { $exists: true, $ne: null }
      });
      
      let orphanedMealsCount = 0;
      for (const meal of orphanedMeals) {
        const hostExists = await User.findById(meal.host);
        if (!hostExists) {
          await Meal.findByIdAndDelete(meal._id);
          orphanedMealsCount++;
        }
      }
      
      if (orphanedMealsCount > 0) {
        console.log(`✅ [DatabaseCleaner] Rimossi ${orphanedMealsCount} pasti con host inesistenti`);
      }
      
      // 2. Rimuovi chat con partecipanti inesistenti
      const orphanedChats = await Chat.find({
        participants: { $exists: true, $ne: [] }
      });
      
      let orphanedChatsCount = 0;
      for (const chat of orphanedChats) {
        const validParticipants = [];
        for (const participantId of chat.participants) {
          const participantExists = await User.findById(participantId);
          if (participantExists) {
            validParticipants.push(participantId);
          }
        }
        
        if (validParticipants.length === 0) {
          await Chat.findByIdAndDelete(chat._id);
          orphanedChatsCount++;
        } else if (validParticipants.length !== chat.participants.length) {
          chat.participants = validParticipants;
          await chat.save();
        }
      }
      
      if (orphanedChatsCount > 0) {
        console.log(`✅ [DatabaseCleaner] Rimossi ${orphanedChatsCount} chat con partecipanti inesistenti`);
      }
      
    } catch (error) {
      console.error('❌ [DatabaseCleaner] Errore pulizia dati orfani:', error);
      throw error;
    }
  }

  /**
   * 📊 Stampa le statistiche della pulizia
   */
  printStats() {
    console.log('\n📊 [DatabaseCleaner] STATISTICHE PULIZIA COMPLETATA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 Utenti rimossi:     ${this.stats.usersRemoved}`);
    console.log(`🍽️ Pasti rimossi:      ${this.stats.mealsRemoved}`);
    console.log(`💬 Chat rimosse:       ${this.stats.chatsRemoved}`);
    console.log(`💬 Messaggi rimossi:   ${this.stats.messagesRemoved}`);
    console.log(`🚨 Report rimossi:     ${this.stats.reportsRemoved}`);
    console.log(`🔔 Notifiche rimosse:  ${this.stats.notificationsRemoved}`);
    console.log(`📹 Videochiamate rimosse: ${this.stats.videoCallsRemoved}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const totalRemoved = Object.values(this.stats).reduce((sum, count) => sum + count, 0);
    console.log(`🎯 TOTALE ELEMENTI RIMOSSI: ${totalRemoved}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * 🔍 Mostra lo stato attuale del database
   */
  async showDatabaseStatus() {
    try {
      console.log('🔍 [DatabaseCleaner] STATO ATTUALE DEL DATABASE:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const userCount = await User.countDocuments();
      const mealCount = await Meal.countDocuments();
      const chatCount = await Chat.countDocuments();
      // const messageCount = await Message.countDocuments(); // Modello non esistente
      const messageCount = 0; // Placeholder
      const reportCount = await Report.countDocuments();
      // const notificationCount = await Notification.countDocuments(); // Modello non esistente
      // const videoCallCount = await VideoCall.countDocuments(); // Modello non esistente
      const notificationCount = 0; // Placeholder
      const videoCallCount = 0; // Placeholder
      
      console.log(`👥 Utenti totali:      ${userCount}`);
      console.log(`🍽️ Pasti totali:       ${mealCount}`);
      console.log(`💬 Chat totali:        ${chatCount}`);
      console.log(`💬 Messaggi totali:    ${messageCount}`);
      console.log(`🚨 Report totali:      ${reportCount}`);
      console.log(`🔔 Notifiche totali:   ${notificationCount}`);
      console.log(`📹 Videochiamate totali: ${videoCallCount}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
    } catch (error) {
      console.error('❌ [DatabaseCleaner] Errore nel recupero stato database:', error);
    }
  }
}

// Funzione principale per eseguire la pulizia
async function main() {
  const cleaner = new DatabaseCleaner();
  
  try {
    // Mostra stato iniziale
    await cleaner.showDatabaseStatus();
    
    // Esegui pulizia completa
    await cleaner.cleanAllData();
    
    // Mostra stato finale
    await cleaner.showDatabaseStatus();
    
    console.log('🎉 [DatabaseCleaner] Database pulito e pronto per essere popolato con dati puliti!');
    
  } catch (error) {
    console.error('💥 [DatabaseCleaner] Errore fatale durante la pulizia:', error);
    process.exit(1);
  } finally {
    await cleaner.disconnect();
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  main();
}

module.exports = DatabaseCleaner;
