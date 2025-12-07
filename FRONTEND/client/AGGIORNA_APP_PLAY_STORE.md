# 📱 Guida: Aggiornare l'App del Play Store con il Nuovo Backend

Questa guida ti spiega come aggiornare l'app pubblicata su Google Play per farla funzionare con il nuovo backend deployato su Render.

## ⚠️ IMPORTANTE

L'app attualmente scaricabile dal Play Store è stata compilata con un URL backend specifico. **Devi ricompilare e pubblicare una nuova versione** per far funzionare l'app con il nuovo backend su Render.

## 📋 Prerequisiti

1. ✅ Backend deployato e funzionante su Render
2. ✅ URL del backend Render (es. `https://tabletalk-backend-xxxx.onrender.com`)
3. ✅ Accesso al progetto Android per ricompilare

## 🚀 Passo 1: Ottieni l'URL del Backend Render

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Seleziona il tuo servizio backend
3. Copia l'URL del servizio (es. `https://tabletalk-backend-xxxx.onrender.com`)

## 🔧 Passo 2: Configura l'URL di Produzione

### Opzione A: Usa variabile d'ambiente (CONSIGLIATO)

1. Crea un file `.env.production` nella cartella `FRONTEND/client/`:
   ```bash
   REACT_APP_API_URL=https://TUO-URL-RENDER.onrender.com/api
   REACT_APP_ANDROID_API_URL=https://TUO-URL-RENDER.onrender.com
   ```
   
   **Sostituisci `TUO-URL-RENDER` con l'URL reale del tuo backend Render**

2. Il file `.env.production` verrà usato automaticamente durante `npm run build` per produzione

### Opzione B: Modifica direttamente i file di configurazione

Se preferisci, puoi modificare direttamente:
- `FRONTEND/client/src/config/capacitorConfig.js` (riga 8)
- `FRONTEND/client/public/config.js` (riga 19)

**⚠️ NON committare mai file `.env.production` con URL reali nel repository Git!**

## 📦 Passo 3: Ricompila l'App Android

1. Vai nella cartella del frontend:
   ```bash
   cd FRONTEND/client
   ```

2. Installa le dipendenze (se necessario):
   ```bash
   npm install
   ```

3. Builda l'app per produzione:
   ```bash
   npm run build
   ```

4. Sincronizza con Capacitor:
   ```bash
   npx cap sync android
   ```

5. Genera l'APK/AAB firmato:
   ```bash
   cd android
   ./gradlew assembleRelease  # Per APK
   # Oppure
   ./gradlew bundleRelease    # Per AAB (consigliato per Play Store)
   ```

   Il file sarà in: `android/app/build/outputs/bundle/release/app-release.aab`

## 📤 Passo 4: Pubblica la Nuova Versione sul Play Store

1. Vai su [Google Play Console](https://play.google.com/console)
2. Seleziona la tua app
3. Vai su **"Produzione"** → **"Crea nuova versione"**
4. Carica il nuovo file `.aab` generato
5. Aumenta il **version code** e **version name** (es. da 1.1.9 a 1.2.0)
6. Compila le note di rilascio
7. Pubblica la nuova versione

## ✅ Passo 5: Verifica

Dopo che la nuova versione è disponibile sul Play Store:

1. Aggiorna l'app sul tuo telefono
2. Verifica che:
   - ✅ Le notifiche si caricano correttamente
   - ✅ Le foto profilo si vedono
   - ✅ Puoi creare TableTalk senza errori
   - ✅ Le notifiche push funzionano (se Firebase è configurato)

## 🔍 Troubleshooting

### L'app non si connette al backend
- **Causa**: URL backend errato o non raggiungibile
- **Soluzione**: 
  - Verifica che l'URL Render sia corretto
  - Controlla che il backend sia online su Render Dashboard
  - Verifica che CORS_ORIGIN su Render includa `capacitor://localhost`

### Le notifiche non funzionano
- **Causa**: Firebase non configurato correttamente
- **Soluzione**: 
  - Verifica che `FIREBASE_SERVICE_ACCOUNT_JSON` sia impostato su Render
  - Controlla che `google-services.json` nell'app Android sia aggiornato
  - Verifica i log su Render per errori Firebase

### Le immagini non si caricano
- **Causa**: URL backend errato o CORS
- **Soluzione**: 
  - Verifica che l'URL Render sia corretto
  - Controlla che CORS_ORIGIN su Render includa `capacitor://localhost`

## 📝 Note Importanti

- ⚠️ **Version Code**: Deve essere sempre maggiore della versione precedente
- 🔄 **Rollout graduale**: Puoi pubblicare la nuova versione con un rollout graduale (es. 20% degli utenti)
- 🧪 **Test interno**: Prima di pubblicare, testa l'app con un APK di test interno
- 📱 **Aggiornamento utenti**: Gli utenti dovranno aggiornare l'app dal Play Store per ottenere la nuova versione

---

**Una volta pubblicata la nuova versione, l'app del Play Store funzionerà con il nuovo backend su Render! 🎉**

