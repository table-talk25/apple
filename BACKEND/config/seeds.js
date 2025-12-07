const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');

// Carica le variabili d'ambiente
dotenv.config({ path: path.join(__dirname, '../..', '.env') });

// Connessione al database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connesso per i seed'))
  .catch(err => {
    console.error('Errore di connessione a MongoDB:', err);
    process.exit(1);
  });

// Dati dell'admin
const adminData = {
  email: 'admin@tabletalk.com',
  password: 'Admin123!',
  name: 'Admin',
  surname: 'TableTalk',
  nickname: 'admin',
  role: 'admin',
  profileCompleted: true,
  isVerified: true,
  active: true
};

// Funzione per creare l'admin
const createAdmin = async () => {
  try {
    // Verifica se l'admin esiste già
    const existingAdmin = await User.findOne({ email: adminData.email });
    
    if (existingAdmin) {
      console.log('Admin già esistente nel database');
      return;
    }

    // Crea il nuovo admin
    const admin = await User.create(adminData);
    console.log('Admin creato con successo:', admin.email);
  } catch (error) {
    console.error('Errore nella creazione dell\'admin:', error);
  } finally {
    // Chiudi la connessione
    mongoose.connection.close();
  }
};

// Esegui la creazione dell'admin
createAdmin(); 