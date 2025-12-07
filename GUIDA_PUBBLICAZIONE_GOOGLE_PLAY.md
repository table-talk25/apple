# 📱 Guida Semplice: Pubblicare Nuova Versione su Google Play

Questa guida ti spiega passo-passo come ricompilare l'app e pubblicarla su Google Play Store con il nuovo backend Render.

## 🎯 Cosa Significa "Ricompilare l'App"?

**Ricompilare** significa creare un nuovo file `.aab` (Android App Bundle) che contiene:
- ✅ Il codice aggiornato con il nuovo URL del backend Render
- ✅ Una nuova versione (1.2.1) che Google Play riconosce come aggiornamento
- ✅ Tutte le correzioni per far funzionare notifiche, foto profilo, ecc.

## 📋 Prerequisiti

1. ✅ Backend configurato e funzionante su Render
2. ✅ Variabili d'ambiente configurate su Render (MONGO_URI, JWT_SECRET, CORS_ORIGIN, FIREBASE_SERVICE_ACCOUNT_JSON)
3. ✅ Mac con Android Studio installato (o accesso a un Mac/PC con Android SDK)

---

## 🚀 PASSO 1: Ricompilare l'App

### Opzione A: Usa lo Script Automatico (CONSIGLIATO)

1. **Apri il Terminale** sul tuo Mac

2. **Vai nella cartella del progetto**:
   ```bash
   cd "/Users/ele/TableTalk mEat Together/FRONTEND/client"
   ```

3. **Esegui lo script di build**:
   ```bash
   ./build-android-release-RENDER.sh
   ```

4. **Aspetta che finisca** (può richiedere 5-10 minuti)
   - Lo script farà tutto automaticamente:
     - Installerà le dipendenze
     - Compilerà l'app React
     - Genererà il file `.aab` per Google Play

5. **Alla fine vedrai**:
   ```
   ✅ BUILD COMPLETATO CON SUCCESSO!
   📁 File AAB generato: android/app/build/outputs/bundle/release/app-release.aab
   📁 Copia con nome descrittivo: GOOGLE_PLAY_RELEASE/TableTalk-v24-1.2.1-RENDER-BACKEND-XXXXXX.aab
   ```

### Opzione B: Comandi Manuali

Se preferisci fare tutto manualmente:

```bash
# 1. Vai nella cartella del client
cd "/Users/ele/TableTalk mEat Together/FRONTEND/client"

# 2. Installa dipendenze
npm install

# 3. Compila l'app React
npm run build

# 4. Sincronizza Capacitor
npx cap sync android

# 5. Genera il file AAB
cd android
./gradlew bundleRelease
cd ..
```

Il file sarà in: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 📤 PASSO 2: Pubblicare su Google Play Console

### 1. Accedi a Google Play Console

- Vai su: https://play.google.com/console
- Accedi con il tuo account Google
- Seleziona la tua app **TableTalk**

### 2. Crea una Nuova Versione

1. Nel menu laterale, clicca su **"Produzione"** (o **"Release"** → **"Produzione"**)
2. Clicca sul pulsante **"Crea nuova versione"** (o **"Create new release"**)

### 3. Carica il File AAB

1. Nella sezione **"App bundles e APK"**, clicca su **"Carica"** (o **"Upload"**)
2. Seleziona il file `.aab` che hai generato:
   - **File principale**: `GOOGLE_PLAY_RELEASE/TableTalk-v24-1.2.1-RENDER-BACKEND-XXXXXX.aab`
   - Oppure: `FRONTEND/client/android/app/build/outputs/bundle/release/app-release.aab`

3. **Aspetta** che Google Play verifichi il file (1-2 minuti)

### 4. Compila le Informazioni della Versione

1. **Version code**: `24` (deve essere maggiore della versione precedente)
2. **Version name**: `1.2.1` (nome visibile agli utenti)

