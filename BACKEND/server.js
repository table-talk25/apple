const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: false });

const startBackend = require('./bootstrap/startBackend');
const connectDB = require('./config/db');
const { validateEnvironmentVariables } = require('./config/validateEnv');

async function start() {
  let server;
  let corsMeta;
  const PORT = process.env.PORT || 5001;
  const HOST = '0.0.0.0';

  try {
    validateEnvironmentVariables();

    await startBackend({
      connectDatabase: connectDB,
      initializeServices: async () => {
        // Load service modules only after MongoDB is connected: some imports schedule jobs.
        require('./bootstrap/firebaseAdmin');
        const http = require('http');
        const { createApp } = require('./app');
        const notificationService = require('./services/notificationService');
        const mealStatusService = require('./services/mealStatusService');
        const { initializeSocket, connectedUsers } = require('./socket');

        const created = createApp();
        corsMeta = created.corsMeta;
        server = http.createServer(created.app);

        const result = await mealStatusService.initializeStatusService();
        if (!result || !result.success || !result.initialSync || !result.initialSync.success) {
          throw new Error('Initial meal status synchronization failed');
        }

        await initializeSocket(server);
        notificationService.initialize(connectedUsers);

        const startMealStatusUpdater = require('./jobs/mealStatusUpdater');
        const dailyReportSummaryJob = require('./jobs/dailyReportSummary');
        const summaryEmailJobs = require('./jobs/summaryEmailJobs');
        const startCronJobs = require('./utils/cronJobs');
        const { scheduleMealVideoActivationCron } = require('./jobs/mealVideoActivationCron');

        startMealStatusUpdater();
        dailyReportSummaryJob.start();
        summaryEmailJobs.start();
        startCronJobs();
        scheduleMealVideoActivationCron();
      },
      listen: () => new Promise((resolve, reject) => {
        const onError = (error) => {
          server.removeListener('listening', onListening);
          reject(error);
        };
        const onListening = () => {
          server.removeListener('error', onError);
          resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(PORT, HOST);
      }),
    });

    console.log(`Server TableTalk pronto su ${HOST}:${PORT}`);
    console.log('CORS configurato per:', corsMeta.envAllowedOrigins);
    return server;
  } catch (error) {
    // Driver errors can contain connection details; do not print raw credentials.
    console.error('Avvio backend fallito. Verificare configurazione, MongoDB e servizi richiesti.');
    if (error && ['EADDRINUSE', 'EACCES'].includes(error.code)) {
      console.error('Errore apertura porta:', error.code);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { start };
