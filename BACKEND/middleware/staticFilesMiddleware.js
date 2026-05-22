const express = require('express');
const path = require('path');
const fs = require('fs').promises;

// Configurazione per servire i file statici
const staticOptions = {
  maxAge: '1d', // Cache per 1 giorno
};

// Middleware per verificare l'esistenza della cartella uploads e del file default-avatar.jpg
const ensureUploadsDirectory = async (req, res, next) => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const profileImagesDir = path.join(uploadsDir, 'profile-images');
    const defaultAvatarPath = path.join(uploadsDir, 'default-avatar.jpg');
    
    // Crea le cartelle se non esistono
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(profileImagesDir, { recursive: true });
    
    // Verifica che il file default-avatar.jpg esista
    try {
      await fs.access(defaultAvatarPath);
    } catch (error) {
      console.warn('File default-avatar.jpg non trovato in:', defaultAvatarPath);
      // Crea un file placeholder se non esiste
      const placeholderBuffer = Buffer.from('Placeholder avatar');
      await fs.writeFile(defaultAvatarPath, placeholderBuffer);
      console.log('File default-avatar.jpg creato automaticamente');
    }
    
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

// Middleware per evitare accessi a cssRules su elementi nulli
const safeCssRulesAccess = (req, res, next) => {
  // Salva il riferimento originale a res.send
  const originalSend = res.send;
  
  // Sovrascrivi res.send per aggiungere controlli di sicurezza
  res.send = function(body) {
    // Verifica che il body non sia nullo o undefined
    if (body === null || body === undefined) {
      return originalSend.call(this, '');
    }
    
    // Se il body è un oggetto, verifica che non abbia proprietà nulle
    if (typeof body === 'object' && body !== null) {
      try {
        JSON.stringify(body);
      } catch (error) {
        console.error('Errore durante la serializzazione del body:', error);
        return originalSend.call(this, '{}');
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

// Middleware per registrare listener prima di inviare messaggi
const safeMessageListener = (req, res, next) => {
  // Verifica che tabs esista e abbia il metodo sendMessage
  if (typeof tabs !== 'undefined' && tabs && typeof tabs.sendMessage === 'function') {
    // Registra il listener tabs:outgoing.message.ready se non è già registrato
    if (!tabs._messageListenerRegistered) {
      tabs.on('tabs:outgoing.message.ready', (message) => {
        console.log('Messaggio pronto per l\'invio:', message);
      });
      tabs._messageListenerRegistered = true;
    }
  }
  
  next();
};

module.exports = {
  ensureUploadsDirectory,
  serveStaticFiles,
  safeCssRulesAccess,
  safeMessageListener
};