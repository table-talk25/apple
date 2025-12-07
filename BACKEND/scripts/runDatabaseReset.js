#!/usr/bin/env node

// File: BACKEND/scripts/runDatabaseReset.js
// 🚀 SCRIPT SEMPLIFICATO PER RESET DATABASE
// 
// Esegue: node BACKEND/scripts/runDatabaseReset.js
// 
// Questo script esegue il reset completo del database:
// 1. Rimuove tutti i dati sporchi di test
// 2. Popola con dati realistici per i tester

const DatabaseResetter = require('./resetDatabase');

async function main() {
  console.log('🚀 [TableTalk] AVVIO RESET COMPLETO DEL DATABASE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  ATTENZIONE: Questo script rimuoverà TUTTI i dati di test dal database!');
  console.log('✅ Il database verrà poi popolato con dati realistici e puliti.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const resetter = new DatabaseResetter();
  
  try {
    // Esegui reset completo
    await resetter.resetDatabase();
    
    console.log('🎉 [TableTalk] Database resettato con successo!');
    console.log('🚀 L\'app è ora pronta per i tester con dati puliti e realistici.');
    
  } catch (error) {
    console.error('💥 [TableTalk] ERRORE FATALE durante il reset del database:', error);
    console.error('🔧 Controlla la connessione al database e riprova.');
    process.exit(1);
  }
}

// Esegui lo script
main();
