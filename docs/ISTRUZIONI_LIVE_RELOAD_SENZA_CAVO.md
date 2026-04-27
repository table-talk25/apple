# 🔄 Guida Live Reload SENZA Cavo USB

Questa guida ti permette di installare l'app sul Samsung **senza cavo USB**, usando WiFi e trasferimento manuale.

---

## ✅ PREREQUISITI

1. ✅ Samsung e Mac connessi alla **stessa rete WiFi**
2. ✅ Account Google/Gmail sul Samsung (per trasferire file)
3. ✅ Capacitor già configurato con Live Reload (✅ FATTO!)

---

## 📋 PASSI DA SEGUIRE

### **PASSO 1: Connetti Samsung e Mac alla Stessa WiFi** ✅

1. **Sul Mac:** Verifica che sia connesso al WiFi
2. **Sul Samsung:** Impostazioni → WiFi → Connetti alla stessa rete del Mac

### **PASSO 2: Avvia il Server di Sviluppo**

Apri il **Terminale** sul Mac e esegui:

```bash
cd "/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client"
npm start
```

**Cosa succede:**
- Il server React si avvierà
- Vedrai "Compiled successfully!"
- Il server sarà attivo su `http://localhost:3000`
- **NON chiudere questo terminale!** Lascialo aperto

**Tempo:** 1-2 minuti

### **PASSO 3: Sincronizza Capacitor**

Apri un **NUOVO Terminale** (non chiudere il primo!) ed esegui:

```bash
cd "/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client"
npx cap sync android
```

**Tempo:** 30 secondi

### **PASSO 4: Genera l'APK Debug**

Nello stesso terminale, esegui:

```bash
cd "/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client/android"
./gradlew assembleDebug
```

**Cosa succede:**
- Genera un APK in modalità debug
- L'APK sarà creato in: `android/app/build/outputs/apk/debug/app-debug.apk`
- Questo APK si connetterà automaticamente al server di sviluppo sul Mac

**Tempo:** 2-3 minuti

### **PASSO 5: Trasferisci l'APK sul Samsung**

Hai diverse opzioni:

#### **Opzione A: Via Email (PIÙ SEMPLICE)**

1. **Trova l'APK generato:**
   ```bash
   # Nel terminale, esegui:
   open "/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client/android/app/build/outputs/apk/debug"
   ```
   Questo aprirà la cartella con l'APK

2. **Invia l'APK via email:**
   - Apri Mail sul Mac
   - Crea una nuova email
   - Trascina il file `app-debug.apk` nell'email
   - Invia a te stesso (la tua email Gmail)

3. **Sul Samsung:**
   - Apri Gmail
   - Apri l'email che ti sei inviato
   - Scarica l'APK allegato
   - Apri il file APK scaricato
   - Tocca "Installa"

#### **Opzione B: Via Google Drive**

1. **Carica l'APK su Google Drive:**
   - Vai su drive.google.com sul Mac
   - Trascina il file `app-debug.apk` su Google Drive
   - Condividi il file con te stesso (la tua email)

2. **Sul Samsung:**
   - Apri l'app Google Drive
   - Scarica l'APK
   - Apri il file APK
   - Tocca "Installa"

#### **Opzione C: Via Airdrop (se hai iPhone/iPad)**

1. **Abilita Airdrop sul Mac:**
   - Apri Finder
   - Vai su Airdrop
   - Imposta su "Tutti"

2. **Trasferisci l'APK:**
   - Trascina `app-debug.apk` su Airdrop
   - Seleziona il Samsung (se compatibile)

### **PASSO 6: Abilita "Origini Sconosciute" sul Samsung**

Prima di installare l'APK:

1. **Sul Samsung:**
   - Vai su **Impostazioni** → **Sicurezza** (o **Privacy e sicurezza**)
   - Cerca **"Installa app sconosciute"** o **"Origini sconosciute"**
   - Abilita per:
     - **Gmail** (se usi email)
     - **Google Drive** (se usi Drive)
     - **File Manager** (per aprire APK)

### **PASSO 7: Installa l'APK**

