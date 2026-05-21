// File: FRONTEND/client/public/config.js

(function() {
  function getPlatform() {
    if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
      return 'android';
    }
    return 'web_or_ios';
  }

  const platform = getPlatform();

  const productionUrl = 'https://wj50adftm87hqng1q67kk6v4.92.4.222.169.sslip.io';
  const BasiURL = {
    web_or_ios: productionUrl,
    android: productionUrl
  };

  const baseURL = BasiURL[platform];

  window.APP_CONFIG = {
    API_URL: `${baseURL}/api`,
    SOCKET_URL: baseURL,
    UPLOADS_URL: `${baseURL}/uploads`
  };

  console.log(`Piattaforma rilevata: ${platform}. URL API impostato a: ${window.APP_CONFIG.API_URL}`);

})();