3. **Note di rilascio** (cosa scrivere):
   ```
   🚀 Aggiornamento Backend e Correzioni
   
   ✨ Novità:
   - Backend migrato su Render per maggiore stabilità
   - Notifiche push completamente funzionanti
   - Miglioramenti alle performance
   
   🐛 Correzioni:
   - Risolto problema caricamento notifiche
   - Risolto problema foto profilo non visibili
   - Risolto errore nella creazione TableTalk
   - Migliorata stabilità generale dell'app
   
   📱 Compatibilità:
   - Android 5.1+ (API 22+)
   ```

### 5. Revisiona e Pubblica

1. **Scorri in basso** e clicca su **"Salva"** (o **"Save"**)
2. **Controlla** che tutto sia corretto:
   - ✅ File AAB caricato
   - ✅ Version code: 24
   - ✅ Version name: 1.2.1
   - ✅ Note di rilascio compilate

3. **Clicca su "Invia per revisione"** (o **"Send for review"**)

### 6. Attendi l'Approvazione

- Google Play controllerà l'app (di solito 1-3 giorni)
- Riceverai un'email quando sarà approvata
- L'app sarà disponibile per il download automaticamente

---

## ✅ PASSO 3: Verifica che Funzioni

Dopo che la nuova versione è disponibile sul Play Store:

1. **Aggiorna l'app** sul tuo telefono Android:
   - Apri Google Play Store
   - Cerca "TableTalk"
   - Clicca su "Aggiorna"

2. **Testa le funzionalità**:
   - ✅ Apri l'app e verifica che si connetta al backend
   - ✅ Controlla che le notifiche si carichino
   - ✅ Verifica che la foto profilo si veda
   - ✅ Prova a creare un TableTalk
   - ✅ Verifica che le notifiche push funzionino (se configurate)

---

## 🔍 Troubleshooting

### Errore durante il build

**Problema**: Lo script fallisce durante `npm install` o `npm run build`
- **Soluzione**: Assicurati di avere Node.js installato (versione 16+)
  ```bash
  node --version
  ```

**Problema**: Errore durante `./gradlew bundleRelease`
- **Soluzione**: Assicurati di avere Java JDK 17 installato
  ```bash
  java -version
  ```

### Errore su Google Play Console

**Problema**: "Version code già utilizzato"
- **Soluzione**: Il version code deve essere maggiore. Controlla in `FRONTEND/client/android/app/build.gradle` e aumenta il `versionCode` (es. da 24 a 25)

**Problema**: "File AAB non valido"
- **Soluzione**: Assicurati di aver usato `bundleRelease` e non `assembleRelease`. Il file deve essere `.aab`, non `.apk`

### L'app non si connette al backend

**Problema**: Dopo l'aggiornamento, l'app non si connette
- **Soluzione**: 
  1. Verifica che il backend sia online: https://tabletalk-app-backend.onrender.com/health
  2. Controlla che `CORS_ORIGIN` su Render includa `capacitor://localhost`
  3. Verifica i log su Render Dashboard per errori

---

## 📝 Note Importanti

- ⚠️ **Version Code**: Deve essere SEMPRE maggiore della versione precedente (es. 22 → 23 → 24)
- 🔄 **Rollout graduale**: Puoi pubblicare con un rollout graduale (es. 20% degli utenti) per testare prima
- 🧪 **Test interno**: Prima di pubblicare in produzione, puoi testare con un "Test interno" su Google Play Console
- 📱 **Aggiornamento utenti**: Gli utenti dovranno aggiornare l'app dal Play Store per ottenere la nuova versione
- ⏱️ **Tempi**: Il processo completo (build + pubblicazione + approvazione) può richiedere 1-3 giorni

---

## 🎉 Riepilogo Passi

1. ✅ **Ricompila l'app** con lo script `build-android-release-RENDER.sh`
2. ✅ **Vai su Google Play Console** → Produzione → Crea nuova versione
3. ✅ **Carica il file AAB** generato
4. ✅ **Compila version code (24) e version name (1.2.1)**
5. ✅ **Scrivi le note di rilascio**
6. ✅ **Invia per revisione**
7. ✅ **Attendi approvazione** (1-3 giorni)
8. ✅ **Testa l'app** dopo l'aggiornamento

---

**Una volta pubblicata, l'app funzionerà con il nuovo backend Render! 🚀**

