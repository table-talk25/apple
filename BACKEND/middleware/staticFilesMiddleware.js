const express = require('express');
const path = require('path');
const fs = require('fs').promises;

// Configurazione per servire i file statici
const staticOptions = {
  maxAge: '1d', // Cache per 1 giorno
};

// Middleware per verificare l'esistenza della cartella uploads
const ensureUploadsDirectory = async (req, res, next) => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const profileImagesDir = path.join(uploadsDir, 'profile-images');
    
    // Crea le cartelle se non esistono
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(profileImagesDir, { recursive: true });
    
    next();
  } catch (error) {
    console.error('Errore durante la creazione delle cartelle uploads:', error);
    next(error);
  }
};

// Middleware per servire i file statici
const serveStaticFiles = express.static(
  path.join(__dirname, '..', 'uploads'),
  staticOptions
);

module.exports = {
  ensureUploadsDirectory,
  serveStaticFiles
}; 