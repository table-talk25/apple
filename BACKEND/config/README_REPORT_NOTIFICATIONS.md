# 📧 **Sistema Notifiche Email Segnalazioni - TableTalk**

## 📋 **Panoramica**

Questo documento descrive l'implementazione del sistema di notifiche email automatiche per le segnalazioni in TableTalk. Il sistema invia notifiche immediate agli amministratori quando vengono create nuove segnalazioni, garantendo una risposta tempestiva e una moderazione efficace della piattaforma.

---

## 🎯 **Funzionalità Implementate**

### **1️⃣ Notifiche Immediate per Nuove Segnalazioni**
- **Invio Automatico**: Email inviata immediatamente quando viene creata una segnalazione
- **Destinatari**: `infotabletalk.app@gmail.com` (configurabile)
- **Contenuto**: Dettagli completi della segnalazione con priorità automatica

### **2️⃣ Sistema di Priorità Intelligente**
- **Calcolo Automatico**: Priorità basata su tipo di segnalazione e cronologia utente
- **Livelli**: Alta, Media, Bassa con colori distintivi
- **Fattori**: Contesto segnalazione, numero segnalazioni precedenti, gravità

### **3️⃣ Notifiche per Aggiornamenti di Stato**
- **Cambiamenti Stato**: Notifica quando una segnalazione cambia status
- **Tracking**: Monitoraggio completo del ciclo di vita delle segnalazioni
- **Azioni**: Link diretto alla dashboard amministrativa

### **4️⃣ Sistema di Segnalazioni Urgenti**
- **Rilevamento Pattern**: Identifica utenti con multiple segnalazioni
- **Notifiche Immediate**: Alert per situazioni che richiedono attenzione urgente
- **Raccomandazioni**: Suggerimenti per azioni amministrative

### **5️⃣ Riepilogo Giornaliero Automatico**
- **Invio Programmato**: Ogni giorno alle 09:00 (configurabile)
- **Statistiche Complete**: Conteggi per stato e periodo
- **Segnalazioni Recenti**: Lista delle ultime 10 segnalazioni

---

## 🔧 **Architettura del Sistema**

### **Componenti Principali**

#### **1. ReportNotificationService**
```javascript
// Servizio principale per la gestione delle notifiche
const reportNotificationService = require('../services/reportNotificationService');

// Metodi disponibili:
await reportNotificationService.sendNewReportNotification(report);
await reportNotificationService.sendStatusUpdateNotification(report, oldStatus, newStatus);
await reportNotificationService.sendUrgentReportNotification(reportedUser, recentReports);
await reportNotificationService.sendDailyReportSummary(date);
```

#### **2. Template Email**
- **`new-report-notification.hbs`**: Notifica nuova segnalazione
- **`report-status-update.hbs`**: Aggiornamento stato
- **`urgent-reports-notification.hbs`**: Segnalazioni urgenti
- **`daily-report-summary.hbs`**: Riepilogo giornaliero

#### **3. Job Automatico**
```javascript
// Job per riepilogo giornaliero
const dailyReportSummaryJob = require('../jobs/dailyReportSummary');

// Avvio automatico
dailyReportSummaryJob.start();

// Esecuzione manuale (per test)
await dailyReportSummaryJob.executeManualSummary();
```

---

## 📧 **Configurazione Email**

### **Variabili d'Ambiente**
```bash
# Email amministratori
ADMIN_EMAIL=infotabletalk.app@gmail.com

# URL dashboard amministrativa
ADMIN_DASHBOARD_URL=https://tabletalk.app/admin/reports

# Configurazione SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### **Configurazione Servizio**
```javascript
// BACKEND/config/reportNotificationConfig.js
const REPORT_NOTIFICATION_CONFIG = {
    EMAIL: {
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'infotabletalk.app@gmail.com',
        ADMIN_DASHBOARD_URL: process.env.ADMIN_DASHBOARD_URL || 'https://tabletalk.app/admin/reports',
        FROM_NAME: 'TableTalk - Sistema Segnalazioni',
        PRIORITY: 'high'
    },
    // ... altre configurazioni
};
```

---

## 🚨 **Sistema di Priorità**

### **Calcolo Priorità**
```javascript
// Fattori che aumentano la priorità
const priorityFactors = {
    'harassment': 3,        // Molestie
    'inappropriate': 3,     // Contenuto inappropriato
    'spam': 2,             // Spam
    'fake_profile': 2,      // Profilo falso
    'meal': 1,             // Problema pasto
    'chat': 1,             // Problema chat
    'general': 0            // Generale
};

