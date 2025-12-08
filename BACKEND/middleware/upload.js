// File: /BACKEND/middleware/upload.js (Versione Finale e Corretta)

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Funzione per assicurarsi che una directory esista
const ensureExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configurazione dello storage con destinazione dinamica
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('📁 [Upload] === INIZIO PROCESSO UPLOAD ===');
    console.log('📁 [Upload] req.originalUrl:', req.originalUrl);
    console.log('📁 [Upload] file.fieldname:', file.fieldname);
    console.log('📁 [Upload] file.originalname:', file.originalname);
    console.log('📁 [Upload] file.mimetype:', file.mimetype);
    console.log('📁 [Upload] file.size:', file.size);
    
    // Controlliamo il percorso della rotta per decidere dove salvare!
    let uploadPath = 'uploads/';
    if (req.originalUrl.includes('/profile')) {
      uploadPath += 'profile-images/';
      console.log('📁 [Upload] Destinazione: PROFILE IMAGES');
    } else if (req.originalUrl.includes('/meals')) {
      uploadPath += 'meal-images/';
      console.log('📁 [Upload] Destinazione: MEAL IMAGES');
    } else {
      console.log('📁 [Upload] Destinazione: GENERICA');
    }

    console.log('📁 [Upload] Percorso finale:', uploadPath);
    ensureExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Nome file pulito: nomecampo-idutente-data.estensione
    console.log('📝 [Upload] === GENERAZIONE NOME FILE ===');
    console.log('📝 [Upload] req.user:', req.user);
    console.log('📝 [Upload] req.user.id:', req.user?.id);
    console.log('📝 [Upload] file.fieldname:', file.fieldname);
    console.log('📝 [Upload] file.originalname:', file.originalname);
    
    // Fallback se req.user non è disponibile
    const userId = req.user?.id || 'anonymous';
    const uniqueSuffix = `${userId}-${Date.now()}`;
    const finalFilename = `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
    
    console.log('📝 [Upload] Nome file finale:', finalFilename);
    console.log('📝 [Upload] === FINE GENERAZIONE NOME FILE ===');
    cb(null, finalFilename);
  }
});

// Filtro per accettare solo immagini
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Formato file non supportato. Solo immagini permesse.'), false);
  }
};

// Esportiamo direttamente l'istanza di multer configurata
module.exports = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB per i file
    fieldSize: 2 * 1024 * 1024, // 2MB per i campi (per gestire location JSON e altri dati)
    fields: 50, // Numero massimo di campi non-file
    fieldNameSize: 100 // Lunghezza massima del nome del campo
  },
  fileFilter: fileFilter
});