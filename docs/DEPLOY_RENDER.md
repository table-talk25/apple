# 🚀 Guida Deploy su Render

Questo documento spiega come fare il deploy del backend TableTalk su Render usando il file `render.yaml`.

## 📋 Prerequisiti

1. Account su [Render.com](https://render.com)
2. Database MongoDB (MongoDB Atlas consigliato)
3. Repository Git (GitHub/GitLab/Bitbucket) connesso a Render

## 🔧 Configurazione Iniziale

### 1. Connetti il Repository a Render

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Clicca su **"New +"** → **"Blueprint"**
3. Seleziona il tuo repository Git
4. Render rileverà automaticamente il file `render.yaml` nella root

### 2. Imposta le Variabili d'Ambiente OBBLIGATORIE

Dopo che Render ha creato il servizio, vai su **"Environment"** e imposta:

#### ⚠️ OBBLIGATORIE (senza queste il deploy fallisce):

```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/tabletalk?retryWrites=true&w=majority
```
**Sostituisci con la tua stringa di connessione MongoDB Atlas**

```bash
JWT_SECRET=una-stringa-super-sicura-e-casuale-di-almeno-32-caratteri
```
**Genera una stringa casuale sicura (es. usa `openssl rand -base64 32`)**

```bash
CORS_ORIGIN=https://app.tuodominio.it,capacitor://localhost
```
**Sostituisci con i tuoi domini separati da virgola. Includi sempre `capacitor://localhost` per l'app mobile.**

#### 🌐 IMPORTANTI per produzione:

```bash
FRONTEND_URL=https://app.tuodominio.it
```
**URL del tuo frontend (se hai una web app) o lascia vuoto**

```bash
API_URL=https://tabletalk-app-backend.onrender.com
```
**Il tuo URL backend Render è: `https://tabletalk-app-backend.onrender.com`**

### 3. Variabili Opzionali (se usi queste funzioni)

#### Firebase (per notifiche push) - ⚠️ OBBLIGATORIO se vuoi le notifiche:

**METODO 1 (CONSIGLIATO)**: JSON completo
```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"tabletalk-social",...}
```
Copia l'intero contenuto del file `firebase-service-account.json` scaricato da Firebase Console.

**METODO 2**: Variabili separate
```bash
FIREBASE_PROJECT_ID=tabletalk-social
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tabletalk-social.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

📖 **Guida completa**: Vedi `FIREBASE_SETUP_RENDER.md` per istruzioni dettagliate passo-passo.

#### Email (per invio email):
```bash
EMAIL_SERVICE=gmail
EMAIL_USER=tua-email@gmail.com
EMAIL_PASSWORD=tua-password-app
EMAIL_FROM=noreply@tabletalk.app
```

#### Twilio (per videochiamate):
```bash
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_API_KEY=SKxxxxx
TWILIO_API_SECRET=xxxxx
```

## 🚀 Deploy

1. Render eseguirà automaticamente il deploy quando:
   - Colleghi il repository per la prima volta
   - Fai push su `main`/`master` (se hai abilitato auto-deploy)

2. Monitora i log in tempo reale:
   - Vai su **"Logs"** nel dashboard del servizio
   - Cerca errori come:
     - `MONGO_URI undefined` → Imposta la variabile d'ambiente
     - `Origine non permessa` → Controlla `CORS_ORIGIN`
     - `JWT_SECRET undefined` → Imposta la variabile d'ambiente

## ✅ Verifica Deploy Riuscito

1. Controlla i log: dovresti vedere:
   ```
   ✅ Mongoose: Connesso a MongoDB con successo.
   🚀 Server TableTalk in esecuzione su http://localhost:XXXX
   ```

2. Testa l'endpoint:
   ```bash
   curl https://tuo-servizio.onrender.com/health
   ```
   Dovresti ricevere:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-...",
     "uptime": 123.45,
     "environment": "production"
   }
   ```

3. Se funziona, copia l'URL del servizio (es. `https://tabletalk-backend-xxxx.onrender.com`)

## 🔗 Configura l'App Mobile

Dopo il deploy, aggiorna l'app mobile con l'URL del backend:

1. Nel file `FRONTEND/client/.env` (o nelle variabili d'ambiente di build):
   ```bash
   REACT_APP_API_URL=https://tabletalk-backend-xxxx.onrender.com/api
   ```

2. Ricompila l'app Android/iOS con questo URL

## 🐛 Risoluzione Problemi Comuni

### Deploy fallisce con "MONGO_URI undefined"
→ Imposta la variabile `MONGO_URI` su Render Dashboard → Environment

### Errore CORS "Origine non permessa"
→ Verifica che `CORS_ORIGIN` contenga tutti i domini che chiamano l'API, separati da virgola

### Server si avvia ma non risponde
→ Controlla che `PORT` non sia impostato manualmente (Render lo setta automaticamente)

### Immagini non si caricano
→ Su Render il filesystem è temporaneo. Considera di usare S3 o Cloud Storage per gli upload permanenti.

## 📝 Note Importanti

- **Filesystem temporaneo**: Gli upload in `/uploads` si perdono ai redeploy. Usa storage esterno (S3) per produzione.
- **Firebase Service Account**: Il file `firebase-service-account.json` non va committato. Se serve, aggiungilo come variabile d'ambiente segreta su Render.
- **Health Check**: L'endpoint `/health` viene usato per verificare che il servizio sia online (pubblico, non richiede autenticazione).

## 🔄 Aggiornamenti Futuri

Per aggiornare il backend:
1. Fai push su `main`/`master`
2. Render eseguirà automaticamente un nuovo deploy
3. Monitora i log per verificare che tutto funzioni

---

**Hai bisogno di aiuto?** Controlla i log su Render Dashboard → Logs per vedere errori specifici.

