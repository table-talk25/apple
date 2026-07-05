const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const errorHandler = require('./middleware/error');
const { buildCorsOptions } = require('./config/corsOptions');
const registerApiRoutes = require('./routes/registerApiRoutes');
const healthRoutes = require('./routes/health');

function logRegisteredRoutes(app) {
  console.log('📋 [Server] Registered routes:');
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(`  ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          console.log(`  ${Object.keys(handler.route.methods)} ${handler.route.path}`);
        }
      });
    }
  });
}

function createApp() {
  const app = express();

  // Dietro reverse proxy (Coolify/Traefik/Render): serve per avere il vero IP client
  // in req.ip — senza questo il rate limiting conta tutti gli utenti come un solo IP.
  app.set('trust proxy', 1);
  const { corsOptions, effectiveAllowedOrigins, envAllowedOrigins } = buildCorsOptions();

  console.log('🔧 [ENV] CORS_ORIGIN:', process.env.CORS_ORIGIN);
  console.log('🔧 [ENV] FRONTEND_URL:', process.env.FRONTEND_URL);
  console.log('🔧 [ENV] NODE_ENV:', process.env.NODE_ENV);
  console.log('🔧 [ENV] PORT:', process.env.PORT);
  console.log('🛡️ [CORS] Origini permesse caricate (ENV):', envAllowedOrigins);
  console.log('🛡️ [CORS] Origini permesse effettive (ENV + default mobile):', effectiveAllowedOrigins);
  console.log('🛡️ [CORS] Numero di origini effettive:', effectiveAllowedOrigins.length);

  console.log('🚀 [SERVER] Applicando middleware CORS...');
  app.use(cors(corsOptions));
  console.log('🚀 [SERVER] Configurando gestione OPTIONS...');
  app.options('*', cors(corsOptions));

  app.use((req, res, next) => {
    console.log(`📥 [REQUEST] ${req.method} ${req.url}`);
    console.log(`📥 [REQUEST] Origin: ${req.get('Origin')}`);
    console.log(`📥 [REQUEST] User-Agent: ${req.get('User-Agent')}`);
    console.log('📥 [REQUEST] Headers:', Object.keys(req.headers));
    next();
  });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  // Sanitizzazione input: rimuove operatori Mongo ($, .) e parametri HTTP duplicati
  app.use(mongoSanitize());
  app.use(hpp());
  app.use(compression());
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  app.use((req, res, next) => {
    console.log(`Richiesta ricevuta: ${req.method} ${req.originalUrl}`);
    next();
  });

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use(healthRoutes);

  registerApiRoutes(app);

  app.use((req, res, next) => {
    console.log(`📡 [Server] ${req.method} ${req.path}`);
    next();
  });

  logRegisteredRoutes(app);

  app.use(errorHandler);

  return {
    app,
    corsMeta: { effectiveAllowedOrigins, envAllowedOrigins },
  };
}

module.exports = { createApp };
