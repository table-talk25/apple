// File: BACKEND/services/firebaseStorageService.js

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET || 'tabletalk-social.firebasestorage.app';

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: STORAGE_BUCKET,
    });
  } else {
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

const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes(bucket.name)) {
      return;
    }

    const filePath = imageUrl.split(`${bucket.name}/`)[1];
    if (!filePath) return;

    const file = bucket.file(filePath);
    await file.delete();
    console.log(`✅ [Firebase Storage] Immagine eliminata: ${filePath}`);
  } catch (error) {
    console.error('❌ [Firebase Storage] Errore eliminazione:', error);
  }
};

module.exports = { uploadImage, deleteImage };
