const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
const { readAdminCredentials } = require('./lib/safety');
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });

// Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/createAdmin.js
// Nessuna credenziale predefinita nel sorgente; password di almeno 12 caratteri.
const createAdmin = async () => {
  let credentials;
  try {
    credentials = readAdminCredentials(process.env);
  } catch (error) {
    console.error(`Errore: ${error.message}`);
    process.exit(1);
  }

  try {
    // Connessione al database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connesso al database MongoDB');

    // Verifica se l'admin esiste già
    const adminExists = await User.findOne({ email: credentials.email });
    if (adminExists) {
      console.log('L\'utente admin esiste già');
      process.exit(0);
    }

    // Crea l'utente admin (la password viene hashata dal middleware pre-save)
    const admin = new User({
      email: credentials.email,
      password: credentials.password,
      name: 'Admin',
      surname: 'TableTalk',
      nickname: 'admin_tabletalk',
      role: 'admin',
      profileCompleted: true,
      isVerified: true
    });

    await admin.save();
    console.log('Utente admin creato con successo');
    process.exit(0);
  } catch (error) {
    console.error('Errore durante la creazione dell\'admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
