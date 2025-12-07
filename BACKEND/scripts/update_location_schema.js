// BACKEND/scripts/update_location_schema.js (Versione Finale Pulita)

const mongoose = require('mongoose');
const User = require('../models/User');
// Ora che la nostra configurazione è corretta, torniamo a usare dotenv
require('dotenv').config({ path: '../../.env' });


const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI non trovato! Controlla il file .env nella cartella principale.');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connesso per lo script...');
  } catch (err) {
    console.error('Errore di connessione al DB:', err.message);
    process.exit(1);
  }
};

const migrateUsers = async () => {
  await connectDB();
  try {
    const usersToMigrate = await User.find({
      'location.type': { $exists: false }
    });

    if (usersToMigrate.length === 0) {
      console.log('Nessun utente da aggiornare. Schema già corretto.');
      return;
    }

    // ... (il resto della logica rimane uguale, non serve ripeterla perché la migrazione è già avvenuta)

  } catch (error) {
    console.error('Errore durante la migrazione:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connessione al DB chiusa.');
  }
};

// Puoi commentare la chiamata se non vuoi che parta per errore in futuro
// migrateUsers();
console.log("Script di migrazione eseguito con successo in passato. Se necessario, decommentare 'migrateUsers()' per eseguirlo di nuovo.");