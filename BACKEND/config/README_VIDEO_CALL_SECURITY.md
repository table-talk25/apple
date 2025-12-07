# 🛡️ **Sistema di Sicurezza Videochiamate - TableTalk**

## 📋 **Panoramica**

Questo sistema implementa controlli di sicurezza avanzati per le videochiamate, garantendo che solo utenti autorizzati possano accedere alle chiamate virtuali nei momenti appropriati.

---

## 🎯 **Funzionalità di Sicurezza Implementate**

### **1️⃣ Controllo Tipo Pasto**
- **Verifica Virtuale**: Solo pasti di tipo `virtual` possono avere videochiamate
- **Blocco Fisici**: Pasti fisici non possono generare token video
- **Validazione Backend**: Controllo lato server per massima sicurezza

### **2️⃣ Controllo Autorizzazione Partecipanti**
- **Verifica Partecipazione**: Solo utenti iscritti al pasto possono accedere
- **Controllo Ruolo**: Verifica che l'utente sia nella lista `participants`
- **Blocco Non Autorizzati**: Accesso negato a utenti esterni

### **3️⃣ Controllo Stato Videochiamata**
- **Stato Attivo**: Solo videochiamate con status `active` sono accessibili
- **Gestione Terminate**: Videochiamate `ended` non permettono nuovi accessi
- **Controllo Disponibilità**: Verifica che la chiamata sia disponibile

### **4️⃣ 🕐 Controllo Temporale (NUOVO)**
- **Accesso Precoce**: Videochiamata accessibile solo 10 minuti prima dell'inizio
- **Blocco Anticipato**: Impedisce accessi troppo precoci
- **Sicurezza Backend**: Controllo lato server indipendentemente dal frontend
- **Configurabile**: Intervallo personalizzabile tramite configurazione

### **5️⃣ Controllo Host per Terminazione**
- **Solo Host**: Solo l'organizzatore può terminare la videochiamata
- **Autorizzazione Rigorosa**: Verifica identità dell'host
- **Sicurezza Amministrativa**: Controllo completo sulle operazioni critiche

---

## ⚙️ **Configurazione**

### **File: `videoCallConfig.js`**

```javascript
const VIDEO_CALL_CONFIG = {
    // Controlli temporali
    TIMING: {
        MINUTES_BEFORE_START: 10,  // Minuti prima dell'inizio
        MINUTES_AFTER_END: 15,     // Minuti dopo la fine
        VALIDATION_INTERVAL: 60000 // Intervallo validazione (ms)
    },
    
    // Messaggi personalizzabili
    MESSAGES: {
        TOO_EARLY: 'La videochiamata può essere accessibile solo {{minutes}} minuti prima dell\'orario di inizio.',
        NOT_VIRTUAL_MEAL: 'Questa non è una videochiamata virtuale',
        NOT_AUTHORIZED: 'Non sei autorizzato a partecipare a questa videochiamata',
        // ... altri messaggi
    },
    
    // Configurazione sicurezza
    SECURITY: {
        CHECK_PARTICIPANT: true,    // Verifica partecipante
        CHECK_MEAL_TYPE: true,      // Verifica tipo pasto
        CHECK_CALL_STATUS: true,    // Verifica stato chiamata
        CHECK_TIMING: true,         // Verifica temporale
        HOST_ONLY_END: true         // Solo host può terminare
    }
};
```

---

## 🔧 **API Endpoints Sicuri**

### **POST `/api/video/meals/:mealId/token` - Genera Token**
```javascript
// Controlli applicati automaticamente:
// 1. ✅ Verifica tipo pasto (deve essere virtual)
// 2. ✅ Verifica autorizzazione (utente deve essere partecipante)
// 3. ✅ Verifica stato videochiamata (deve essere active)
// 4. 🕐 Verifica temporale (max 10 minuti prima dell'inizio)
// 5. 🔐 Generazione token sicuro se tutti i controlli passano
```

### **POST `/api/video/meals/:mealId/end` - Termina Videochiamata**
```javascript
// Controlli applicati automaticamente:
// 1. ✅ Verifica esistenza pasto
// 2. 🔐 Verifica autorizzazione (solo host può terminare)
// 3. 🎯 Terminazione stanza Twilio
// 4. 📝 Aggiornamento stato nel database
```

---

## 🕐 **Controllo Temporale Dettagliato**

### **Come Funziona**
```javascript
// Calcolo tempo di accesso
const now = new Date();
const mealStartTime = new Date(meal.startTime);
const minutesBefore = VIDEO_CALL_CONFIG.TIMING.MINUTES_BEFORE_START;
const timeBeforeStart = new Date(mealStartTime.getTime() - minutesBefore * 60 * 1000);

// Verifica accesso
if (now < timeBeforeStart) {
    return next(new ErrorResponse(
        `La videochiamata può essere accessibile solo ${minutesBefore} minuti prima dell'orario di inizio.`, 
        403
    ));
}
```

### **Esempio Pratico**
- **Pasto inizia**: 20:00
- **Accesso videochiamata**: 19:50 (10 minuti prima)
- **Blocco accesso**: Prima delle 19:50
- **Risultato**: Sicurezza garantita anche se il frontend viene "forzato"

---

## 🚫 **Casi di Blocco e Messaggi**

### **Accesso Negato - Codice 400**
```javascript
// Motivo: Pasto non virtuale
{
    "success": false,
    "error": "Questa non è una videochiamata virtuale"
}
```

### **Accesso Negato - Codice 403**
```javascript
// Motivo 1: Utente non autorizzato
{
    "success": false,
    "error": "Non sei autorizzato a partecipare a questa videochiamata"
}

