// File: BACKEND/server.js (Versione Finale Stabile)

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const auth = require('./middleware/auth'); 
const cron = require('node-cron');
const Meal = require('./models/Meal');
const notificationService = require('./services/notificationService');
const pushNotificationService = require('./services/pushNotificationService');
const startMealStatusUpdater = require('./jobs/mealStatusUpdater');
const mealStatusService = require('./services/mealStatusService');
const dailyReportSummaryJob = require('./jobs/dailyReportSummary');
const startCronJobs = require('./utils/cronJobs');

// --- INIZIALIZZAZIONE FIREBASE ADMIN ---
const admin = require('firebase-admin');

try {
  let serviceAccount = null;
  let firebaseInitialized = false;

  // PRIORITÀ 1: Prova a caricare da variabili d'ambiente (per Render/deploy cloud)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      // Pulisci la stringa JSON (rimuovi spazi extra, newline, etc.)
      let jsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      
      // Se inizia e finisce con virgolette, rimuovile (potrebbe essere una stringa JSON stringificata)
      if ((jsonString.startsWith('"') && jsonString.endsWith('"')) || 
          (jsonString.startsWith("'") && jsonString.endsWith("'"))) {
        jsonString = jsonString.slice(1, -1);
        // Unescape eventuali caratteri escaped
        jsonString = jsonString.replace(/\\"/g, '"').replace(/\\n/g, '\n');
      }
      
      // Prova a parsare il JSON
      serviceAccount = JSON.parse(jsonString);
      console.log('📦 Firebase: Credenziali caricate da variabile d\'ambiente FIREBASE_SERVICE_ACCOUNT_JSON');
      console.log('📦 Firebase: Project ID:', serviceAccount.project_id);
      console.log('📦 Firebase: Client Email:', serviceAccount.client_email);
      firebaseInitialized = true;
    } catch (parseError) {
      console.error('❌ Errore nel parsing di FIREBASE_SERVICE_ACCOUNT_JSON:', parseError.message);
      console.error('❌ JSON ricevuto (primi 200 caratteri):', process.env.FIREBASE_SERVICE_ACCOUNT_JSON.substring(0, 200));
      // Non bloccare - prova con variabili separate o file
    }
  }
  
  // PRIORITÀ 1b: Se il JSON non ha funzionato, prova con variabili separate
  if (!firebaseInitialized && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    // Se le credenziali sono in variabili separate
    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Converti \n in newline reali
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID || '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
      universe_domain: 'googleapis.com'
    };
    console.log('📦 Firebase: Credenziali caricate da variabili d\'ambiente separate');
    firebaseInitialized = true;
  }

  // PRIORITÀ 2: Se non da env, prova a caricare dal file JSON (per sviluppo locale)
  if (!firebaseInitialized) {
  const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
  
  if (fs.existsSync(serviceAccountPath)) {
      try {
        // Usa readFileSync invece di require per evitare errori se il file non esiste
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
        serviceAccount = JSON.parse(fileContent);
    
    // Controlla se è il file temporaneo
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
      
  // Inizializza Firebase con le credenziali trovate
  if (serviceAccount && firebaseInitialized) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'tabletalk-social'
      });
      console.log('✅ Firebase Admin SDK inizializzato correttamente - Notifiche push ABILITATE');
    } catch (initError) {
      console.error('❌ Errore nell\'inizializzazione Firebase con credenziali:', initError.message);
      throw initError;
    }
  } else {
    // Nessuna credenziale trovata - modalità limitata
    console.log('⚠️  Firebase: Nessuna credenziale trovata (né da env né da file)');
    console.log('⚠️  Firebase Admin SDK non configurato. Le notifiche push NON funzioneranno.');
    console.log('💡 Per abilitare le notifiche push:');
    console.log('   1. Su Render: Aggiungi variabile FIREBASE_SERVICE_ACCOUNT_JSON con il JSON completo');
    console.log('   2. Oppure: Aggiungi FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID');
    console.log('   3. In locale: Aggiungi il file firebase-service-account.json nella cartella BACKEND');
    
    // Inizializza Firebase con configurazione vuota per evitare crash
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'tabletalk-social'
    });
    console.log('✅ Firebase Admin SDK inizializzato in modalità limitata (senza notifiche push)');
  }
} catch (error) {
  console.error('❌ Errore nell\'inizializzazione di Firebase Admin SDK:', error.message);
  console.log('⚠️  Firebase Admin SDK non configurato. Le notifiche push non funzioneranno.');
  
  // Inizializza Firebase con configurazione vuota per evitare crash
  try {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'tabletalk-social'
    });
    console.log('✅ Firebase Admin SDK inizializzato in modalità limitata (fallback)');
  } catch (fallbackError) {
    console.error('❌ Anche il fallback Firebase è fallito:', fallbackError.message);
    console.log('⚠️  L\'app continuerà a funzionare senza notifiche push');
  }
}

