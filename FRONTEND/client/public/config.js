// File: FRONTEND/client/public/config.js

(function() {
  // Funzione per capire su quale piattaforma stiamo girando
  function getPlatform() {
    // La presenza di 'Android' nell'user agent è un forte indicatore dell'emulatore Android
    if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
      return 'android';
    }
    // Per il simulatore iOS e il browser web, usiamo 'web' (che punterà a localhost)
    return 'web_or_ios';
  }

  const platform = getPlatform();

  // Definiamo gli indirizzi base per le diverse piattaforme
  // ⚠️ IMPORTANTE: Per produzione, usa sempre l'URL Render
  // ⚠️ IMPORTANTE: process.env non è disponibile nel browser, usiamo sempre l'URL di produzione
  const productionUrl = 'https://tabletalk-app-backend.onrender.com';
  const BasiURL = {
      web_or_ios: productionUrl,
      android: productionUrl
  };

  // Scegliamo l'indirizzo base corretto
  const baseURL = BasiURL[platform];

  // Definiamo la configurazione globale
  window.APP_CONFIG = {
    // URL del backend API
    API_URL: `${baseURL}/api`,
    
    // URL per le connessioni Socket.IO
    SOCKET_URL: baseURL,
    
    // URL per le immagini caricate
    UPLOADS_URL: `${baseURL}/uploads`
  };

  console.log(`Piattaforma rilevata: ${platform}. URL API impostato a: ${window.APP_CONFIG.API_URL}`);

})();