1. **Apri il file APK** sul Samsung (dall'email, Drive, o File Manager)
2. **Tocca "Installa"**
3. **Conferma l'installazione**
4. **Attendi che finisca**

### **PASSO 8: Apri l'App sul Samsung**

1. **Trova l'app "TableTalk"** sul Samsung
2. **Apri l'app**
3. **L'app si connetterà automaticamente** al server di sviluppo sul Mac (se sono sulla stessa WiFi!)

### **PASSO 9: Testa il Live Reload! 🎉**

1. **Modifica un file** nel progetto (es. un componente React)
2. **Salva il file** (Cmd+S)
3. **Guarda il Samsung** - l'app si aggiornerà automaticamente!

---

## 🔍 VERIFICA CHE FUNZIONI

### Controlli da Fare:

1. ✅ **Server React attivo:**
   - Nel terminale vedi "Compiled successfully!"
   - Nessun errore rosso

2. ✅ **Samsung connesso:**
   - WiFi attivo
   - Stessa rete del Mac

3. ✅ **App installata:**
   - L'app si apre sul Samsung
   - Non mostra errori di connessione

4. ✅ **Live Reload funziona:**
   - Modifichi un file → salvi → l'app si aggiorna automaticamente

---

## 🆘 RISOLUZIONE PROBLEMI

### "L'app non si connette al server"

**Soluzione:**
1. Verifica che Mac e Samsung siano sulla stessa WiFi
2. Controlla il firewall del Mac:
   ```bash
   # Permetti connessioni sulla porta 3000
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
   ```
3. Verifica l'IP del Mac:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Se è diverso da `192.168.1.57`, aggiorna `capacitor.config.ts`

### "Non riesco a installare l'APK"

**Soluzione:**
1. Verifica che "Origini sconosciute" sia abilitato
2. Prova a disinstallare la versione precedente dell'app prima
3. Verifica che l'APK non sia corrotto (riprova a scaricarlo)

### "Modifiche non si vedono"

**Soluzione:**
1. Verifica che il file sia salvato (Cmd+S)
2. Controlla il terminale del server - dovresti vedere "Compiled successfully!"
3. Ricarica manualmente l'app sul Samsung (chiudi e riapri)
4. Riavvia il server React se necessario

### "L'app si aggiorna ma vedo errori"

**Soluzione:**
1. Controlla la console del browser (Chrome DevTools)
2. Verifica che il server React sia ancora attivo
3. Riavvia il server:
   ```bash
   # Nel terminale del server, premi Ctrl+C
   # Poi riavvia:
   npm start
   ```

---

## 💡 SUGGERIMENTI

1. **Mantieni sempre aperto** il terminale con `npm start`
2. **Usa due terminali:** uno per il server React, uno per i comandi
3. **Testa spesso:** modifica qualcosa e verifica che si aggiorni
4. **Se qualcosa non funziona:** riavvia il server React (Ctrl+C poi `npm start`)

---

## ⚠️ IMPORTANTE: Prima di Pubblicare

**PRIMA di generare l'APK per Google Play:**

1. **Rimuovi la configurazione `server`** da `capacitor.config.ts`:
   ```typescript
   server: {
     // RIMUOVI QUESTA SEZIONE!
     // url: 'http://192.168.1.57:3000',
     // cleartext: true
   },
   ```

2. **Oppure ripristina la configurazione originale:**
   ```typescript
   server: {
     androidScheme: 'https'
   },
   ```

3. **Poi sincronizza:**
   ```bash
   npx cap sync android
   ```

---

## 🎯 VANTAGGI DEL METODO SENZA CAVO

✅ **Nessun cavo necessario**
✅ **Più comodo** - puoi muoverti liberamente
✅ **Funziona da qualsiasi posizione** (stessa WiFi)
✅ **Facile da ripetere** quando serve aggiornare l'app

---

## 📝 NOTE

- L'APK debug si connette automaticamente al server di sviluppo
- Se chiudi il server React, l'app non funzionerà
- Per testare senza server, genera un APK release normale
- Il Live Reload funziona solo quando Mac e Samsung sono sulla stessa WiFi

---

Buon sviluppo! 🚀

