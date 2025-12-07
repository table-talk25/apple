// File: src/index.js (Versione Finale e Pulita con Sentry)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MealsProvider } from './contexts/MealsContext';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { initializeDebugSystem, safeLog } from './utils/debugHelper';
import { initializeSentry } from './config/sentry';
import './i18n';

// Ora importiamo solo il nostro file CSS principale e quello della libreria di notifiche
import './styles/common/index.css'; 
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet/dist/leaflet.css';

import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';

// --- INIZIO BLOCCO DEBUG DI EMERGENZA ---
console.log("🚀 [DEBUG] Script index.js caricato");

window.onerror = function(msg, url, line, col, error) {
   var extra = !col ? '' : '\ncolumn: ' + col;
   extra += !error ? '' : '\nerror: ' + error;
   console.error("❌ [DEBUG] ERRORE CRITICO JS:", msg, url, line);
   return false;
};

window.addEventListener('unhandledrejection', function (event) {
  console.error("❌ [DEBUG] PROMISE REJECTION:", event.reason);
});

// Debug: verifica che il root esista
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("❌ Elemento #root non trovato nel DOM");
} else {
  console.log("✅ Elemento #root trovato:", rootElement);
}
// --- FINE BLOCCO DEBUG DI EMERGENZA ---

// Inizializza il sistema di debug PRIMA di tutto
try {
  initializeDebugSystem();
} catch (error) {
  console.error('Errore nell\'inizializzazione del sistema di debug:', error);
}

// Inizializza Sentry per il monitoraggio degli errori
try {
  const sentryInitialized = initializeSentry();
  if (sentryInitialized) {
    safeLog('info', 'Sentry inizializzato correttamente per il monitoraggio errori');
  } else {
    safeLog('warn', 'Sentry non inizializzato - monitoraggio errori disabilitato');
  }
} catch (error) {
  safeLog('error', 'Errore nell\'inizializzazione di Sentry:', error);
}

const root = ReactDOM.createRoot(document.getElementById('root'));

// Configurazione semplificata per evitare crash
const onReady = async () => {
  // Aspetta un momento per assicurarsi che tutto sia caricato
  setTimeout(async () => {
    try { 
      await StatusBar.setStyle({ style: StatusBarStyle.Light }); 
      safeLog('info', 'Status bar configurata con successo');
    } catch(error) { 
      safeLog('warn', 'Impossibile configurare status bar:', error);
    }
  }, 500);
};

// Funzione helper per rimuovere il loader in modo sicuro
function removeLoader() {
  try {
    const loader = document.getElementById('app-loader');
    if (loader && loader.parentNode) {
      console.log("🔴 [DEBUG] Rimuovo loader HTML");
      alert("🔴 [DEBUG] Rimuovo loader HTML - React dovrebbe essere montato");
      // NON rimuovere fisicamente, solo nascondi per debug
      loader.style.display = 'none';
      safeLog('info', 'Loader HTML nascosto');
    } else {
      console.warn("⚠️ [DEBUG] Loader non trovato o già rimosso");
    }
  } catch (error) {
    safeLog('warn', 'Impossibile rimuovere loader HTML:', error);
    alert("⚠️ [DEBUG] Errore rimozione loader: " + error.message);
  }
}

// Funzione per mostrare il loader se React non si monta
function showLoader() {
  try {
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.style.display = 'flex';
      console.log("🔴 [DEBUG] Loader mostrato di nuovo");
    }
  } catch (error) {
    console.error("❌ [DEBUG] Errore mostrando loader:", error);
  }
}

// Renderizza l'app con gestione degli errori robusta
console.log("🔴 [DEBUG] Inizio render React...");
alert("🔴 [DEBUG] Inizio render React - Se vedi questo, React sta per montarsi");

// Wrapper per catturare errori durante il rendering
const AppWrapper = () => {
  console.log("🔴 [DEBUG] AppWrapper renderizzato");
  alert("🔴 [DEBUG] AppWrapper renderizzato - React sta funzionando!");
  
  // Verifica che il DOM sia pronto
  setTimeout(() => {
    const root = document.getElementById('root');
    console.log("🔴 [DEBUG] AppWrapper - Root dopo render:", root);
    console.log("🔴 [DEBUG] AppWrapper - Root children:", root ? root.children.length : 0);
    if (root && root.children.length === 0) {
      console.error("❌ [DEBUG] AppWrapper - Root è vuoto dopo render!");
      alert("❌ [DEBUG] Root è vuoto - React non sta renderizzando!");
    }
  }, 500);
  
  return (
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <MealsProvider>
            <div style={{ minHeight: '100vh', background: '#fff', padding: '20px' }}>
              <h1 style={{ color: '#000' }}>TEST: Se vedi questo, React funziona!</h1>
              <App />
            </div>
          </MealsProvider>
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  );
};

