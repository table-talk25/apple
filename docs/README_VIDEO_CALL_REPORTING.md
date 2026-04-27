# 🚨 **Segnalazione Utenti in Videochiamata - TableTalk**

## 📋 **Panoramica**

Questo documento descrive l'implementazione della funzionalità di segnalazione utenti direttamente dall'interfaccia della videochiamata. Questa funzionalità è fondamentale per la sicurezza della piattaforma, permettendo agli utenti di segnalare comportamenti problematici in tempo reale.

---

## 🎯 **Funzionalità Implementate**

### **1️⃣ Segnalazione Diretta in Videochiamata**
- **Accesso Immediato**: Pulsante di segnalazione per ogni partecipante
- **Contesto Specifico**: Segnalazione associata al pasto specifico
- **Interfaccia Intuitiva**: Menu a tre puntini con opzione segnalazione

### **2️⃣ Componente ParticipantList**
- **Lista Partecipanti**: Visualizzazione chiara di tutti i partecipanti
- **Identificazione Utente**: Badge "Tu" per l'utente corrente
- **Azioni per Partecipante**: Menu dropdown con opzioni disponibili

### **3️⃣ Integrazione ReportModal**
- **Supporto MealId**: Campo aggiuntivo per contesto pasto
- **Contesto Videochiamata**: Nuovo tipo di segnalazione
- **Dati Completi**: Informazioni complete per moderazione

### **4️⃣ Backend Aggiornato**
- **Campo Meal**: Supporto per associazione segnalazione-pasto
- **Contesto Video_call**: Nuovo tipo di segnalazione
- **Notifiche Email**: Sistema aggiornato per videochiamate

---

## 🔧 **Architettura dell'Implementazione**

### **Componenti Frontend**

#### **1. VideoCallPage (Principale)**
```javascript
// Stati per gestione segnalazioni
const [showReportModal, setShowReportModal] = useState(false);
const [userToReport, setUserToReport] = useState(null);

// Funzioni per gestione segnalazioni
const handleReportUser = (participant) => {
    setUserToReport(participant);
    setShowReportModal(true);
};

const handleCloseReportModal = () => {
    setShowReportModal(false);
    setUserToReport(null);
};
```

#### **2. ParticipantList (Nuovo Componente)**
```javascript
const ParticipantList = ({ participants, currentUser, onReportUser }) => {
    // Renderizza lista partecipanti con menu di azioni
    // Ogni partecipante ha un dropdown con opzione segnalazione
    // Esclude l'utente corrente dalle azioni disponibili
};
```

#### **3. ReportModal (Aggiornato)**
```javascript
const ReportModal = ({ show, onHide, reportedUser, context = 'general', mealId = null }) => {
    // Supporta mealId per contesto pasto
    // Invia dati completi al backend
    // Gestisce contesto video_call
};
```

### **Modifiche Backend**

#### **1. Modello Report Aggiornato**
```javascript
// Nuovo campo meal per associazione pasto
meal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal' },

// Nuovo contesto video_call
context: { type: String, enum: ['chat', 'profile', 'meal', 'video_call', 'general'] }
```

#### **2. ReportController Aggiornato**
```javascript
// Gestione campo meal nella creazione segnalazione
const reportData = {
    reporter: reporterId,
    reportedUser: reportedUserId,
    reason,
    details,
    context: context || 'general'
};

// Aggiungi meal se fornito
if (req.body.meal) {
    reportData.meal = req.body.meal;
}
```

#### **3. Servizio Notifiche Aggiornato**
```javascript
// Supporto contesto video_call
getContextDisplayName(context) {
    const contextNames = {
        // ... altri contesti ...
        'video_call': 'Problema in Videochiamata'
    };
    return contextNames[context] || context;
}
```

---

## 🎨 **Interfaccia Utente**

### **Design della Lista Partecipanti**
- **Posizionamento**: Angolo superiore destro della videochiamata
- **Stile**: Sfondo semi-trasparente con blur effect
- **Responsive**: Adattamento automatico per dispositivi mobili

