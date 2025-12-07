import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tabletalk.socialapp',
  appName: 'TableTalk',
  webDir: 'FRONTEND/client/build',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {  // ← AGGIUNGI QUESTA SEZIONE
      scopes: ['profile', 'email'],
      serverClientId: '925236799140-op5ejjto2gitab71egav5voossk36h1b.apps.googleusercontent.com'  // ← Lo configureremo dopo
    },
    // GoogleMaps: {
    //   apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE'
    // },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#667eea",
      showSpinner: true,
      spinnerColor: "#ffffff"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
