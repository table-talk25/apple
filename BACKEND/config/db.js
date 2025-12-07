// File: BACKEND/config/db.js

const mongoose = require('mongoose');

const connectDB = async () => {
  console.log('--- VERIFICA DELLA STRINGA DI CONNESSIONE ---');
  console.log(`Il server sta usando questa MONGO_URI: ${process.env.MONGO_URI}`);
  console.log('-------------------------------------------');
  console.log('Tentativo di connessione a MongoDB...');

  // Aggiungiamo dei "listener" per capire cosa succede
  mongoose.connection.on('connecting', () => {
    console.log('ℹ️ Mongoose: Connessione in corso...');
  });

  mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose: Connesso a MongoDB con successo.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose: Errore di connessione:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('ℹ️ Mongoose: Disconnesso da MongoDB.');
  });

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000 // Riduciamo il timeout per un feedback più rapido
    });
    console.log(`🚀 Host di connessione MongoDB: ${conn.connection.host}`);
  } catch (err) {
    console.error(`🔥 Errore CRITICO durante la connessione iniziale: ${err.message}`);
    // Non usciamo dal processo per vedere se i listener ci danno più info
    // process.exit(1); 
  }
};

module.exports = connectDB;