### **Menu di Azioni**
- **Icona**: Tre puntini verticali (FaEllipsisV)
- **Dropdown**: Menu contestuale per ogni partecipante
- **Opzioni**: Segnala Utente con icona bandiera

### **Badge e Identificazione**
- **Avatar**: Iniziale del nome in cerchio colorato
- **Badge "Tu"**: Identificazione chiara dell'utente corrente
- **Stati**: Indicatori visivi per partecipanti attivi

---

## 📱 **Responsive Design**

### **Desktop (>= 768px)**
- **Posizione**: Angolo superiore destro fisso
- **Dimensioni**: Larghezza minima 280px
- **Altezza**: Massima 400px con scroll

### **Mobile (< 768px)**
- **Posizione**: Fissa in alto con margini laterali
- **Dimensioni**: Adattamento automatico alla larghezza
- **Altezza**: Ridotta a 300px per ottimizzazione

---

## 🔍 **Flusso di Segnalazione**

### **1. Rilevamento Comportamento Problematico**
```
Utente osserva comportamento inappropriato durante videochiamata
↓
Clicca sui tre puntini accanto al nome del partecipante
↓
Seleziona "Segnala Utente" dal menu dropdown
```

### **2. Apertura Modale Segnalazione**
```
ReportModal si apre con:
- Nome utente da segnalare
- Contesto "video_call" pre-selezionato
- Campo mealId pre-compilato
- Opzioni motivo personalizzate
```

### **3. Invio Segnalazione**
```
Utente compila:
- Motivo della segnalazione
- Dettagli aggiuntivi (opzionale)
↓
Clicca "Invia Segnalazione"
↓
Dati inviati al backend con mealId
```

### **4. Elaborazione Backend**
```
Backend riceve:
- reportedUserId
- reason
- details
- context: "video_call"
- meal: mealId
↓
Crea segnalazione nel database
↓
Invia notifica email agli amministratori
```

---

## 📧 **Sistema di Notifiche**

### **Notifiche Email Aggiornate**
- **Contesto Videochiamata**: Identificazione chiara del tipo
- **Associazione Pasto**: Link diretto al pasto specifico
- **Priorità Automatica**: Calcolo basato su contesto e cronologia

### **Template Email**
- **Nuove Segnalazioni**: Dettagli completi con priorità
- **Contesto Specifico**: Evidenziazione problema in videochiamata
- **Azioni Amministrative**: Link diretti per intervento

---

## 🚨 **Sicurezza e Moderazione**

### **Prevenzione Abuso**
- **Controlli Anti-Spam**: Sistema esistente per segnalazioni duplicate
- **Validazione Contesto**: Verifica che mealId sia valido
- **Rate Limiting**: Limiti per numero segnalazioni per utente

### **Tracciabilità**
- **Associazione Pasto**: Ogni segnalazione collegata al pasto specifico
- **Timestamp**: Data e ora precise della segnalazione
- **Contesto Completo**: Informazioni complete per moderazione

---

## 🌐 **Internazionalizzazione**

### **Nuove Traduzioni Aggiunte**
```json
{
  "videoCall": {
    "participants": "Partecipanti",
    "noParticipants": "Nessun partecipante presente",
    "you": "Tu",
    "reportUser": "Segnala Utente"
  },
  "report": {
    "reasons": {
      "video_call": "Problema in Videochiamata"
    }
  }
}
```

### **Supporto Multi-Lingua**
- **Italiano**: Traduzioni complete implementate
- **Estensibilità**: Struttura pronta per altre lingue
- **Fallback**: Gestione automatica traduzioni mancanti

---

## 🔧 **Configurazione e Personalizzazione**

### **Variabili d'Ambiente**
```bash
# Configurazione email amministratori
ADMIN_EMAIL=infotabletalk.app@gmail.com

# URL dashboard amministrativa
ADMIN_DASHBOARD_URL=https://tabletalk.app/admin/reports
```

