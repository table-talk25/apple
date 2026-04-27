# 🔥 CONFIGURAZIONE FIREBASE COMPLETA

## 📋 **PREREQUISITI**

Prima di procedere, assicurati di avere:
- [ ] Progetto Firebase attivo su [Firebase Console](https://console.firebase.google.com/)
- [ ] App Android registrata nel progetto Firebase
- [ ] File `google-services.json` scaricato e posizionato in `android/app/`
- [ ] Chiave API Google Maps configurata

## 🚀 **PASSI PER COMPLETARE LA CONFIGURAZIONE**

### **1. Configurazione Firebase Console**

#### **1.1 Crea/Configura il Progetto**
1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il progetto `tabletalk-social` o creane uno nuovo
3. Assicurati che il progetto sia attivo

#### **1.2 Registra l'App Android**
1. Nel progetto Firebase, clicca su "Aggiungi app" → "Android"
2. Inserisci il package name: `com.tabletalk.socialapp`
3. Scarica il file `google-services.json`
4. Posizionalo in `FRONTEND/client/android/app/`

#### **1.3 Abilita Cloud Messaging**
1. Nel menu laterale, vai su "Messaging"
2. Clicca su "Inizia"
3. Segui la procedura guidata per abilitare FCM

#### **1.4 Crea Service Account**
1. Vai su "Impostazioni progetto" → "Account di servizio"
2. Clicca su "Genera nuova chiave privata"
3. Scarica il file JSON
4. Rinominalo in `firebase-service-account.json`
5. Posizionalo in `BACKEND/`

### **2. Configurazione Backend**

#### **2.1 Aggiorna il file di configurazione**
Sostituisci i valori placeholder in `BACKEND/firebase-service-account.json`:

```json
{
  "type": "service_account",
  "project_id": "tabletalk-social",
  "private_key_id": "LA_TUA_PRIVATE_KEY_ID",
  "private_key": "-----BEGIN PRIVATE KEY-----\nLA_TUA_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@tabletalk-social.iam.gserviceaccount.com",
  "client_id": "IL_TUO_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40tabletalk-social.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

#### **2.2 Installa le dipendenze Firebase**
```bash
cd BACKEND
npm install firebase-admin
```

#### **2.3 Riavvia il server backend**
```bash
npm run dev
# oppure
npm start
```

### **3. Configurazione Frontend**

#### **3.1 Verifica Capacitor**
```bash
cd FRONTEND/client
npx cap sync android
```

#### **3.2 Testa le notifiche locali**
1. Avvia l'app in modalità debug
2. Controlla i log per verificare l'inizializzazione
3. Dovresti vedere: "✅ Notifiche push abilitate con successo!"

### **4. Test delle Notifiche**

#### **4.1 Test Locale**
```bash
# Nel backend, testa l'endpoint
curl -X POST http://localhost:5001/api/notifications/send-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tokens": ["TOKEN_FCM_DISPOSITIVO"],
    "title": "Test TableTalk",
    "body": "Notifica di test funzionante!",
    "type": "test"
  }'
```

#### **4.2 Test dall'App**
1. Apri l'app su un dispositivo fisico
2. Controlla i log per il token FCM
3. Usa l'endpoint di test per inviare una notifica

## 🔍 **VERIFICA CONFIGURAZIONE**

### **Controlla i Log del Backend**
```
✅ Firebase Admin SDK inizializzato correttamente
✅ Firebase Admin inizializzato con successo
```

### **Controlla i Log dell'App**
```
[NotificationService] Notifiche push abilitate con successo!
[usePushPermission] ✅ Notifiche push abilitate con successo!
```

### **Testa l'Endpoint Status**
```bash
curl http://localhost:5001/api/notifications/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Risposta attesa:
```json
{
  "success": true,
  "status": {
    "configured": true,
    "projectId": "tabletalk-social",
    "serviceAccount": true
  }
}
```

## 🚨 **RISOLUZIONE PROBLEMI**

### **Problema: "Firebase Admin non è stato inizializzato"**
**Soluzione:**
1. Verifica che `firebase-service-account.json` sia in `BACKEND/`
2. Controlla che il file JSON sia valido
3. Riavvia il server backend

### **Problema: "Notifiche push non disponibili"**
**Soluzione:**
1. Verifica che `google-services.json` sia in `android/app/`
2. Esegui `npx cap sync android`
3. Ricostruisci l'app

### **Problema: "Token FCM non ricevuto"**
**Soluzione:**
1. Verifica i permessi delle notifiche sul dispositivo
2. Controlla i log per errori di registrazione
3. Verifica la connessione internet

## 📱 **FEATURES DISPONIBILI DOPO LA CONFIGURAZIONE**

✅ **Notifiche Push Complete**
- Notifiche quando l'app è chiusa
- Deep linking alle pagine specifiche
- Badge numerici sulle icone

✅ **Tipi di Notifica Supportati**
- Nuovi messaggi in chat
- Inviti ai pasti
- Promemoria pasti
- Aggiornamenti pasti

✅ **Gestione Intelligente**
- Fallback automatico a notifiche locali
- Gestione errori robusta
- Logging dettagliato per debug

## 🎯 **PROSSIMI PASSI**

1. **Configura Firebase** seguendo questa guida
2. **Testa le notifiche** su dispositivo fisico
3. **Verifica il funzionamento** in background
4. **Deploy in produzione** con le notifiche funzionanti

## 📞 **SUPPORTO**

Se incontri problemi:
1. Controlla i log del backend e frontend
2. Verifica la configurazione Firebase
3. Testa su dispositivo fisico (non emulatore)
4. Controlla i permessi delle notifiche

---

**🎉 Con questa configurazione, TableTalk avrà notifiche push complete e funzionanti!**
