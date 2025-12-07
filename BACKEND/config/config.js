// Configurazione del backend TableTalk
require('dotenv').config();

const config = {
  // Database
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/tabletalk',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Google OAuth
  googleWebClientId: '534454809499-4vsllugc4jbuft2n20p5sakupvvdcjrb.apps.googleusercontent.com',
  googleAndroidClientId: '534454809499-cc8nullh817gf2qqdff570rta5i1hmv7.apps.googleusercontent.com',
  googleIosClientId: '534454809499-1f66hg06varvottb4pgal89ojqip7rg4.apps.googleusercontent.com',
  
  // Apple Sign-In
  appleClientId: process.env.APPLE_CLIENT_ID || 'com.tabletalk.socialapp',
  appleRedirectURI: process.env.APPLE_REDIRECT_URI || 'https://tabletalk.app/auth/apple/callback',
  
  // Email
  emailFrom: process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || 'noreply@tabletalk.app',
  emailService: process.env.EMAIL_SERVICE || 'gmail',
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
  
  // Firebase
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'tabletalk-social',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // File Upload
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  
  // Rate Limiting
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minuti
  rateLimitMax: 100 // richieste per finestra
};

module.exports = config;
