# ✅ Riepilogo Configurazione Render - TableTalk

## 🎯 Stato Attuale

- ✅ Backend deployato su Render: `https://tabletalk-app-backend.onrender.com`
- ✅ Configurazione app aggiornata con URL Render
- ⚠️ **DA FARE**: Configurare variabili d'ambiente su Render

## 🔧 Configurazione Necessaria su Render Dashboard

Vai su **Render Dashboard** → Il tuo servizio `tabletalk-backend` → **"Environment"** e imposta:

### ⚠️ OBBLIGATORIE (senza queste il backend non funziona):

1. **MONGO_URI**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/tabletalk?retryWrites=true&w=majority
   ```
   *(Sostituisci con la tua stringa MongoDB Atlas reale)*

2. **JWT_SECRET**
   ```
   una-stringa-super-sicura-e-casuale-di-almeno-32-caratteri
   ```
   *(Genera con: `openssl rand -base64 32`)*

3. **CORS_ORIGIN** ⚠️ IMPORTANTE per l'app mobile!
   ```
   capacitor://localhost
   ```
   *(Questo permette all'app Android/iOS di connettersi al backend)*

### 🔥 OBBLIGATORIO per Notifiche Push:

4. **FIREBASE_SERVICE_ACCOUNT_JSON**
   - Copia tutto il contenuto del file `tabletalk-social-firebase-adminsdk-fbsvc-34377d5e47.json`
   - Incolla come valore della variabile (tutto il JSON su una riga)

### 🌐 Opzionali ma Consigliate:

5. **FRONTEND_URL**
   ```
   https://tabletalk-app-backend.onrender.com
   ```
   *(O lascia vuoto se non hai una web app)*

6. **API_URL**
   ```
   https://tabletalk-app-backend.onrender.com
   ```
   *(Render lo genera automaticamente, ma puoi impostarlo manualmente)*

## ✅ Verifica Configurazione

Dopo aver impostato le variabili, controlla i log su Render:

1. Vai su **Render Dashboard** → Il tuo servizio → **"Logs"**
2. Cerca questi messaggi:
   ```
   ✅ Mongoose: Connesso a MongoDB con successo.
   📦 Firebase: Credenziali caricate da variabile d'ambiente FIREBASE_SERVICE_ACCOUNT_JSON
   ✅ Firebase Admin SDK inizializzato correttamente - Notifiche push ABILITATE
   🚀 Server TableTalk in esecuzione su...
   ```

3. Testa l'endpoint:
   ```bash
   curl https://tabletalk-app-backend.onrender.com/health
   ```
   Dovresti ricevere:
   ```json
   {
     "status": "ok",
     "timestamp": "...",
     "uptime": 123.45,
     "environment": "production"
   }
   ```

## 📱 Per Far Funzionare l'App del Play Store

L'app attualmente sul Play Store è stata compilata con un URL backend diverso. Per aggiornarla:

1. ✅ **Configurazione aggiornata** (già fatto - URL Render configurato)
2. ⏳ **Ricompila l'app Android** con la nuova configurazione
3. ⏳ **Pubblica nuova versione** sul Play Store

Vedi la guida completa in: `FRONTEND/client/AGGIORNA_APP_PLAY_STORE.md`

## 🎉 Risultato Finale

Una volta completata la configurazione:
- ✅ Backend funzionante su Render
- ✅ Notifiche push abilitate
- ✅ App mobile può connettersi al backend
- ✅ Avatar e immagini funzionano
- ✅ Creazione TableTalk funziona

---

**Prossimo passo**: Configura le variabili d'ambiente su Render Dashboard!