// ====================================================================
// VALIDAZIONE VARIABILI D'AMBIENTE - PREVENZIONE VALORI DI TEST
// ====================================================================
/**
 * Valida che le variabili d'ambiente critiche non contengano valori di test
 * Se in produzione e vengono rilevati valori di test, il server non si avvia
 */
function validateEnvironmentVariables() {
  const isProduction = process.env.NODE_ENV === 'production';
  const testValuePatterns = [
    /^test-/i,
    /^test_/i,
    /test$/i,
    /^fake-/i,
    /^fake_/i,
    /fake$/i,
    /^dummy-/i,
    /^dummy_/i,
    /dummy$/i,
    /^example-/i,
    /^example_/i,
    /example$/i
  ];

  const criticalVars = {
    // Twilio - obbligatorie se si usano videochiamate
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_API_KEY: process.env.TWILIO_API_KEY,
    TWILIO_API_SECRET: process.env.TWILIO_API_SECRET,
    // SendGrid - obbligatoria se si usano email
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY
  };

  const errors = [];

  for (const [varName, varValue] of Object.entries(criticalVars)) {
    // Se la variabile è definita, controlla che non sia un valore di test
    if (varValue) {
      const isTestValue = testValuePatterns.some(pattern => pattern.test(varValue));
      
      if (isTestValue) {
        const errorMsg = `❌ ERRORE CRITICO: ${varName} contiene un valore di test: "${varValue}"`;
        errors.push(errorMsg);
        console.error(errorMsg);
        
        if (isProduction) {
          console.error(`🚨 PRODUZIONE: Non è possibile avviare il server con valori di test!`);
          console.error(`💡 Soluzione: Imposta ${varName} con una chiave API reale su Render Dashboard`);
        } else {
          console.warn(`⚠️  SVILUPPO: ${varName} contiene un valore di test. Funzionalità correlate non funzioneranno.`);
        }
      }
    }
  }

  // In produzione, se ci sono errori, blocca l'avvio
  if (isProduction && errors.length > 0) {
    console.error('\n🚨 ============================================');
    console.error('🚨 ERRORE: VALORI DI TEST RILEVATI IN PRODUZIONE');
    console.error('🚨 ============================================');
    errors.forEach(err => console.error(err));
    console.error('\n💡 AZIONE RICHIESTA:');
    console.error('   1. Vai su Render Dashboard → Environment');
    console.error('   2. Rimuovi o aggiorna le variabili con valori di test');
    console.error('   3. Imposta le chiavi API reali per:');
    errors.forEach(err => {
      const varName = err.match(/^❌ ERRORE CRITICO: (\w+)/)?.[1];
      if (varName) console.error(`      - ${varName}`);
    });
    console.error('\n❌ Il server non si avvierà fino a quando non correggi queste variabili.\n');
    process.exit(1);
  }

  // In sviluppo, avvisa ma non blocca
  if (!isProduction && errors.length > 0) {
    console.warn('\n⚠️  ============================================');
    console.warn('⚠️  AVVISO: VALORI DI TEST RILEVATI IN SVILUPPO');
    console.warn('⚠️  ============================================');
    errors.forEach(err => console.warn(err));
    console.warn('\n💡 Nota: In sviluppo è permesso, ma le funzionalità correlate non funzioneranno.\n');
  }

  // Log delle variabili valide (solo prime 4 caratteri per sicurezza)
  if (isProduction) {
    console.log('✅ Validazione variabili d\'ambiente completata');
    for (const [varName, varValue] of Object.entries(criticalVars)) {
      if (varValue && !testValuePatterns.some(p => p.test(varValue))) {
        const masked = varValue.length > 8 
          ? `${varValue.substring(0, 4)}...${varValue.substring(varValue.length - 4)}`
          : '***';
        console.log(`   ✓ ${varName}: ${masked} (valida)`);
      }
    }
  }
}

// Esegui la validazione all'avvio
validateEnvironmentVariables();

// Inizializza l'app Express e il server HTTP
const app = express();
const server = http.createServer(app);

// Connetti al DB
connectDB();

// Legge le origini permesse dalla variabile d'ambiente e le divide in un array
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];

// Origini di default per app mobile (Capacitor) e sviluppo locale
const defaultMobileOrigins = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://localhost', // <--- AGGIUNGI QUESTO
  'http://localhost:3000',
  'http://localhost:3001'  // Aggiunto per sviluppo
];

// Costruisci la lista effettiva includendo sempre le origini mobile
const effectiveAllowedOrigins = Array.from(new Set([...(allowedOrigins || []), ...defaultMobileOrigins]));

