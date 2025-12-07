// File: BACKEND/scripts/resetDatabase.js
// 🔄 SCRIPT MASTER PER RESET COMPLETO DEL DATABASE
// 
// Questo script esegue in sequenza:
// 1. Pulizia completa del database (rimozione dati sporchi)
// 2. Seeding con dati realistici e puliti
// 
// Perfetto per preparare il database per i tester

const DatabaseCleaner = require('./cleanDatabase');
const DatabaseSeeder = require('./seeds');

class DatabaseResetter {
  constructor() {
    this.cleaner = new DatabaseCleaner();
    this.seeder = new DatabaseSeeder();
    this.startTime = null;
  }

  /**
   * 🔄 Esegue il reset completo del database
   */
  async resetDatabase() {
    try {
      this.startTime = Date.now();
      console.log('🔄 [DatabaseResetter] INIZIO RESET COMPLETO DEL DATABASE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // FASE 1: PULIZIA COMPLETA
      console.log('\n🧹 FASE 1: PULIZIA COMPLETA DEL DATABASE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await this.cleaner.connect();
      await this.cleaner.cleanAllData();
      await this.cleaner.disconnect();
      
      console.log('✅ FASE 1 COMPLETATA: Database pulito da tutti i dati sporchi');
      
      // FASE 2: SEEDING CON DATI REALISTICI
      console.log('\n🌱 FASE 2: POPOLAMENTO CON DATI REALISTICI');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await this.seeder.connect();
      await this.seeder.seedDatabase();
      await this.seeder.disconnect();
      
      console.log('✅ FASE 2 COMPLETATA: Database popolato con dati realistici');
      
      // STATISTICHE FINALI
      this.printFinalStats();
      
    } catch (error) {
      console.error('💥 [DatabaseResetter] ERRORE FATALE DURANTE IL RESET:', error);
      throw error;
    }
  }

  /**
   * 📊 Stampa le statistiche finali del reset
   */
  printFinalStats() {
    const duration = Date.now() - this.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    console.log('\n🎉 [DatabaseResetter] RESET COMPLETATO CON SUCCESSO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`⏱️  Tempo totale: ${minutes}m ${seconds}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n📋 RIEPILOGO OPERAZIONI COMPLETATE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧹 PULIZIA COMPLETATA:');
    console.log(`   • Utenti di test rimossi:     ${this.cleaner.stats.usersRemoved}`);
    console.log(`   • Pasti incompleti rimossi:   ${this.cleaner.stats.mealsRemoved}`);
    console.log(`   • Chat sporche rimosse:       ${this.cleaner.stats.chatsRemoved}`);
    console.log(`   • Messaggi di test rimossi:   ${this.cleaner.stats.messagesRemoved}`);
    console.log(`   • Report di test rimossi:     ${this.cleaner.stats.reportsRemoved}`);
    console.log(`   • Notifiche sporche rimosse:  ${this.cleaner.stats.notificationsRemoved}`);
    console.log(`   • Videochiamate di test rimosse: ${this.cleaner.stats.videoCallsRemoved}`);
    
    console.log('\n🌱 SEEDING COMPLETATO:');
    console.log(`   • Utenti realistici creati:   ${this.seeder.stats.usersCreated}`);
    console.log(`   • Pasti interessanti creati:  ${this.seeder.stats.mealsCreated}`);
    console.log(`   • Chat funzionali create:     ${this.seeder.stats.chatsCreated}`);
    console.log(`   • Messaggi di esempio creati: ${this.seeder.stats.messagesCreated}`);
    
    console.log('\n🎯 STATO FINALE DEL DATABASE:');
    console.log('   • Database completamente pulito da dati sporchi');
    console.log('   • Popolato con 5 utenti realistici e completi');
    console.log('   • 5 pasti interessanti (fisici e virtuali)');
    console.log('   • Chat generale funzionale con messaggi');
    console.log('   • Iscrizioni simulate ai pasti');
    console.log('   • Pronto per i tester!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🚀 PROSSIMI PASSI RACCOMANDATI:');
    console.log('   1. Verifica che l\'app si avvii correttamente');
    console.log('   2. Testa le funzionalità principali');
    console.log('   3. Verifica che i dati siano visibili correttamente');
    console.log('   4. Procedi con il testing dell\'app');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * 🔍 Mostra lo stato attuale del database
   */
  async showDatabaseStatus() {
    try {
      console.log('🔍 [DatabaseResetter] STATO ATTUALE DEL DATABASE:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Usa il seeder per mostrare lo stato
      await this.seeder.connect();
      await this.seeder.showFinalDatabaseStatus();
      await this.seeder.disconnect();
      
    } catch (error) {
      console.error('❌ [DatabaseResetter] Errore nel recupero stato database:', error);
    }
  }
}

// Funzione principale per eseguire il reset
async function main() {
  const resetter = new DatabaseResetter();
  
  try {
    // Esegui reset completo
    await resetter.resetDatabase();
    
    console.log('🎉 [DatabaseResetter] Database resettato e pronto per i tester!');
    
  } catch (error) {
    console.error('💥 [DatabaseResetter] Errore fatale durante il reset:', error);
    process.exit(1);
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  main();
}

module.exports = DatabaseResetter; 