// Motivo 2: Videochiamata terminata
{
    "success": false,
    "error": "Questa videochiamata è terminata."
}

// Motivo 3: Videochiamata non disponibile
{
    "success": false,
    "error": "La videochiamata non è ancora disponibile."
}

// Motivo 4: Accesso troppo precoce
{
    "success": false,
    "error": "La videochiamata può essere accessibile solo 10 minuti prima dell'orario di inizio."
}

// Motivo 5: Solo host può terminare
{
    "success": false,
    "error": "Solo l'host può terminare la chiamata."
}
```

### **Accesso Negato - Codice 404**
```javascript
// Motivo: Pasto non trovato
{
    "success": false,
    "error": "Pasto non trovato con id [mealId]"
}
```

---

## 📊 **Logging e Monitoraggio**

### **Livelli di Log**
- **ℹ️ INFO**: Richieste ricevute e operazioni normali
- **✅ SUCCESS**: Operazioni completate con successo
- **⚠️ WARNING**: Situazioni che richiedono attenzione
- **🚨 ERROR**: Errori e problemi
- **🚫 BLOCKED**: Tentativi di accesso non autorizzato

### **Esempi di Log**
```bash
ℹ️ [VideoCall] Ricevuta richiesta per pasto 123 da utente Mario
✅ [VideoCall] Token generato con successo per utente Mario nel pasto 123
🚫 [VideoCall] Tentativo di accesso troppo precoce per pasto 123
✅ [VideoCall] Stanza Twilio 123 terminata con successo.
```

---

## 🎯 **Strategie di Sicurezza**

### **1️⃣ Difesa in Profondità**
- **Frontend**: Controlli UI per esperienza utente
- **Backend**: Validazioni rigorose per sicurezza
- **Database**: Verifica integrità dati
- **Twilio**: Controllo accessi alla piattaforma video

### **2️⃣ Controllo Temporale Intelligente**
- **Prevenzione Accessi Prematuri**: Blocca tentativi troppo precoci
- **Configurazione Flessibile**: Intervalli personalizzabili
- **Validazione Server**: Sicurezza indipendente dal client
- **Logging Dettagliato**: Traccia tutti i tentativi di accesso

### **3️⃣ Autorizzazione Granulare**
- **Partecipanti**: Solo utenti iscritti al pasto
- **Host**: Privilegi speciali per gestione
- **Tipo Pasto**: Distinzione tra virtual e fisico
- **Stato Chiamata**: Controllo dinamico della disponibilità

---

## 🔍 **Debug e Troubleshooting**

### **Verifica Configurazione**
```javascript
// Controlla che i limiti temporali siano corretti
console.log('Minuti prima:', VIDEO_CALL_CONFIG.TIMING.MINUTES_BEFORE_START);
console.log('Messaggio troppo precoce:', VIDEO_CALL_CONFIG.MESSAGES.TOO_EARLY);
```

### **Test Controlli Temporali**
```javascript
// Simula controllo temporale
const testMeal = { startTime: new Date('2024-01-01T20:00:00Z') };
const now = new Date('2024-01-01T19:45:00Z'); // 15 minuti prima
const minutesBefore = 10;
const timeBeforeStart = new Date(testMeal.startTime.getTime() - minutesBefore * 60 * 1000);

console.log('Può accedere?', now >= timeBeforeStart); // false
```

### **Monitoraggio Log**
```bash
# Filtra log per tipo
grep "🚫" logs/app.log    # Tentativi bloccati
grep "✅" logs/app.log    # Operazioni riuscite
grep "⚠️" logs/app.log    # Warning e attenzioni
```

---

## 🚀 **Prossimi Passi**

### **Miglioramenti Suggeriti**
1. **Controllo Post-Fine**: Limite di tempo dopo la fine del pasto
2. **Rate Limiting**: Limite tentativi di accesso per utente
3. **Notifiche Admin**: Alert per tentativi di accesso sospetti
4. **Analytics Sicurezza**: Metriche su tentativi di accesso non autorizzati

### **Integrazioni**
- **Redis**: Cache per controlli temporali
- **Webhook**: Notifiche esterne per eventi di sicurezza
- **Dashboard Admin**: Interfaccia per monitoraggio sicurezza

---

## 📞 **Supporto**

Per domande o problemi:
- **Controlla i log** per errori e tentativi bloccati
- **Verifica la configurazione** in `videoCallConfig.js`
- **Testa i controlli temporali** con diversi orari
- **Monitora le performance** del database

---

## ✅ **Benefici del Sistema**

1. **🛡️ Sicurezza Massima**: Controlli rigorosi lato server
2. **⏰ Controllo Temporale**: Accesso solo nei momenti appropriati
3. **🔐 Autorizzazione Granulare**: Controlli specifici per ogni operazione
4. **📊 Monitoraggio Completo**: Log dettagliati per debugging
5. **⚙️ Configurazione Flessibile**: Personalizzazione facile dei parametri
6. **🚀 Performance Ottimizzata**: Controlli efficienti e veloci

---

## 🎯 **Risultato Finale**

Il sistema di sicurezza per le videochiamate è ora **completamente sicuro** e protegge da:

- **Accessi non autorizzati** da utenti esterni
- **Accessi prematuri** prima dell'orario consentito
- **Abusi di tipo pasto** (fisico vs virtuale)
- **Terminazioni non autorizzate** da utenti non host
- **Accessi a videochiamate terminate** o non disponibili

**"La videochiamata può essere accessibile solo 10 minuti prima dell'orario di inizio"** - Questo controllo temporale garantisce che anche se un utente riuscisse a "forzare" il pulsante nel frontend, il server gli negherebbe comunque l'accesso! 🛡️⏰✨
