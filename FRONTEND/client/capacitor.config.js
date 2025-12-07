const config = {

  appId: 'io.tabletalk.app',

  appName: 'TableTalk',

  webDir: 'build',

  bundledWebRuntime: false,

  server: {

    androidScheme: 'https',

    iosScheme: 'ionic', // <--- QUESTO È IL SEGRETO PER IOS

    hostname: 'localhost'

  },

  plugins: {

    SplashScreen: {

      launchShowDuration: 2000,

      launchAutoHide: true,

      backgroundColor: "#ffffff",

      showSpinner: true,

    },

    PushNotifications: {

      presentationOptions: ["badge", "sound", "alert"]

    },

    LocalNotifications: {

      smallIcon: "ic_stat_icon_config_sample",

      iconColor: "#488AFF"

    },

    GoogleAuth: {

      scopes: ['profile', 'email'],

      serverClientId: '534454809499-cc8nullh817gf2qqdff570rta5i1hmv7.apps.googleusercontent.com',

      forceCodeForRefreshToken: true

    },

    SignInWithApple: {

      clientId: 'io.tabletalk.app',

      redirectURI: 'https://tabletalk.app/auth/apple/callback',

      scopes: 'email name'

    }

  },

  ios: {

    contentInset: "automatic",

    scrollEnabled: true,

    webContentsDebuggingEnabled: true // <--- Ti serve per vedere se ci sono errori

  }

};

module.exports = config;