// Soglie priorità
const thresholds = {
    HIGH: 5,    // Priorità alta
    MEDIUM: 3   // Priorità media
};
```

### **Esempi di Priorità**
- **Alta (5+)**: Molestie + profilo con segnalazioni precedenti
- **Media (3-4)**: Spam o contenuto inappropriato
- **Bassa (0-2)**: Problemi generali o segnalazioni isolate

---

## ⏰ **Scheduling e Automazione**

### **Job Automatici**
```javascript
// Riepilogo giornaliero - ogni giorno alle 09:00
cron.schedule('0 9 * * *', async () => {
    await dailyReportSummaryJob.executeDailySummary();
}, {
    timezone: 'Europe/Rome'
});
```

### **Configurazione Temporale**
```javascript
TIMING: {
    DAILY_SUMMARY: true,
    DAILY_SUMMARY_TIME: '09:00',
    TIMEZONE: 'Europe/Rome'
}
```

---

## 📊 **Tipi di Notifiche**

### **1. Nuova Segnalazione**
- **Trigger**: Creazione segnalazione nel sistema
- **Contenuto**: Dettagli completi con priorità
- **Azioni**: Link diretto alla dashboard
- **Priorità Email**: Alta

### **2. Aggiornamento Stato**
- **Trigger**: Cambio status segnalazione
- **Contenuto**: Stato precedente e nuovo
- **Azioni**: Link per revisione
- **Priorità Email**: Normale

### **3. Segnalazioni Urgenti**
- **Trigger**: Multiple segnalazioni per stesso utente
- **Contenuto**: Pattern e raccomandazioni
- **Azioni**: Intervento immediato richiesto
- **Priorità Email**: Alta

### **4. Riepilogo Giornaliero**
- **Trigger**: Orario programmato (09:00)
- **Contenuto**: Statistiche e segnalazioni recenti
- **Azioni**: Panoramica completa
- **Priorità Email**: Normale

---

## 🎨 **Template Email**

### **Design Responsivo**
- **Layout**: Ottimizzato per desktop e mobile
- **Colori**: Schema coerente con brand TableTalk
- **Icone**: Emoji per identificazione rapida
- **Azioni**: Pulsanti chiari per accesso dashboard

### **Personalizzazione**
- **Variabili Dinamiche**: Dati segnalazione in tempo reale
- **Condizionali**: Contenuto adattivo basato su dati
- **Internazionalizzazione**: Supporto multi-lingua
- **Fallback**: Gestione errori e contenuti mancanti

---

## 🔍 **Integrazione con ReportController**

### **Hook Automatico**
```javascript
// BACKEND/controllers/reportController.js
exports.createReport = asyncHandler(async (req, res, next) => {
    // ... logica esistente ...
    
    // 📧 INVIA NOTIFICA EMAIL AGLI AMMINISTRATORI
    try {
        await reportNotificationService.sendNewReportNotification(report);
        console.log('✅ Notifica email inviata per segnalazione', report._id);
    } catch (emailError) {
        // Non blocchiamo la creazione se l'email fallisce
        console.error('❌ Errore invio notifica email:', emailError);
    }
    
    // ... resto della logica ...
});
```

### **Gestione Errori**
- **Non Bloccante**: La segnalazione viene creata anche se l'email fallisce
- **Logging**: Errori email registrati per troubleshooting
- **Fallback**: Sistema robusto per garantire funzionalità

---

## 📈 **Monitoraggio e Analytics**

### **Log del Sistema**
```javascript
// Esempi di log
📧 [ReportNotification] Email inviata per segnalazione 507f1f77bcf86cd799439011
✅ [DailyReportSummary] Riepilogo giornaliero inviato con successo
📊 [DailyReportSummary] Statistiche: 15 totali, 8 in attesa, 5 risolte, 2 archiviate
```

### **Metriche Disponibili**
- **Email Inviate**: Conteggio notifiche inviate
- **Tassi di Consegna**: Successo invio email
- **Tempi di Risposta**: Latenza sistema notifiche
- **Priorità Distribuzione**: Statistiche priorità segnalazioni

---

## 🚀 **Prossimi Passi e Miglioramenti**

### **Funzionalità Suggerite**
1. **Notifiche Push**: Integrazione con sistema push esistente
2. **Webhook**: Notifiche a sistemi esterni (Slack, Discord)
3. **Dashboard Live**: Aggiornamenti real-time per amministratori
4. **Filtri Personalizzati**: Configurazione notifiche per tipo
5. **Escalation Automatica**: Notifiche a livelli superiori per casi critici

### **Ottimizzazioni Tecniche**
1. **Caching**: Memorizzazione template per performance
2. **Queue System**: Coda per email ad alto volume
3. **Retry Logic**: Tentativi automatici per email fallite
4. **Rate Limiting**: Controllo frequenza notifiche
5. **A/B Testing**: Test template per engagement

---

## 🔧 **Troubleshooting**

### **Problemi Comuni**

#### **1. Email Non Inviate**
```bash
# Verifica configurazione SMTP
echo $SMTP_HOST
echo $SMTP_USER
echo $SMTP_PASS

