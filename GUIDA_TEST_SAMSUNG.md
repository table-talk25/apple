# 📱 Guida: Testare l'App su Samsung Prima della Release

Questa guida ti spiega come installare e testare l'app sul tuo Samsung prima di pubblicarla su Google Play Store.

---

## 🚀 Metodo 1: APK per Test Rapidi (CONSIGLIATO)

### Passo 1: Prepara il Samsung

1. **Abilita "Origini sconosciute"** sul Samsung:
   - Vai su **Impostazioni** → **Sicurezza** (o **Privacy e sicurezza**)
   - Cerca **"Installa app sconosciute"** o **"Origini sconosciute"**
   - Abilita per il browser/app che userai (es. Chrome, File Manager)

2. **Abilita Debug USB** (opzionale, per installazione via USB):
   - Vai su **Impostazioni** → **Informazioni sul telefono**
   - Tocca **"Numero build"** 7 volte (attiva modalità sviluppatore)
   - Torna indietro → **Opzioni sviluppatore**
   - Abilita **"Debug USB"**

### Passo 2: Genera l'APK di Test

Apri il Terminale sul Mac ed esegui:

```bash
cd "/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client"
./build-android-apk-direct.sh
```

Lo script farà automaticamente:
- ✅ Installazione dipendenze
- ✅ Build React
- ✅ Sincronizzazione Capacitor
- ✅ Generazione APK firmato

**Tempo richiesto:** 5-10 minuti

### Passo 3: Installa l'APK sul Samsung

#### Opzione A: Via USB (più veloce)

1. **Connetti il Samsung al Mac via USB**
2. **Verifica connessione:**
   ```bash
   adb devices
   ```
   (Dovresti vedere il tuo dispositivo)

3. **Installa l'APK:**
   ```bash
   cd "/Users/ele/TableTalk mEat Together - Apple/GOOGLE_PLAY_RELEASE"
   adb install -r TableTalk-*-DIRECT-INSTALL-*.apk
   ```

#### Opzione B: Trasferimento Manuale

1. **Trova l'APK generato:**
   - Cartella: `GOOGLE_PLAY_RELEASE/`
   - File: `TableTalk-v*-DIRECT-INSTALL-*.apk`

2. **Trasferisci sul Samsung:**
   - Via email (invia a te stesso)
   - Via Google Drive
   - Via USB (copia nella cartella Download)

3. **Apri il file APK sul Samsung:**
   - Usa il File Manager
   - Tocca l'APK
   - Tocca **"Installa"**
   - Conferma l'installazione

---

## 🔄 Metodo 2: Live Reload per Sviluppo (Vedi Modifiche in Tempo Reale)

Se vuoi vedere le modifiche **in tempo reale** mentre sviluppi:

### Passo 1: Avvia il Server di Sviluppo

```bash
cd "/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client"
npm start
```

Il server si avvierà su `http://localhost:3000`

### Passo 2: Configura Capacitor per Live Reload

Modifica temporaneamente `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.tabletalk.socialapp',
  appName: 'TableTalk',
  webDir: 'FRONTEND/client/build',
  server: {
    url: 'http://TUO_IP_LOCALE:3000', // Sostituisci con il tuo IP
    cleartext: true
  },
  // ... resto della configurazione
};
```

**Trova il tuo IP locale:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
(Cerca un IP tipo `192.168.x.x` o `10.0.x.x`)

### Passo 3: Sincronizza e Installa

```bash
cd "/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client"
npx cap sync android
cd android
./gradlew installDebug
```

### Passo 4: Connetti Samsung e Mac alla Stessa Rete WiFi

1. **Sul Samsung:** Connetti alla stessa rete WiFi del Mac
2. **Apri l'app** sul Samsung
3. **Le modifiche si aggiorneranno automaticamente** quando salvi i file!

**⚠️ IMPORTANTE:** Ricorda di rimuovere la configurazione `server` prima di generare l'APK per la release!

---

## 🧪 Metodo 3: Google Play Internal Testing (per Test con Altri)

Se vuoi testare con più persone senza pubblicare:

1. **Genera l'AAB** (non APK):
   ```bash
   cd "/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client"
   ./build-android-release-RENDER.sh
   ```

2. **Vai su Google Play Console** → **Test** → **Test interni**

3. **Carica l'AAB** nel track interno

4. **Aggiungi tester** (email Google)

5. **I tester ricevono l'aggiornamento in 1-2 ore** (non giorni!)

---

## 📋 Checklist Test su Samsung

Prima di pubblicare, verifica:

- [ ] ✅ App si apre senza crash
- [ ] ✅ Login/Registrazione funziona
- [ ] ✅ Navigazione tra pagine
- [ ] ✅ Caricamento immagini profilo
- [ ] ✅ Creazione e visualizzazione pasti
- [ ] ✅ Chat funziona
- [ ] ✅ Notifiche push (se configurate)
- [ ] ✅ Videochiamate (se implementate)
- [ ] ✅ Pulsante indietro funziona
- [ ] ✅ Rotazione schermo (se supportata)

---

## 🆘 Risoluzione Problemi

### "App non installata"
- ✅ Verifica che "Origini sconosciute" sia abilitato
- ✅ Disinstalla la versione precedente prima
- ✅ Verifica che l'APK sia firmato (lo script lo fa automaticamente)

### "ADB non trovato"
- ✅ Installa Android SDK Platform Tools
- ✅ Aggiungi `adb` al PATH:
  ```bash
  export PATH=$PATH:$HOME/Library/Android/sdk/platform-tools
  ```

### "Connessione USB non funziona"
- ✅ Usa il trasferimento manuale (email/Drive)
- ✅ Verifica che il cavo USB supporti trasferimento dati
- ✅ Prova un'altra porta USB

### "Live Reload non funziona"
- ✅ Verifica che Samsung e Mac siano sulla stessa WiFi
- ✅ Controlla firewall del Mac (deve permettere connessioni sulla porta 3000)
- ✅ Verifica che l'IP nel `capacitor.config.ts` sia corretto

---

## 💡 Suggerimenti

1. **Per test rapidi:** Usa sempre l'APK diretto (Metodo 1)
2. **Per sviluppo attivo:** Usa Live Reload (Metodo 2)
3. **Per test con altri:** Usa Google Play Internal Testing (Metodo 3)
4. **Per release ufficiale:** Usa sempre Google Play Production

---

## 📝 Note Importanti

⚠️ **L'APK diretto è solo per test!**
- Non riceve aggiornamenti automatici
- Alcune funzionalità potrebbero richiedere Google Play Services
- Per distribuzione ufficiale, usa sempre Google Play Store

✅ **Vantaggi APK diretto:**
- Test immediati (2-5 minuti)
- Nessuna attesa per approvazione
- Perfetto per sviluppo e debug

