# 🌐 Metodo Server Locale - Download Diretto APK

Ho creato un server locale sul Mac per scaricare l'APK direttamente dal Samsung!

---

## ✅ PASSI DA SEGUIRE

### **PASSO 1: Verifica che Mac e Samsung siano sulla Stessa WiFi**

- ✅ Mac connesso al WiFi
- ✅ Samsung connesso alla **stessa rete WiFi**

### **PASSO 2: Sul Samsung - Apri Chrome**

1. **Apri Chrome** sul Samsung
2. **Nella barra degli indirizzi, digita:**

```
http://192.168.1.57:8000
```

(Sostituisci `192.168.1.57` con l'IP del tuo Mac se diverso)

### **PASSO 3: Scarica l'APK**

1. **Vedrai una lista di file**
2. **Tocca su `app-debug.apk`**
3. **Chrome inizierà il download**
4. **Quando finisce, tocca la notifica di download** (o vai su chrome://downloads)

### **PASSO 4: Installa l'APK**

1. **Tocca il file APK scaricato**
2. **Chrome ti chiederà se vuoi installarlo**
3. **Tocca "Installa"**
4. **Se vedi avviso virus:** Tocca "Installa comunque"

---

## 🆘 Se Non Funziona

### **Problema: Pagina non si carica**

1. **Verifica l'IP del Mac:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
2. **Usa l'IP corretto** nell'URL del Samsung

### **Problema: Download bloccato**

1. **Abilita "Origini sconosciute" per Chrome:**
   - Impostazioni → Sicurezza → "Installa app sconosciute"
   - Abilita per Chrome

### **Problema: File non si installa**

1. **Disabilita Play Protect:**
   - Google Play Store → Profilo → Play Protect
   - Impostazioni → Disabilita "Scansiona app con Play Protect"

---

## 🛑 Per Fermare il Server

Quando hai finito, ferma il server:

```bash
# Trova il processo Python
ps aux | grep "python3 -m http.server"

# Fermalo (sostituisci PID con il numero che vedi)
kill PID
```

Oppure semplicemente **chiudi il terminale** dove è in esecuzione.

---

## 💡 Vantaggi di Questo Metodo

- ✅ **Nessun blocco** da Gmail/Telegram
- ✅ **Download diretto** dal browser
- ✅ **Funziona sempre**
- ✅ **Veloce e semplice**

---

Prova ad aprire `http://192.168.1.57:8000` sul Samsung! 🚀

