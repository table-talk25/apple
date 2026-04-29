const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

require('./bootstrap/firebaseAdmin');
const { validateEnvironmentVariables } = require('./config/validateEnv');
validateEnvironmentVariables();

const http = require('http');
const connectDB = require('./config/db');
const { createApp } = require('./app');
const notificationService = require('./services/notificationService');
const startMealStatusUpdater = require('./jobs/mealStatusUpdater');
const mealStatusService = require('./services/mealStatusService');
const dailyReportSummaryJob = require('./jobs/dailyReportSummary');
const startCronJobs = require('./utils/cronJobs');
const summaryEmailJobs = require('./jobs/summaryEmailJobs');
const { scheduleMealVideoActivationCron } = require('./jobs/mealVideoActivationCron');

const { app, corsMeta } = createApp();
const server = http.createServer(app);

connectDB();
scheduleMealVideoActivationCron();

startMealStatusUpdater();

mealStatusService
  .initializeStatusService()
  .then((result) => {
    if (result.success) {
      console.log('✅ [SERVER] Servizio status pasti inizializzato:', result.message);
    } else {
      console.log('⚠️ [SERVER] Servizio status pasti inizializzato con errori:', result.error);
    }
  })
  .catch((error) => {
    console.error('❌ [SERVER] Errore inizializzazione servizio status pasti:', error);
  });

dailyReportSummaryJob.start();
console.log('✅ [SERVER] Job riepilogo giornaliero segnalazioni avviato');
console.log('✅ [SERVER] Job notifiche geolocalizzate avviato');
console.log('✅ [SERVER] Job pulizia token verifica email avviato');
summaryEmailJobs.start();
console.log('✅ [SERVER] Job email di riepilogo avviati');

const PORT = process.env.PORT || 5001;
const HOST = '0.0.0.0';

const { initializeSocket, connectedUsers } = require('./socket');

async function start() {
  try {
    await initializeSocket(server);
    notificationService.initialize(connectedUsers);
    startCronJobs();

    server.listen(PORT, HOST, () => {
      console.log(`\n🚀 Server TableTalk in esecuzione su http://localhost:${PORT}`);
      console.log(`🌍 [SERVER] HOST: ${HOST}`);
      console.log(`🔌 [SERVER] PORT: ${PORT}`);
      console.log('🛡️ [SERVER] CORS configurato per:', corsMeta.envAllowedOrigins);
      console.log('📡 [SERVER] Server pronto per ricevere richieste!');
    });
  } catch (err) {
    console.error('❌ [SERVER] Avvio fallito:', err);
    process.exit(1);
  }
}

start();
