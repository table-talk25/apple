const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const FIREBASE_PROJECT_ID = 'tabletalk-social';

function initFirebaseAdmin() {
  if (admin.apps.length > 0) return;
  let serviceAccount = null;
  let firebaseInitialized = false;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      let jsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      if ((jsonString.startsWith('"') && jsonString.endsWith('"')) ||
          (jsonString.startsWith("'") && jsonString.endsWith("'"))) {
        jsonString = jsonString.slice(1, -1);
        jsonString = jsonString.replace(/\\"/g, '"').replace(/\\n/g, '\n');
      }
      serviceAccount = JSON.parse(jsonString);
      firebaseInitialized = true;
      console.log('[Firebase] Credenziali caricate da JSON ambiente (contenuto omesso)');
    } catch {
      console.error('[Firebase] JSON delle credenziali non valido (contenuto omesso)');
    }
  }

  if (!firebaseInitialized && process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID || '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
      universe_domain: 'googleapis.com',
    };
    firebaseInitialized = true;
    console.log('[Firebase] Credenziali caricate da variabili separate (contenuto omesso)');
  }

  if (!firebaseInitialized) {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        if (serviceAccount.private_key_id === 'TEMP_KEY_ID_FOR_DEPLOY') {
          serviceAccount = null;
          console.log('[Firebase] Credenziali temporanee ignorate');
        } else {
          firebaseInitialized = true;
          console.log('[Firebase] Credenziali caricate da file (contenuto omesso)');
        }
      } catch {
        serviceAccount = null;
        console.error('[Firebase] File credenziali non leggibile o non valido (dettagli omessi)');
      }
    }
  }

  if (serviceAccount && firebaseInitialized) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID,
    });
    console.log('[Firebase] Admin SDK inizializzato con credenziali; consegna push non verificata');
  } else {
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID });
    console.warn('[Firebase] Admin SDK inizializzato senza credenziali esplicite; disponibilita push non verificata');
  }
}

try {
  initFirebaseAdmin();
} catch {
  console.error('[Firebase] Inizializzazione fallita (dettagli credenziali omessi)');
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID });
      console.warn('[Firebase] Fallback senza credenziali esplicite; disponibilita push non verificata');
    }
  } catch {
    console.error('[Firebase] Fallback fallito; servizio push non inizializzato');
  }
}

module.exports = admin;
