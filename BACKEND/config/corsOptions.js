const defaultMobileOrigins = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://localhost',
  'http://localhost:3000',
  'http://localhost:3001',
];

function buildCorsOptions() {
  const envAllowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
  const effectiveAllowedOrigins = Array.from(
    new Set([...(envAllowedOrigins || []), ...defaultMobileOrigins])
  );

  const corsOptions = {
    origin: (origin, callback) => {
      console.log('🌐 [CORS] Richiesta ricevuta da origin:', origin);
      console.log('🌐 [CORS] Tipo origin:', typeof origin);
      console.log('🌐 [CORS] Origin è undefined?', origin === undefined);
      console.log('🌐 [CORS] Origin è null?', origin === null);

      if (!origin) {
        console.log('✅ [CORS] Richiesta senza origin permessa');
        return callback(null, true);
      }

      console.log('🔍 [CORS] Controllo origin nella lista...');
      console.log('🔍 [CORS] effectiveAllowedOrigins:', effectiveAllowedOrigins);
      console.log('🔍 [CORS] indexOf result:', effectiveAllowedOrigins.indexOf(origin));

      if (effectiveAllowedOrigins.indexOf(origin) !== -1) {
        console.log(`✅ [CORS] Origin permesso: ${origin}`);
        callback(null, true);
      } else {
        console.error(`❌ [CORS] ERRORE: Origine Rifiutata -> ${origin}`);
        console.error('❌ [CORS] Origini permesse effettive:', effectiveAllowedOrigins);
        console.error('❌ [CORS] Lunghezza effectiveAllowedOrigins:', effectiveAllowedOrigins.length);
        callback(new Error('Origine non permessa dalla policy CORS'));
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  return { corsOptions, effectiveAllowedOrigins, envAllowedOrigins };
}

module.exports = { buildCorsOptions };