# Controlla log server
tail -f BACKEND/logs/server.log | grep "ReportNotification"
```

#### **2. Template Non Trovati**
```bash
# Verifica esistenza template
ls -la BACKEND/templates/email/
# Dovrebbero essere presenti:
# - new-report-notification.hbs
# - report-status-update.hbs
# - urgent-reports-notification.hbs
# - daily-report-summary.hbs
```

#### **3. Job Non Avviato**
```javascript
// Verifica stato job
const status = dailyReportSummaryJob.getStatus();
console.log('Job Status:', status);

// Avvio manuale
dailyReportSummaryJob.start();
```

### **Debug e Testing**
```javascript
// Test invio email manuale
const testReport = await Report.findById('reportId');
await reportNotificationService.sendNewReportNotification(testReport);

// Test riepilogo giornaliero
await dailyReportSummaryJob.executeManualSummary();
```

---

## 📞 **Supporto e Manutenzione**

### **Contatti**
- **Team Tecnico**: Per problemi tecnici e configurazione
- **Team Moderazione**: Per richieste funzionali
- **Documentazione**: Questo file e README correlati

### **Manutenzione Regolare**
- **Monitoraggio Log**: Controllo errori e performance
- **Aggiornamento Template**: Miglioramenti design e contenuto
- **Configurazione**: Aggiornamento parametri e orari
- **Backup**: Salvataggio configurazioni e template

---

## ✅ **Risultato Finale**

Il sistema di notifiche email per le segnalazioni è ora **completamente implementato** e fornisce:

- ✅ **Notifiche Immediate** per nuove segnalazioni
- ✅ **Sistema di Priorità** intelligente e automatico
- ✅ **Notifiche Urgenti** per pattern problematici
- ✅ **Riepilogo Giornaliero** programmato automaticamente
- ✅ **Template Professionali** e responsive
- ✅ **Integrazione Completa** con sistema segnalazioni esistente
- ✅ **Gestione Errori** robusta e non bloccante
- ✅ **Configurazione Flessibile** per diversi ambienti

**"Gli amministratori ricevono notifiche immediate per ogni nuova segnalazione"** - Questo sistema garantisce una moderazione tempestiva e una risposta rapida ai problemi della piattaforma, migliorando significativamente la sicurezza e la qualità dell'esperienza utente! 🚨📧✨
