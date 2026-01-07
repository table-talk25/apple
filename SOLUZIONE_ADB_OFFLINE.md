# 🔧 Soluzione: ADB Offline o Non Connesso

Se ADB mostra il dispositivo come "offline" o non si connette, ecco le soluzioni.

---

## ✅ SOLUZIONE 1: Verifica Porta Corretta

La porta standard per ADB WiFi è **5555**, non 37311.

### Passo 1: Verifica Porta sul Samsung

1. **Sul Samsung:**
   - Vai su **Impostazioni** → **Opzioni sviluppatore**
   - Cerca **"Debug wireless"** o **"ADB wireless"**
   - Dovresti vedere qualcosa tipo: **"192.168.1.61:5555"**
   - Se vedi una porta diversa, prendi nota

### Passo 2: Connetti con Porta Corretta

```bash
# Prova con porta standard 5555
adb connect 192.168.1.61:5555

# Verifica connessione
adb devices
```

---

## ✅ SOLUZIONE 2: Abilita Debug Wireless Correttamente

### Passo 1: Abilita Debug USB Prima

1. **Sul Samsung:**
   - Connetti via USB (anche se non hai il cavo, questo attiva il debug)
   - Vai su **Impostazioni** → **Opzioni sviluppatore**
   - Abilita **"Debug USB"**
   - Autorizza il computer quando richiesto

### Passo 2: Abilita Debug Wireless

1. **Sul Samsung:**
   - Nelle **Opzioni sviluppatore**
   - Cerca **"Debug wireless"** o **"ADB wireless"**
   - Abilitalo
   - Prendi nota dell'IP e porta mostrati

### Passo 3: Connetti

```bash
adb connect IP:PORTA
adb devices
```

---

## ✅ SOLUZIONE 3: Riavvia ADB

Se il dispositivo è offline:

```bash
# Riavvia ADB
adb kill-server
adb start-server

# Riconnetti
adb connect 192.168.1.61:5555

# Verifica
adb devices
```

---

## ✅ SOLUZIONE 4: Metodo Alternativo - Installa Manualmente

Se ADB continua a non funzionare, usa il metodo manuale:

### Passo 1: Disabilita Play Protect

1. **Sul Samsung:**
   - Apri **Google Play Store**
   - Profilo → **Play Protect**
   - Impostazioni → **Disabilita "Scansiona app con Play Protect"**

### Passo 2: Trasferisci APK

1. **Sul Mac:**
   - Apri Finder
   - Vai su: `/Users/ele/TableTalk mEat Together - Apple/FRONTEND/client/android/app/build/outputs/apk/debug`
   - Trova `app-debug.apk`

2. **Trasferisci via:**
   - **Email** (rinomina in .zip se bloccato)
   - **Telegram** (invia a Messaggi salvati)
   - **Google Drive** (carica come ZIP)

### Passo 3: Installa sul Samsung

1. **Scarica l'APK** (o estrai dal ZIP)
2. **Apri File Manager**
3. **Trova l'APK**
4. **Tocca → Installa**
5. **Se vedi avviso virus:** Tocca "Installa comunque"

---

## 🔍 Verifica Connessione WiFi

Assicurati che:

1. ✅ **Mac e Samsung** siano sulla **stessa rete WiFi**
2. ✅ **WiFi attivo** su entrambi i dispositivi
3. ✅ **Nessun firewall** blocca la porta 5555 sul Mac

---

## 💡 Raccomandazione

Se ADB continua a dare problemi, **usa il metodo manuale** (Soluzione 4) - è più semplice e funziona sempre!

---

Prova prima la **Soluzione 1** (porta 5555), se non funziona usa la **Soluzione 4** (metodo manuale)! 🚀

