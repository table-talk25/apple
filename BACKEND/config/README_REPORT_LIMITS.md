# 🛡️ **Sistema Anti-Spam per Segnalazioni - TableTalk**

## 📋 **Panoramica**

Questo sistema implementa controlli intelligenti per prevenire l'abuso delle segnalazioni, garantendo che gli utenti non possano "spammare" segnalazioni contro altri utenti.

---

## 🎯 **Funzionalità Implementate**

### **1️⃣ Controllo Segnalazioni Duplicate**
- **Segnalazione Pendente**: Blocca se esiste già una segnalazione aperta
- **Segnalazione Recente**: Blocca se è stata fatta nelle ultime 24 ore
- **Messaggio Chiaro**: "Hai già una segnalazione aperta per questo utente"

### **2️⃣ Limiti Temporali**
- **Limite Giornaliero**: Massimo 5 segnalazioni al giorno
- **Limite Settimanale**: Massimo 20 segnalazioni a settimana
- **Reset Automatico**: I limiti si resettano automaticamente

### **3️⃣ Controlli Avanzati**
- **Rate Limiting**: Previene segnalazioni troppo frequenti
- **Monitoraggio Utenti**: Traccia utenti con troppe segnalazioni pendenti
- **Logging Intelligente**: Log dettagliati per debugging e monitoraggio

---

## ⚙️ **Configurazione**

### **File: `reportLimits.js`**

```javascript
const REPORT_LIMITS = {
    // Limiti numerici
    DAILY_LIMIT: 5,        // Segnalazioni al giorno
    WEEKLY_LIMIT: 20,      // Segnalazioni a settimana
    MAX_PENDING_PER_USER: 10, // Max segnalazioni pendenti per utente
    
    // Intervalli di tempo (millisecondi)
    INTERVALS: {
        DAY: 24 * 60 * 60 * 1000,        // 24 ore
        WEEK: 7 * 24 * 60 * 60 * 1000,   // 7 giorni
        MONTH: 30 * 24 * 60 * 60 * 1000  // 30 giorni
    },
    
    // Messaggi personalizzabili
    MESSAGES: {
        DAILY_LIMIT_EXCEEDED: 'Limite giornaliero raggiunto...',
        WEEKLY_LIMIT_EXCEEDED: 'Limite settimanale raggiunto...',
        // ... altri messaggi
    }
};
```

### **Personalizzazione**
- **Modifica i limiti**: Cambia i valori numerici
- **Personalizza messaggi**: Adatta i testi alle tue esigenze
- **Disabilita logging**: Imposta `LOGGING.ENABLED: false`

---

## 🔧 **API Endpoints**

### **POST `/api/reports` - Crea Segnalazione**
```javascript
// Controlli applicati automaticamente:
// 1. Verifica segnalazione pendente
// 2. Verifica segnalazione recente (24h)
// 3. Controllo limite giornaliero (5)
// 4. Controllo limite settimanale (20)
// 5. Monitoraggio utente segnalato
```

### **GET `/api/reports/my-stats` - Statistiche Personali**
```javascript
{
    "success": true,
    "data": {
        "counts": {
            "daily": 2,      // Segnalazioni oggi
            "weekly": 8,     // Segnalazioni questa settimana
            "total": 15      // Totale storico
        },
        "limits": {
            "daily": 5,      // Limite giornaliero
            "weekly": 20     // Limite settimanale
        },
        "remaining": {
            "daily": 3,      // Rimanenti oggi
            "weekly": 12     // Rimanenti questa settimana
        },
        "canReport": {
            "daily": true,   // Può segnalare oggi
            "weekly": true   // Può segnalare questa settimana
        }
    }
}
```

---

## 🚫 **Casi di Blocco**

### **Segnalazione Bloccata - Codice 400**
```javascript
// Motivo: Segnalazione pendente già esistente
{
    "success": false,
    "error": "Hai già una segnalazione aperta per questo utente. Il nostro team la esaminerà al più presto."
}
```

