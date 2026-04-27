# 🔔 Guida: Notifiche Push in Fase di Sviluppo

## ❓ Perché le notifiche potrebbero non funzionare in sviluppo?

Le notifiche push su Android richiedono configurazioni specifiche che possono differire tra sviluppo e produzione.

---

## 🔍 Problema 1: Certificati SHA non configurati

### Cosa sono i certificati SHA?
Android richiede che i certificati SHA-1 e SHA-256 del keystore siano registrati in Firebase Console per permettere le notifiche push.

### In sviluppo vs produzione:
- **Sviluppo**: Usa il **debug keystore** (`~/.android/debug.keystore`)
- **Produzione**: Usa il **release keystore** (quello che usi per Google Play)

### Come risolvere:

#### 1. Ottieni i certificati SHA del debug keystore:

```bash
cd FRONTEND/client/android
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Cerca le righe:
- `SHA1: XX:XX:XX:...`
- `SHA256: XX:XX:XX:...`

#### 2. Aggiungi i certificati in Firebase Console:

1. Vai su [Firebase Console](https://console.firebase.google.com)
2. Seleziona il progetto **tabletalk-social**
3. Vai su **⚙️ Impostazioni progetto** → **Le tue app**
4. Clicca sull'app Android (`com.tabletalk.socialapp`)
5. Scorri fino a **"Certificati SHA"**
6. Clicca **"Aggiungi certificato fingerprint"**
7. Incolla i certificati SHA-1 e SHA-256 del debug keystore
8. Salva

#### 3. Scarica il nuovo `google-services.json`:

1. Nella stessa pagina, clicca su **"Scarica google-services.json"**
2. Sostituisci il file in `FRONTEND/client/android/app/google-services.json`
3. Ricompila l'app:
   ```bash
   cd FRONTEND/client
   npm run build
   npx cap sync android
   cd android && ./gradlew assembleDebug
   ```

---

## 🔍 Problema 2: Backend locale senza credenziali Firebase

### Il backend deve avere le credenziali Firebase Admin SDK per inviare notifiche.

### Come risolvere:

#### Opzione A: Usa il backend su Render (consigliato per sviluppo)
- Il backend su Render ha già Firebase configurato
- L'app in sviluppo può connettersi a `https://tabletalk-app-backend.onrender.com`
- Verifica che `REACT_APP_BACKEND_URL` punti a Render

#### Opzione B: Configura Firebase nel backend locale

1. **Ottieni le credenziali Firebase Admin SDK:**
   - Vai su Firebase Console → **⚙️ Impostazioni progetto** → **Account di servizio**
   - Clicca **"Genera nuova chiave privata"**
   - Scarica il file JSON

2. **Aggiungi il file nel backend:**
   ```bash
   # Copia il file scaricato in:
   BACKEND/firebase-service-account.json
   ```

3. **Oppure usa variabili d'ambiente:**
   ```bash
   # Nel file .env del backend:
   FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
   # Oppure:
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@tabletalk-social.iam.gserviceaccount.com"
   FIREBASE_PROJECT_ID="tabletalk-social"
   ```

---

## 🔍 Problema 3: Token FCM non registrato

### Verifica che il token venga registrato:

1. **Apri l'app su Android**
2. **Connetti il telefono via USB**
3. **Apri Chrome DevTools:**
   - Vai su `chrome://inspect`
   - Clicca su "inspect" sotto il tuo dispositivo
   - Vai nella tab "Console"

4. **Cerca questi log:**
   ```
   🔥 Push token received: [token]
   ✅ Push token sent to backend
   ```

5. **Se non vedi il token:**
   - Verifica che i permessi notifiche siano concessi
   - Controlla che `google-services.json` sia presente
   - Verifica che il plugin Google Services sia applicato nel build

---

## ✅ Checklist per far funzionare le notifiche in sviluppo:

- [ ] Certificati SHA-1 e SHA-256 del debug keystore aggiunti in Firebase Console
- [ ] File `google-services.json` aggiornato dopo l'aggiunta dei certificati
- [ ] App ricompilata dopo l'aggiornamento di `google-services.json`
- [ ] Backend configurato con credenziali Firebase (locale o Render)
- [ ] Permessi notifiche concessi nell'app
- [ ] Token FCM registrato e inviato al backend (verifica nei log)

---

## 🧪 Test delle notifiche:

### 1. Test locale (se backend locale configurato):

```bash
# Nel backend, crea un endpoint di test:
curl -X POST http://localhost:5001/api/notifications/send-test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "Notifica di test"}'
```

### 2. Test con backend Render:

```bash
curl -X POST https://tabletalk-app-backend.onrender.com/api/notifications/send-test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "Notifica di test"}'
```

---

## 📝 Note importanti:

1. **Le notifiche push funzionano solo su dispositivi fisici**, non su emulatori Android (a meno che non usi un emulatore con Google Play Services)

2. **Il token FCM cambia** quando:
   - Reinstalli l'app
   - Cancelli i dati dell'app
   - L'app viene aggiornata (a volte)

3. **In produzione**, assicurati di aggiungere anche i certificati SHA del **release keystore** in Firebase Console

4. **Per test rapidi**, puoi usare il backend su Render che è già configurato

---

## 🆘 Se ancora non funziona:

1. **Verifica i log dell'app** (Chrome DevTools)
2. **Verifica i log del backend** (Render dashboard o terminale locale)
3. **Controlla Firebase Console** → **Cloud Messaging** → **Statistiche** per vedere se le notifiche vengono inviate
4. **Verifica che il token FCM sia salvato nel database** del backend

---

## 🔗 Link utili:

- [Firebase Console](https://console.firebase.google.com/project/tabletalk-social)
- [Documentazione FCM](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)

