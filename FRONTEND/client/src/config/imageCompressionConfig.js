// CONFIGURAZIONE COMPRESSIONE IMMAGINI
// Questo file contiene le impostazioni predefinite per la compressione delle immagini

export const IMAGE_COMPRESSION_CONFIG = {
  // Configurazione generale
  DEFAULT: {
    enableCompression: true,
    compressionQuality: 0.8,
    maxWidthCompression: 1280,
    maxHeightCompression: 1280,
    useWebWorker: true
  },

  // Configurazione per foto di profilo (avatar)
  PROFILE_PICTURE: {
    enableCompression: true,
    compressionQuality: 0.8,
    maxWidthCompression: 400,
    maxHeightCompression: 400,
    useWebWorker: true,
    maxSizeMB: 1
  },

  // Configurazione per immagini di copertina dei pasti
  MEAL_COVER: {
    enableCompression: true,
    compressionQuality: 0.8,
    maxWidthCompression: 1280,
    maxHeightCompression: 720,
    useWebWorker: true,
    maxSizeMB: 3
  },

  // Configurazione per gallerie di immagini
  GALLERY: {
    enableCompression: true,
    compressionQuality: 0.7,
    maxWidthCompression: 800,
    maxHeightCompression: 600,
    useWebWorker: true,
    maxSizeMB: 2
  },

  // Configurazione per immagini ad alta qualità
  HIGH_QUALITY: {
    enableCompression: true,
    compressionQuality: 0.9,
    maxWidthCompression: 1920,
    maxHeightCompression: 1080,
    useWebWorker: true,
    maxSizeMB: 5
  },

  // Configurazione per social media
  SOCIAL_MEDIA: {
    enableCompression: true,
    compressionQuality: 0.7,
    maxWidthCompression: 1080,
    maxHeightCompression: 1080,
    useWebWorker: true,
    maxSizeMB: 2
  },

  // Configurazione per dispositivi mobili (connessioni lente)
  MOBILE_OPTIMIZED: {
    enableCompression: true,
    compressionQuality: 0.6,
    maxWidthCompression: 800,
    maxHeightCompression: 600,
    useWebWorker: true,
    maxSizeMB: 1
  },

  // Configurazione per dispositivi desktop (connessioni veloci)
  DESKTOP_OPTIMIZED: {
    enableCompression: true,
    compressionQuality: 0.85,
    maxWidthCompression: 1600,
    maxHeightCompression: 1200,
    useWebWorker: true,
    maxSizeMB: 5
  }
};

// Funzione helper per ottenere la configurazione in base al tipo
export const getCompressionConfig = (type = 'DEFAULT') => {
  return IMAGE_COMPRESSION_CONFIG[type] || IMAGE_COMPRESSION_CONFIG.DEFAULT;
};

// Funzione helper per ottenere la configurazione ottimale in base al dispositivo
export const getOptimalCompressionConfig = () => {
  // Rileva se è un dispositivo mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Rileva la velocità di connessione (se disponibile)
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
  
  if (isMobile || isSlowConnection) {
    return IMAGE_COMPRESSION_CONFIG.MOBILE_OPTIMIZED;
  }
  
  return IMAGE_COMPRESSION_CONFIG.DESKTOP_OPTIMIZED;
};

// Funzione helper per ottenere la configurazione in base alle dimensioni del file
export const getCompressionConfigByFileSize = (fileSizeMB) => {
  if (fileSizeMB > 5) {
    return IMAGE_COMPRESSION_CONFIG.MOBILE_OPTIMIZED; // Compressione aggressiva per file grandi
  } else if (fileSizeMB > 2) {
    return IMAGE_COMPRESSION_CONFIG.DEFAULT; // Compressione standard per file medi
  } else {
    return IMAGE_COMPRESSION_CONFIG.HIGH_QUALITY; // Compressione leggera per file piccoli
  }
};

// Esporta anche le configurazioni individuali per uso diretto
export const {
  DEFAULT,
  PROFILE_PICTURE,
  MEAL_COVER,
  GALLERY,
  HIGH_QUALITY,
  SOCIAL_MEDIA,
  MOBILE_OPTIMIZED,
  DESKTOP_OPTIMIZED
} = IMAGE_COMPRESSION_CONFIG;
