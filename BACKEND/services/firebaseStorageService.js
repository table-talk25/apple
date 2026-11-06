// File: BACKEND/services/firebaseStorageService.js

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET || 'tabletalk-social.firebasestorage.app';

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    // Sviluppo locale: usa il file JSON
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: STORAGE_BUCKET,
    });
    console.log('✅ [Firebase Admin] Inizializzato con service account file (locale)');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Produzione: usa la variabile d'ambiente con il JSON completo
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: STORAGE_BUCKET,
      });
      console.log('✅ [Firebase Admin] Inizializzato con FIREBASE_SERVICE_ACCOUNT_JSON (produzione)');
    } catch (e) {
      console.error('❌ [Firebase Admin] Errore parsing FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'tabletalk-social',
        storageBucket: STORAGE_BUCKET,
      });
    }
  } else {
    console.warn('⚠️ [Firebase Admin] Nessuna credenziale trovata. Imposta FIREBASE_SERVICE_ACCOUNT_JSON su Coolify.');
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'tabletalk-social',
      storageBucket: STORAGE_BUCKET,
    });
  }
}

const bucket = admin.storage().bucket(STORAGE_BUCKET);

const uploadImage = async (fileBuffer, fileName, folder = 'profile-images') => {
  try {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fullFileName = `${folder}/${timestamp}_${sanitizedFileName}`;

    const file = bucket.file(fullFileName);

    await file.save(fileBuffer, {
      metadata: {
        contentType: 'image/jpeg',
      },
    });

    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fullFileName}`;
    console.log(`✅ [Firebase Storage] Immagine caricata: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error('❌ [Firebase Storage] Errore upload:', error);
    throw new Error(`Errore nel caricamento dell'immagine: ${error.message}`);
  }
};

// SEC-07: il server crea solo oggetti "<cartella>/<timestamp>_<nome sanificato>" (vedi uploadImage)
// nelle cartelle sotto. Solo questi percorsi possono essere eliminati, mai URL arbitrari.
const MANAGED_FOLDERS = ['profile-images', 'meal-images'];
const STORAGE_HOST = 'storage.googleapis.com';

/**
 * Ricava il percorso dell'oggetto dal suo URL pubblico solo se corrisponde a quello che
 * uploadImage genera per questo bucket; altrimenti null.
 */
const extractManagedObjectPath = (imageUrl, bucketName) => {
  if (typeof imageUrl !== 'string' || !imageUrl || !bucketName) return null;
  let url;
  try {
    url = new URL(imageUrl);
  } catch (_) {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== STORAGE_HOST || url.username || url.password) return null;
  if (url.search || url.hash) return null;
  const prefix = `/${bucketName}/`;
  if (!url.pathname.startsWith(prefix)) return null;
  const objectPath = url.pathname.slice(prefix.length);
  const match = /^([A-Za-z0-9-]+)\/(\d{10,}_[A-Za-z0-9._-]+)$/.exec(objectPath);
  if (!match || !MANAGED_FOLDERS.includes(match[1])) return null;
  return objectPath;
};

/**
 * Elimina un'immagine caricata dal server. Rifiuta (senza eliminare e con un avviso) qualsiasi URL
 * che non corrisponda ai percorsi gestiti: altro bucket, altra cartella, avatar di default, ecc.
 * @returns {Promise<boolean>} true se l'oggetto è stato eliminato
 */
const deleteImage = async (imageUrl) => {
  const filePath = extractManagedObjectPath(imageUrl, bucket.name);
  if (!filePath) {
    if (imageUrl) {
      console.warn('⚠️ [Firebase Storage] Eliminazione rifiutata: URL non corrispondente ai percorsi gestiti dal server');
    }
    return false;
  }
  try {
    await bucket.file(filePath).delete();
    console.log(`✅ [Firebase Storage] Immagine eliminata: ${filePath}`);
    return true;
  } catch (error) {
    console.error('❌ [Firebase Storage] Errore eliminazione:', error);
    return false;
  }
};

module.exports = { uploadImage, deleteImage, extractManagedObjectPath };