// Debug delle variabili d'ambiente
console.log('🔧 [ENV] CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('🔧 [ENV] FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('🔧 [ENV] NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 [ENV] PORT:', process.env.PORT);

// Aggiungiamo un log per vedere quali origini vengono caricate all'avvio
console.log('🛡️ [CORS] Origini permesse caricate (ENV):', allowedOrigins);
console.log('🛡️ [CORS] Origini permesse effettive (ENV + default mobile):', effectiveAllowedOrigins);
console.log('🛡️ [CORS] Numero di origini effettive:', effectiveAllowedOrigins.length);

const corsOptions = {
  origin: (origin, callback) => {
    console.log('🌐 [CORS] Richiesta ricevuta da origin:', origin);
    console.log('🌐 [CORS] Tipo origin:', typeof origin);
    console.log('🌐 [CORS] Origin è undefined?', origin === undefined);
    console.log('🌐 [CORS] Origin è null?', origin === null);
    
    // Permetti richieste senza origin (Postman, mobile apps, ecc.)
    if (!origin) {
      console.log('✅ [CORS] Richiesta senza origin permessa');
      return callback(null, true);
    }
    
    // Controlla se l'origin è nella lista permessa (inclusi i default mobile)
    console.log('🔍 [CORS] Controllo origin nella lista...');
    console.log('🔍 [CORS] effectiveAllowedOrigins:', effectiveAllowedOrigins);
    console.log('🔍 [CORS] indexOf result:', effectiveAllowedOrigins.indexOf(origin));
    
    if (effectiveAllowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ [CORS] Origin permesso: ${origin}`);
      callback(null, true);
    } else {
      console.error(`❌ [CORS] ERRORE: Origine Rifiutata -> ${origin}`);
      console.error(`❌ [CORS] Origini permesse effettive:`, effectiveAllowedOrigins);
      console.error(`❌ [CORS] Lunghezza effectiveAllowedOrigins:`, effectiveAllowedOrigins.length);
      callback(new Error('Origine non permessa dalla policy CORS'));
    }
  },
  // Opzioni essenziali per gestire il preflight
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware essenziali
console.log('🚀 [SERVER] Applicando middleware CORS...');
app.use(cors(corsOptions));

// Gestione esplicita delle richieste OPTIONS per il preflight
console.log('🚀 [SERVER] Configurando gestione OPTIONS...');
app.options('*', cors(corsOptions));

// Middleware per loggare tutte le richieste
app.use((req, res, next) => {
  console.log(`📥 [REQUEST] ${req.method} ${req.url}`);
  console.log(`📥 [REQUEST] Origin: ${req.get('Origin')}`);
  console.log(`📥 [REQUEST] User-Agent: ${req.get('User-Agent')}`);
  console.log(`📥 [REQUEST] Headers:`, Object.keys(req.headers));
  next();
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// Aumentiamo i limiti del body parser per supportare payload JSON più grandi (es. base64)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use((req, res, next) => {
  console.log(`Richiesta ricevuta: ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware per servire i file statici (immagini caricate)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint (pubblico, per Render e monitoraggio)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 📧 Health-check SMTP: verifica che l'invio email sia configurato correttamente.
// Utile per debug post-deploy: se questo endpoint risponde 200, le email partono.
app.get('/health/email', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.verify();
    return res.status(200).json({
      status: 'ok',
      smtpHost: process.env.SMTP_HOST || null,
      smtpUser: process.env.SMTP_USER ? '***@' + (process.env.SMTP_USER.split('@')[1] || '') : null,
      hasFrom: !!process.env.EMAIL_FROM,
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err && err.message ? err.message : String(err),
      smtpHost: process.env.SMTP_HOST || null,
      missingEnv: {
        SMTP_HOST: !process.env.SMTP_HOST,
        SMTP_PORT: !process.env.SMTP_PORT,
        SMTP_USER: !process.env.SMTP_USER,
        SMTP_PASS: !process.env.SMTP_PASS,
        EMAIL_FROM: !process.env.EMAIL_FROM,
      },
    });
  }
});

// Rotte API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/meals', require('./routes/meal'));
app.use('/api/chats', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/join-requests', require('./routes/joinRequests'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/video', require('./routes/videoCall'));
app.use('/api/geolocation', require('./routes/geolocation'));
app.use('/api/notification-preferences', require('./routes/notificationPreferences'));
app.use('/api/interactive-notifications', require('./routes/interactiveNotifications'));
// app.use('/api/summary-emails', require('./routes/summaryEmails'));

// Aggiungi questo per debug:
app.use((req, res, next) => {
  console.log(`📡 [Server] ${req.method} ${req.path}`);
  next();
});

// Lista tutte le routes registrate:
console.log('📋 [Server] Registered routes:');
app._router.stack.forEach(middleware => {
  if (middleware.route) {
    console.log(`  ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach(handler => {
      if (handler.route) {
        console.log(`  ${Object.keys(handler.route.methods)} ${handler.route.path}`);
      }
    });
  }
});

// --- CRON JOB CON LE TUE REGOLE SEMPLICI ---
cron.schedule('* * * * *', async () => {
  const now = new Date();
  console.log(`[Cron Job] Esecuzione alle: ${now.toISOString()}`);
  try {
    // Regola 1: Attiva videochiamate 10 minuti prima dell'evento
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    
        // Trova i pasti che devono essere attivati
        const mealsToActivate = await Meal.find({
          date: { $lte: tenMinutesFromNow },
          status: 'upcoming',
          videoCallStatus: 'pending'
        }).populate('participants', 'fcmTokens');

        if (mealsToActivate.length > 0) {
          console.log(`[Cron Job] Attivazione di ${mealsToActivate.length} videochiamate.`);
          
          for (const meal of mealsToActivate) {
            meal.videoCallStatus = 'active';
            await meal.save();
    
            // Invia notifica a tutti i partecipanti
        const allParticipantTokens = meal.participants
        .flatMap(p => p.fcmTokens)
        .filter(token => token);
    
        const uniqueTokens = [...new Set(allParticipantTokens)];

            if (uniqueTokens.length > 0) {
              console.log(`[Cron Job] Invio notifiche a ${uniqueTokens.length} token per il pasto "${meal.title}"`);


          pushNotificationService.sendPushNotification(
            uniqueTokens,
            'La videochiamata sta per iniziare!',
            `Unisciti ora al pasto "${meal.title}".`,
            { mealId: meal._id.toString() } 
              );
            }
          }
        }

    // Regola 2: Concludi pasti "vuoti" dopo 4 ore dall'inizio
    const fourHoursAgoHourAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    await Meal.updateMany(
      { date: { $lt: fourHoursAgoHourAgo }, status: 'upcoming', participantsCount: { $lte: 1 } },
      { $set: { status: 'completed' } } // Imposta a 'completed'
    );

  } catch (error) {
    console.error('[Cron Job] ❌ Errore:', error);
  }
});

// Gestore errori (deve essere l'ultimo middleware)
app.use(errorHandler);

startMealStatusUpdater();

// 🕐 INIZIALIZZAZIONE SERVIZIO STATUS PASTI
mealStatusService.initializeStatusService()
  .then(result => {
    if (result.success) {
      console.log('✅ [SERVER] Servizio status pasti inizializzato:', result.message);
    } else {
      console.log('⚠️ [SERVER] Servizio status pasti inizializzato con errori:', result.error);
    }
  })
  .catch(error => {
    console.error('❌ [SERVER] Errore inizializzazione servizio status pasti:', error);
  });

// 📧 INIZIALIZZAZIONE JOB RIEPILOGO GIORNALIERO SEGNALAZIONI
dailyReportSummaryJob.start();
console.log('✅ [SERVER] Job riepilogo giornaliero segnalazioni avviato');

// 📍 INIZIALIZZAZIONE JOB NOTIFICHE GEOLOCALIZZATE
// geolocationNotificationJob.start();
console.log('✅ [SERVER] Job notifiche geolocalizzate avviato');

// 🧹 INIZIALIZZAZIONE JOB PULIZIA TOKEN VERIFICA EMAIL
// emailVerificationCleanupJob.start();
console.log('✅ [SERVER] Job pulizia token verifica email avviato');

// 📧 INIZIALIZZAZIONE JOB EMAIL DI RIEPILOGO
const summaryEmailJobs = require('./jobs/summaryEmailJobs');
summaryEmailJobs.start();
console.log('✅ [SERVER] Job email di riepilogo avviati');

// Avvio del server
const PORT = process.env.PORT || 5001;
const HOST = '0.0.0.0'; // Ascolta su tutte le interfacce per la compatibilità mobile

// Inizializza Socket.IO e il notificationService
const { initializeSocket, connectedUsers } = require('./socket');
initializeSocket(server);

// Inizializza il notificationService dopo che il server è stato creato
notificationService.initialize(connectedUsers);

// Avvia i Cron Jobs per le email automatiche
startCronJobs();

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 Server TableTalk in esecuzione su http://localhost:${PORT}`);
  console.log(`🌍 [SERVER] HOST: ${HOST}`);
  console.log(`🔌 [SERVER] PORT: ${PORT}`);
  console.log(`🛡️ [SERVER] CORS configurato per:`, allowedOrigins);
  console.log(`📡 [SERVER] Server pronto per ricevere richieste!`);
  
});