### **Segnalazione Bloccata - Codice 429 (Too Many Requests)**
```javascript
// Motivo 1: Limite giornaliero superato
{
    "success": false,
    "error": "Hai raggiunto il limite giornaliero di segnalazioni (5). Riprova domani."
}

// Motivo 2: Limite settimanale superato
{
    "success": false,
    "error": "Hai raggiunto il limite settimanale di segnalazioni (20). Se hai bisogno di assistenza, contatta il supporto."
}

// Motivo 3: Segnalazione troppo frequente
{
    "success": false,
    "error": "Hai già segnalato questo utente nelle ultime 24 ore. Se hai nuove informazioni, contatta il supporto."
}
```

---

## 📊 **Logging e Monitoraggio**

### **Livelli di Log**
- **✅ INFO**: Segnalazioni create con successo
- **⚠️ WARNING**: Tentativi di abuso o utenti con molte segnalazioni
- **🚨 ERROR**: Limiti superati
- **🚫 BLOCKED**: Tentativi di spam bloccati

### **Esempi di Log**
```bash
✅ [ReportController] Segnalazione creata: user123 -> user456 (Comportamento Inappropriato)
⚠️ [ReportController] Tentativo di segnalazione troppo frequente: user123 -> user456 (ultime 24h)
🚨 [ReportController] Limite giornaliero segnalazioni superato: user123 (5 segnalazioni)
🚫 [ReportController] Tentativo di spam segnalazione: user123 -> user456 (già pendente)
```

---

## 🎯 **Strategie Anti-Spam**

### **1️⃣ Prevenzione Duplicati**
- **Controllo Pendente**: Blocca segnalazioni multiple per lo stesso utente
- **Controllo Temporale**: Impedisce segnalazioni troppo frequenti
- **Validazione Contenuto**: Verifica che i dati siano validi

### **2️⃣ Rate Limiting**
- **Limite Giornaliero**: 5 segnalazioni al giorno per utente
- **Limite Settimanale**: 20 segnalazioni a settimana per utente
- **Reset Automatico**: I contatori si azzerano automaticamente

### **3️⃣ Monitoraggio Intelligente**
- **Tracking Utenti**: Monitora utenti con troppe segnalazioni
- **Alert Amministratori**: Notifica situazioni sospette
- **Analisi Pattern**: Identifica comportamenti anomali

---

## 🔍 **Debug e Troubleshooting**

### **Verifica Configurazione**
```javascript
// Controlla che i limiti siano corretti
console.log('Limite giornaliero:', REPORT_LIMITS.DAILY_LIMIT);
console.log('Limite settimanale:', REPORT_LIMITS.WEEKLY_LIMIT);
```

### **Test Controlli**
```javascript
// Simula limite giornaliero
const testUser = 'user123';
const dailyReports = await Report.countDocuments({
    reporter: testUser,
    createdAt: { $gte: oneDayAgo }
});
console.log('Segnalazioni oggi:', dailyReports);
```

### **Monitoraggio Log**
```bash
# Filtra log per tipo
grep "🚫" logs/app.log    # Tentativi bloccati
grep "🚨" logs/app.log    # Limiti superati
grep "⚠️" logs/app.log    # Warning e attenzioni
```

---

## 🚀 **Prossimi Passi**

### **Miglioramenti Suggeriti**
1. **Machine Learning**: Analisi automatica delle segnalazioni
2. **Notifiche Admin**: Alert in tempo reale per abusi
3. **Dashboard Monitoraggio**: Interfaccia per amministratori
4. **Analytics Avanzate**: Metriche e trend delle segnalazioni

### **Integrazioni**
- **Redis**: Cache per limiti e contatori
- **Elasticsearch**: Ricerca e analisi avanzate
- **Webhook**: Notifiche esterne per eventi critici

---

## 📞 **Supporto**

Per domande o problemi:
- **Controlla i log** per errori e warning
- **Verifica la configurazione** in `reportLimits.js`
- **Testa i limiti** con l'endpoint `/my-stats`
- **Monitora le performance** del database

---

## ✅ **Benefici del Sistema**

1. **🛡️ Protezione**: Previene abusi e spam
2. **⚖️ Equità**: Limiti uguali per tutti gli utenti
3. **🔍 Trasparenza**: Messaggi chiari sui limiti
4. **📊 Monitoraggio**: Log dettagliati per amministratori
5. **🔄 Flessibilità**: Configurazione facilmente modificabile
6. **🚀 Performance**: Controlli ottimizzati e efficienti
