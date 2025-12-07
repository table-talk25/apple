// ====================================================================
// PARTE 1: LOGICA DINAMICA PER LA TUA APP (dal vecchio .js)
// Calcola e esporta l'URL del backend che la tua app deve contattare.
// ====================================================================

// Scegli API_URL: priorità a REACT_APP_API_URL, poi produzione come default
// ⚠️ IMPORTANTE: Per produzione, usa sempre l'URL del backend Render
// ⚠️ IMPORTANTE: localhost è stato rimosso per evitare errori in produzione
// Per sviluppo locale, imposta REACT_APP_API_URL=http://localhost:5001/api
// Esempio produzione: REACT_APP_API_URL=https://tabletalk-app-backend.onrender.com/api
const productionApiUrl = 'https://tabletalk-app-backend.onrender.com/api';
const apiUrl = process.env.REACT_APP_API_URL || productionApiUrl;

/**
 * Esportazioni NOMINALI per essere usate nel resto della tua app (es. nel tuo ApiService).
 * Esempio di utilizzo: import { API_URL } from './capacitor.config';
 */
export const API_URL = apiUrl;

// Per compatibilità con i vecchi file, esportiamo anche isNative
// In build time non possiamo rilevare la piattaforma, quindi usiamo false come default
export const isNative = false;

// Manteniamo anche i vecchi export per compatibilità
const stripApiSuffix = (url) => (url ? url.replace(/\/api\/?$/, '') : url);
export const SERVER_URL = stripApiSuffix(API_URL);
export const DEV_SERVER_URL = SERVER_URL;


// ====================================================================
// PARTE 2: CONFIGURAZIONE NATIVA PER CAPACITOR (dal vecchio .json)
// Configura i plugin nativi e il comportamento dell'app.
// ====================================================================

const config = {
  appId: 'io.tabletalk.app',
  appName: 'TableTalk - mEat Together',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // GoogleMaps: {
    //   apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || '' // Usa la variabile d'ambiente per la chiave
    // },
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false
    },
    // PushNotifications: {
    //   presentationOptions: [
    //     "badge",
    //     "sound",
    //     "alert"
    //   ]
    // },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF"
    }
  },
  android: {
    allowMixedContent: true, // Abilita HTTP in dev/LAN per evitare blocchi su Android
    webContentsDebuggingEnabled: true // Utile per debug su device durante i test
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true
  }
};

/**
 * Esportazione di DEFAULT per essere usata da Capacitor stesso durante la build.
 */
export default config;