### **Configurazione Priorità**
```javascript
// Priorità per contesto video_call
VIDEO_CALL_ISSUE: 1,  // Punteggio base per problemi in videochiamata

// Soglie priorità
HIGH: 5,    // Priorità alta
MEDIUM: 3   // Priorità media
```

---

## 📊 **Monitoraggio e Analytics**

### **Metriche Disponibili**
- **Segnalazioni Videochiamata**: Conteggio per tipo
- **Tempi di Risposta**: Latenza sistema moderazione
- **Pattern Comportamentali**: Identificazione utenti problematici

### **Log del Sistema**
```javascript
// Esempi di log implementati
📧 [ReportNotification] Email inviata per segnalazione video_call
✅ [VideoCall] Segnalazione utente creata con successo
🚨 [VideoCall] Nuova segnalazione per comportamento inappropriato
```

---

## 🚀 **Prossimi Passi e Miglioramenti**

### **Funzionalità Suggerite**
1. **Screenshot Automatici**: Cattura momenti problematici
2. **Segnalazioni in Tempo Reale**: Notifiche immediate agli host
3. **Sistema di Warning**: Avvisi automatici per comportamenti sospetti
4. **Moderazione Automatica**: Bot per interventi immediati

### **Integrazioni Future**
1. **AI Moderation**: Rilevamento automatico comportamenti problematici
2. **Webhook**: Notifiche a sistemi esterni (Slack, Discord)
3. **Dashboard Live**: Monitoraggio real-time videochiamate
4. **Analytics Avanzati**: Pattern comportamentali e trend

---

## 🔧 **Troubleshooting**

### **Problemi Comuni**

#### **1. Pulsante Segnalazione Non Visibile**
```javascript
// Verifica che l'utente non sia se stesso
{participant.identity !== currentUser?.nickname && (
    <Dropdown className={styles.participantActions}>
        // Menu segnalazione
    </Dropdown>
)}
```

#### **2. Modale Non Si Apre**
```javascript
// Verifica stati e funzioni
const [showReportModal, setShowReportModal] = useState(false);
const [userToReport, setUserToReport] = useState(null);

const handleReportUser = (participant) => {
    setUserToReport(participant);
    setShowReportModal(true);
};
```

#### **3. Segnalazione Non Inviata**
```javascript
// Verifica dati inviati al backend
const reportData = {
    reportedUserId: userToReport.identity,
    reason: formData.reason,
    details: formData.details,
    context: 'video_call',
    meal: roomName
};
```

### **Debug e Testing**
```javascript
// Test componente ParticipantList
<ParticipantList 
    participants={mockParticipants}
    currentUser={mockUser}
    onReportUser={console.log}
/>

// Test modale segnalazione
<ReportModal
    show={true}
    onHide={() => {}}
    reportedUser={mockUser}
    context="video_call"
    mealId="test-meal-id"
/>
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
- **Configurazione**: Aggiornamento parametri e priorità
- **Backup**: Salvataggio configurazioni e template

---

## ✅ **Risultato Finale**

La funzionalità di **segnalazione utenti in videochiamata è ora completamente implementata** e fornisce:

- ✅ **Segnalazione Diretta** per comportamenti problematici in tempo reale
- ✅ **Contesto Completo** con associazione pasto e tipo videochiamata
- ✅ **Interfaccia Intuitiva** con menu dropdown per ogni partecipante
- ✅ **Backend Aggiornato** per supportare nuovi tipi di segnalazione
- ✅ **Sistema Notifiche** integrato per moderazione tempestiva
- ✅ **Design Responsivo** ottimizzato per desktop e mobile
- ✅ **Internazionalizzazione** completa con traduzioni italiane
- ✅ **Sicurezza** con controlli anti-spam e validazione dati

**"Gli utenti possono segnalare comportamenti problematici direttamente durante la videochiamata"** - Questa funzionalità garantisce una moderazione efficace e tempestiva, migliorando significativamente la sicurezza e la qualità dell'esperienza TableTalk! 🚨📹✨
