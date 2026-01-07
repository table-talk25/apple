# 🔄 Guida Passo-Passo: Live Reload su Samsung

Questa guida ti permette di vedere le modifiche all'app **in tempo reale** sul tuo Samsung mentre sviluppi!

---

## ✅ PREREQUISITI

1. ✅ Samsung connesso alla **stessa rete WiFi** del Mac
2. ✅ Debug USB abilitato sul Samsung (opzionale ma consigliato)
3. ✅ Mac connesso alla rete WiFi

---

## 📋 PASSI DA SEGUIRE

### **PASSO 1: Configurazione Capacitor** ✅ COMPLETATO

Ho già modificato `capacitor.config.ts` con il tuo IP locale: `192.168.1.57`

### **PASSO 2: Connetti Samsung e Mac alla Stessa WiFi**

1. **Sul Mac:**
   - Verifica che sia connesso al WiFi (icona WiFi in alto a destra)
   - Prendi nota del nome della rete WiFi

2. **Sul Samsung:**
   - Vai su **Impostazioni** → **WiFi**
   - Connetti alla **stessa rete WiFi** del Mac
   - Verifica che sia connesso

### **PASSO 3: Avvia il Server di Sviluppo**

Apri il **Terminale** sul Mac e esegui:

```bash
cd "/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client"
npm start
```

**Cosa succede:**
- Il server React si avvierà
- Vedrai un messaggio tipo: "Compiled successfully!"
- Il server sarà attivo su `http://localhost:3000`
- **NON chiudere questo terminale!** Lascialo aperto

**Tempo:** 1-2 minuti

### **PASSO 4: Sincronizza Capacitor**

Apri un **NUOVO Terminale** (non chiudere il primo!) ed esegui:

```bash
cd "/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client"
npx cap sync android
```

**Cosa succede:**
- Capacitor sincronizza le modifiche
- Aggiorna la configurazione Android con l'IP del server

**Tempo:** 30 secondi

### **PASSO 5: Installa l'App sul Samsung**

#### Opzione A: Via USB (CONSIGLIATO)

1. **Connetti il Samsung al Mac via USB**
2. **Abilita Debug USB sul Samsung:**
   - Impostazioni → Informazioni sul telefono
   - Tocca "Numero build" 7 volte
   - Torna indietro → Opzioni sviluppatore
   - Abilita "Debug USB"

3. **Verifica connessione:**
   ```bash
   adb devices
   ```
   (Dovresti vedere il tuo dispositivo)

4. **Installa l'app:**
   ```bash
   cd "/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client/android"
   ./gradlew installDebug
   ```

#### Opzione B: Build APK e Installa Manualmente

Se USB non funziona:

```bash
cd "/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client/android"
./gradlew assembleDebug
```

Poi trasferisci l'APK da:
`android/app/build/outputs/apk/debug/app-debug.apk`

### **PASSO 6: Apri l'App sul Samsung**

1. **Trova l'app "TableTalk"** sul Samsung
2. **Apri l'app**
3. **L'app si connetterà automaticamente** al server di sviluppo sul Mac

### **PASSO 7: Testa il Live Reload! 🎉**

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

### "ADB non trova il dispositivo"

**Soluzione:**
1. Verifica che il cavo USB supporti trasferimento dati
2. Sul Samsung: autorizza il computer quando richiesto
3. Prova un'altra porta USB
4. Riavvia ADB:
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

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

### "Modifiche non si vedono"

**Soluzione:**
1. Verifica che il file sia salvato (Cmd+S)
2. Controlla il terminale del server - dovresti vedere "Compiled successfully!"
3. Ricarica manualmente l'app sul Samsung (chiudi e riapri)
4. Riavvia il server React

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

## 💡 SUGGERIMENTI

1. **Mantieni sempre aperto** il terminale con `npm start`
2. **Usa due terminali:** uno per il server React, uno per i comandi
3. **Testa spesso:** modifica qualcosa e verifica che si aggiorni
4. **Se qualcosa non funziona:** riavvia il server React (Ctrl+C poi `npm start`)

---

## 🎯 PROSSIMI PASSI

Una volta che il Live Reload funziona:

1. ✅ Modifica l'app come preferisci
2. ✅ Vedi le modifiche in tempo reale sul Samsung
3. ✅ Testa tutte le funzionalità
4. ✅ Quando sei soddisfatto, genera l'APK per la release (ricorda di rimuovere la config server!)

---

Buon sviluppo! 🚀

