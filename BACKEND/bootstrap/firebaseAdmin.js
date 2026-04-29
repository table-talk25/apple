/**
 * Inizializzazione Firebase Admin (push). Side-effect all'import: stesso comportamento di prima.
 */
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

function initFirebaseAdmin() {
  let serviceAccount = null;
  let firebaseInitialized = false;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      let jsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();

      if (
        (jsonString.startsWith('"') && jsonString.endsWith('"')) ||
        (jsonString.startsWith("'") && jsonString.endsWith("'"))
      ) {
        jsonString = jsonString.slice(1, -1);
        jsonString = jsonString.replace(/\\"/g, '"').replace(/\\n/g, '\n');
      }

      serviceAccount = JSON.parse(jsonString);
      console.log("📦 Firebase: Credenziali caricate da variabile d'ambiente FIREBASE_SERVICE_ACCOUNT_JSON");
      console.log('📦 Firebase: Project ID:', serviceAccount.project_id);
      console.log('📦 Firebase: Client Email:', serviceAccount.client_email);
      firebaseInitialized = true;
    } catch (parseError) {
      console.error('❌ Errore nel parsing di FIREBASE_SERVICE_ACCOUNT_JSON:', parseError.message);
      console.error(
        '❌ JSON ricevuto (primi 200 caratteri):',
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON.substring(0, 200)
      );
    }
  }

  if (
    !firebaseInitialized &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PROJECT_ID
  ) {
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
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
        process.env.FIREBASE_CLIENT_EMAIL
      )}`,
      universe_domain: 'googleapis.com',
    };
    console.log("📦 Firebase: Credenziali caricate da variabili d'ambiente separate");
    firebaseInitialized = true;
  }

  if (!firebaseInitialized) {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      try {
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
        serviceAccount = JSON.parse(fileContent);

        if (serviceAccount.private_key_id === 'TEMP_KEY_ID_FOR_DEPLOY') {
          console.log('⚠️  File Firebase temporaneo rilevato');
          serviceAccount = null;
        } else {
          console.log('📦 Firebase: Credenziali caricate da file firebase-service-account.json');
          firebaseInitialized = true;
        }
      } catch (fileError) {
        console.error('❌ Errore nel caricamento del file Firebase:', fileError.message);
        serviceAccount = null;
      }
    }
  }

  if (serviceAccount && firebaseInitialized) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'tabletalk-social',
      });
      console.log('✅ Firebase Admin SDK inizializzato correttamente - Notifiche push ABILITATE');
    } catch (initError) {
      console.error("❌ Errore nell'inizializzazione Firebase con credenziali:", initError.message);
      throw initError;
    }
  } else {
    console.log('⚠️  Firebase: Nessuna credenziale trovata (né da env né da file)');
    console.log('⚠️  Firebase Admin SDK non configurato. Le notifiche push NON funzioneranno.');
    console.log('💡 Per abilitare le notifiche push:');
    console.log('   1. Su Render: Aggiungi variabile FIREBASE_SERVICE_ACCOUNT_JSON con il JSON completo');
    console.log('   2. Oppure: Aggiungi FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID');
    console.log('   3. In locale: Aggiungi il file firebase-service-account.json nella cartella BACKEND');

    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'tabletalk-social',
    });
    console.log('✅ Firebase Admin SDK inizializzato in modalità limitata (senza notifiche push)');
  }
}

try {
  initFirebaseAdmin();
} catch (error) {
  console.error("❌ Errore nell'inizializzazione di Firebase Admin SDK:", error.message);
  console.log('⚠️  Firebase Admin SDK non configurato. Le notifiche push non funzioneranno.');

  try {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'tabletalk-social',
    });
    console.log('✅ Firebase Admin SDK inizializzato in modalità limitata (fallback)');
  } catch (fallbackError) {
    console.error('❌ Anche il fallback Firebase è fallito:', fallbackError.message);
    console.log("⚠️  L'app continuerà a funzionare senza notifiche push");
  }
}

module.exports = admin;
