// File: BACKEND/middleware/error.js (Versione Finale e Corretta)
const ErrorResponse = require('../utils/errorResponse');
const { MulterError } = require('multer');

const errorHandler = (err, req, res, next) => {
  // Iniziamo con una copia dell'errore per poterlo modificare
  let error = { ...err };
  error.message = err.message;

  // Log per noi sviluppatori per vedere l'errore completo
  console.log('--- GESTORE ERRORI ATTIVATO ---');
  console.error(err);

  // === GESTIONE ERRORI MULTER ===
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new ErrorResponse('Il file è troppo grande. La dimensione massima è 2MB.', 400);
    } else {
      error = new ErrorResponse(`Errore upload file: ${err.message}`, 400);
    }
  }

  // === GESTIONE ERRORI SPECIFICI ===

  // Errore di ID non valido (CastError di Mongoose)
  if (err.name === 'CastError') {
    const message = `La risorsa richiesta non è stata trovata.`;
    error = new ErrorResponse(message, 404);
  }

  // Errore di campo duplicato (es. email già esistente)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Un account con questo ${field} esiste già. Per favore, usane un altro.`;
    error = new ErrorResponse(message, 400);
  }

  // Errore di validazione di Mongoose (es. un campo required dello schema non rispettato)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    const details = Object.values(err.errors).map(val => ({ path: val.path, msg: val.message }));
    error = new ErrorResponse(messages.join('. '), 400, details);
  }

  // === RISPOSTA FINALE AL FRONTEND ===

  // Prepariamo la risposta JSON.
  // La cosa più importante è che usiamo `err.details` dall'errore ORIGINALE
  // per assicurarci di non perdere l'array di errori di validazione.
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Errore Interno del Server',
    errors: err.details || [], 
  });
};

module.exports = errorHandler;