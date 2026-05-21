// ====================================================================
// PARTE 1: LOGICA DINAMICA PER LA TUA APP
// ====================================================================

// Legge prima window.APP_CONFIG (config.js runtime), poi REACT_APP_API_URL (build time), poi fallback hardcodato
const runtimeApiUrl = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.API_URL)
  ? window.APP_CONFIG.API_URL
  : null;

const productionApiUrl = 'https://wj50adftm87hqng1q67kk6v4.92.4.222.169.sslip.io/api';
const apiUrl = runtimeApiUrl || process.env.REACT_APP_API_URL || productionApiUrl;

export const API_URL = apiUrl;

export const isNative = false;

const stripApiSuffix = (url) => (url ? url.replace(/\/api\/?$/, '') : url);
export const SERVER_URL = stripApiSuffix(apiUrl);
export const DEV_SERVER_URL = SERVER_URL;

// ====================================================================
// PARTE 2: CONFIGURAZIONE NATIVA PER CAPACITOR
// ====================================================================

const config = {
  appId: 'io.tabletalk.app',
  appName: 'TableTalk - mEat Together',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF"
    }
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true
  }
};

export default config;