try {
  console.log("🔴 [DEBUG] Chiamata root.render()...");
  root.render(<AppWrapper />);
  console.log("✅ [DEBUG] root.render() completato");
  safeLog('info', 'App renderizzata con successo');
  
  // React normalmente si monta in < 100ms, ma verifichiamo più volte per sicurezza
  let reactMounted = false;
  
  // Verifica immediata (React dovrebbe essere già montato)
  setTimeout(() => {
    if (!reactMounted) reactMounted = checkReactMount(100);
  }, 100);
  
  // Verifica dopo 500ms (per componenti lazy che potrebbero impiegare più tempo)
  setTimeout(() => {
    if (!reactMounted) reactMounted = checkReactMount(500);
  }, 500);
  
  // Verifica dopo 1 secondo
  setTimeout(() => {
    if (!reactMounted) reactMounted = checkReactMount(1000);
  }, 1000);
  
  // Verifica finale dopo 1.5 secondi (timeout di sicurezza)
  setTimeout(() => {
    if (!reactMounted) {
      reactMounted = checkReactMount(1500);
      if (!reactMounted) {
        // Se React non si è montato, mostra un fallback visibile
        showFallbackUI();
      }
    }
  }, 1500);
  
  // Funzione per verificare se React si è montato
  function checkReactMount(delay) {
    const rootContent = document.getElementById('root');
    const hasContent = rootContent && (
      rootContent.children.length > 0 || 
      rootContent.innerHTML.trim() !== ''
    );
    
    console.log(`🔴 [DEBUG] Verifica montaggio React dopo ${delay}ms...`);
    console.log("🔴 [DEBUG] Root element:", rootContent);
    console.log("🔴 [DEBUG] Root children:", rootContent ? rootContent.children.length : 0);
    console.log("🔴 [DEBUG] Root innerHTML length:", rootContent ? rootContent.innerHTML.length : 0);
    
    if (hasContent) {
      console.log(`✅ [DEBUG] React montato dopo ${delay}ms - rimuovo loader`);
      console.log("✅ [DEBUG] Contenuto root:", rootContent.innerHTML.substring(0, 200));
      removeLoader();
      return true; // React montato, non serve continuare
    } else {
      console.warn(`⚠️ [DEBUG] React non montato dopo ${delay}ms`);
    }
    return false;
  }
  
  // Funzione per mostrare un UI di fallback se React non si monta
  function showFallbackUI() {
    console.error("❌ [DEBUG] React non si è montato - mostro fallback UI");
    
    // Assicurati che il loader sia visibile
    showLoader();
    
    // Rimuovi eventuali messaggi di errore precedenti
    const existingError = document.getElementById('react-error-msg');
    if (existingError) existingError.remove();
    
    // Crea un messaggio di errore più visibile
    const errorMsg = document.createElement('div');
    errorMsg.id = 'react-error-msg';
    errorMsg.style.cssText = `
      position: fixed; 
      top: 0; 
      left: 0; 
      right: 0; 
      bottom: 0; 
      background: rgba(0, 0, 0, 0.8); 
      z-index: 100002; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      font-family: Arial, sans-serif;
    `;
    errorMsg.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        <h2 style="color: #ff4444; margin: 0 0 15px 0;">⚠️ Errore di Caricamento</h2>
        <p style="color: #666; margin: 0 0 20px 0;">React non si è montato correttamente.</p>
        <p style="color: #999; font-size: 12px; margin: 0 0 20px 0;">Controlla la console di Xcode per dettagli.</p>
        <button onclick="window.location.reload()" style="padding: 12px 24px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
          Riavvia App
        </button>
      </div>
    `;
    document.body.appendChild(errorMsg);
  }
} catch (error) {
  safeLog('error', 'Errore critico durante il rendering dell\'app:', error);
  
  // RIMUOVI IL LOADER ANCHE IN CASO DI ERRORE
  removeLoader();
  
  // Fallback: mostra un messaggio di errore
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: white; z-index: 99999; display: flex; align-items: center; justify-content: center;';
  errorDiv.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif; max-width: 400px;">
      <h2>😔 Errore di caricamento</h2>
      <p style="color: #666; margin: 10px 0;">L'app non è riuscita a caricarsi.</p>
      <p style="color: #999; font-size: 12px; margin: 10px 0;">${error.message || 'Errore sconosciuto'}</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">
        Riavvia App
      </button>
    </div>
  `;
  document.body.appendChild(errorDiv);
  
  // Mostra anche alert per debug
  if (typeof alert !== 'undefined') {
    alert('ERRORE RENDERING:\n' + (error.message || error) + '\n\nControlla la console per dettagli.');
  }
}

// Nascondi anche lo splash nativo (se ancora visibile)
try { 
  onReady && onReady(); 
  safeLog('info', 'Inizializzazione app completata');
} catch(error) { 
  safeLog('error', 'Errore durante l\'inizializzazione finale:', error);
}