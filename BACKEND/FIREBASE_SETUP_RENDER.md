# 🔥 Configurazione Firebase per Notifiche Push su Render

Questa guida ti spiega come configurare Firebase per abilitare le notifiche push sul backend deployato su Render.

## 📋 Prerequisiti

1. Account Firebase attivo
2. Progetto Firebase creato
3. Accesso a Render Dashboard

## 🚀 Passo 1: Ottieni le Credenziali Firebase

### 1.1 Vai su Firebase Console

1. Apri [Firebase Console](https://console.firebase.google.com)
2. Seleziona il tuo progetto (o creane uno nuovo se non ce l'hai)

### 1.2 Genera la Chiave del Service Account

1. Vai su **⚙️ Impostazioni progetto** (icona ingranaggio in alto a sinistra)
2. Vai alla scheda **"Account di servizio"** (Service accounts)
3. Clicca su **"Genera nuova chiave privata"** (Generate new private key)
4. Si aprirà un popup di conferma → clicca **"Genera chiave"**
5. Si scaricherà automaticamente un file JSON (es. `tabletalk-social-firebase-adminsdk-xxxxx.json`)

### 1.3 Apri il File JSON Scaricato

Apri il file JSON scaricato con un editor di testo. Dovrebbe contenere qualcosa del tipo:

```json
{
  "type": "service_account",
  "project_id": "tabletalk-social",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@tabletalk-social.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40tabletalk-social.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

## 🔧 Passo 2: Configura su Render

Hai **2 metodi** per configurare Firebase su Render. Scegli quello che preferisci:

### 📦 METODO 1: JSON Completo (CONSIGLIATO - Più Semplice)

1. Vai su **Render Dashboard** → Il tuo servizio → **"Environment"**
2. Clicca su **"Add Environment Variable"**
3. Imposta:
   - **Key**: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value**: Copia l'**intero contenuto** del file JSON scaricato (tutto il JSON come stringa)
   
   ⚠️ **IMPORTANTE**: 
   - Copia TUTTO il JSON, inclusi `{` e `}`
   - Non aggiungere spazi o caratteri extra
   - Esempio corretto:
     ```
     {"type":"service_account","project_id":"tabletalk-social","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@tabletalk-social.iam.gserviceaccount.com",...}
     ```

4. Clicca **"Save Changes"**

### 🔑 METODO 2: Variabili Separate (Alternativa)

Se preferisci usare variabili separate invece del JSON completo:

1. Vai su **Render Dashboard** → Il tuo servizio → **"Environment"**
2. Aggiungi queste variabili una per una:

   **FIREBASE_PROJECT_ID**
   - **Key**: `FIREBASE_PROJECT_ID`
   - **Value**: Il `project_id` dal JSON (es. `tabletalk-social`)

   **FIREBASE_CLIENT_EMAIL**
   - **Key**: `FIREBASE_CLIENT_EMAIL`
   - **Value**: Il `client_email` dal JSON (es. `firebase-adminsdk-xxxxx@tabletalk-social.iam.gserviceaccount.com`)

   **FIREBASE_PRIVATE_KEY**
   - **Key**: `FIREBASE_PRIVATE_KEY`
   - **Value**: Il `private_key` dal JSON (mantieni i `\n` così come sono)
   - ⚠️ **IMPORTANTE**: Copia la chiave privata COMPLETA, inclusi `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`
   - Esempio:
     ```
     -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
     ```

   **FIREBASE_PRIVATE_KEY_ID** (Opzionale)
   - **Key**: `FIREBASE_PRIVATE_KEY_ID`
   - **Value**: Il `private_key_id` dal JSON

   **FIREBASE_CLIENT_ID** (Opzionale)
   - **Key**: `FIREBASE_CLIENT_ID`
   - **Value**: Il `client_id` dal JSON

3. Clicca **"Save Changes"** per ogni variabile

## ✅ Passo 3: Verifica la Configurazione

1. Dopo aver aggiunto le variabili, Render eseguirà automaticamente un nuovo deploy
2. Vai su **"Logs"** nel dashboard del servizio
3. Cerca nei log:
   ```
   📦 Firebase: Credenziali caricate da variabile d'ambiente FIREBASE_SERVICE_ACCOUNT_JSON
   ✅ Firebase Admin SDK inizializzato correttamente - Notifiche push ABILITATE
   ```

   Se vedi questi messaggi, Firebase è configurato correttamente! 🎉

4. Se vedi invece:
   ```
   ⚠️  Firebase: Nessuna credenziale trovata
   ⚠️  Firebase Admin SDK non configurato. Le notifiche push NON funzioneranno.
   ```
   
   Controlla che:
   - Le variabili d'ambiente siano state salvate correttamente
   - Il JSON sia completo e valido (se usi METODO 1)
   - Non ci siano spazi extra o caratteri mancanti

## 🧪 Passo 4: Test delle Notifiche Push

Per testare che le notifiche funzionino:

1. Assicurati che l'app mobile sia configurata con Firebase (file `google-services.json` per Android)
2. Fai login nell'app
3. L'app dovrebbe registrare automaticamente il token FCM
4. Prova a creare un TableTalk o inviare un messaggio in chat
5. Dovresti ricevere una notifica push sul dispositivo

## 🔍 Troubleshooting

### Errore: "Firebase Admin SDK non inizializzato"
- **Causa**: Le credenziali non sono state caricate correttamente
- **Soluzione**: 
  - Verifica che le variabili d'ambiente siano state salvate su Render
  - Controlla che il JSON sia valido (se usi METODO 1)
  - Verifica i log per errori di parsing

### Errore: "Invalid credential"
- **Causa**: La chiave privata è formattata male
- **Soluzione**:
  - Se usi METODO 1: Assicurati che il JSON sia completo e valido
  - Se usi METODO 2: Verifica che `FIREBASE_PRIVATE_KEY` contenga tutti i `\n` e sia completa

### Notifiche non arrivano
- **Causa 1**: Token FCM non registrato
  - **Soluzione**: Verifica che l'app mobile abbia il file `google-services.json` corretto
- **Causa 2**: Firebase non inizializzato correttamente
  - **Soluzione**: Controlla i log del backend per confermare l'inizializzazione
- **Causa 3**: Permessi notifiche non concessi
  - **Soluzione**: Verifica che l'utente abbia concesso i permessi notifiche sul dispositivo

## 📝 Note Importanti

- ⚠️ **SICUREZZA**: Le credenziali Firebase sono sensibili. Non committare mai il file `firebase-service-account.json` nel repository Git
- 🔄 **Redeploy**: Dopo aver aggiunto le variabili d'ambiente, Render eseguirà automaticamente un nuovo deploy
- 🧹 **Pulizia**: Se cambi le credenziali, elimina le vecchie variabili e aggiungi quelle nuove

## 🆘 Hai bisogno di aiuto?

Se hai problemi:
1. Controlla i log su Render Dashboard → Logs
2. Verifica che tutte le variabili d'ambiente siano impostate correttamente
3. Assicurati che il progetto Firebase sia attivo e configurato correttamente

---

**Una volta configurato, le notifiche push funzioneranno automaticamente! 🎉**

