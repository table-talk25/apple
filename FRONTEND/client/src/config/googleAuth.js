// Configurazione Google Auth per TableTalk
export const GOOGLE_AUTH_CONFIG = {
  // Web Client ID (usato per l'app web e mobile)
  webClientId: '534454809499-4vsllugc4jbuft2n20p5sakupvvdcjrb.apps.googleusercontent.com',
  
  // Android Client ID
  androidClientId: '534454809499-cc8nullh817gf2qqdff570rta5i1hmv7.apps.googleusercontent.com',
  
  // iOS Client ID
  iosClientId: '534454809499-1f66hg06varvottb4pgal89ojqip7rg4.apps.googleusercontent.com',
  
  // Scopes richiesti per l'autenticazione
  scopes: [
    'openid',
    'profile',
    'email'
  ],
  
  // URL di reindirizzamento per l'autenticazione web
  redirectUri: process.env.REACT_APP_GOOGLE_REDIRECT_URI || 'https://tabletalk.app/auth/callback'
};

export default GOOGLE_AUTH_CONFIG;
