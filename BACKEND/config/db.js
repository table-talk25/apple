const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI || !process.env.MONGO_URI.trim()) {
    throw new Error('MONGO_URI is required');
  }

  console.log('Tentativo di connessione a MongoDB...');

  if (!mongoose.connection.__tableTalkListenersRegistered) {
    mongoose.connection.on('connecting', () => {
      console.log('Mongoose: connessione in corso');
    });
    mongoose.connection.on('connected', () => {
      console.log('Mongoose: connesso a MongoDB');
    });
    mongoose.connection.on('error', () => {
      console.error('Mongoose: errore di connessione');
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('Mongoose: disconnesso da MongoDB');
    });
    mongoose.connection.__tableTalkListenersRegistered = true;
  }

  return mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
};

module.exports = connectDB;
