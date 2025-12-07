const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });

const createAdmin = async () => {
  try {
    // Connessione al database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connesso al database MongoDB');

    // Verifica se l'admin esiste già
    const adminExists = await User.findOne({ email: 'admin@tabletalk.com' });
    if (adminExists) {
      console.log('L\'utente admin esiste già');
      process.exit(0);
    }

    // Crea l'utente admin
    const admin = new User({
      email: 'admin@tabletalk.com',
      password: 'Admin123!',
      name: 'Admin',
      surname: 'TableTalk',
      nickname: 'admin_tabletalk',
      role: 'admin',
      profileCompleted: true,
      isVerified: true
    });

    // La password verrà hashata automaticamente dal middleware pre-save
    await admin.save();
    console.log('Utente admin creato con successo');
    process.exit(0);
  } catch (error) {
    console.error('Errore durante la creazione dell\'admin:', error);
    process.exit(1);
  }
};

createAdmin(); 