# 🕐 **Logica Temporale Videochiamate - Frontend MealDetailPage**

## 📋 **Panoramica**

Questo documento descrive l'implementazione della logica temporale per le videochiamate nel componente `MealDetailPage`, che garantisce che il pulsante "Partecipa alla Videochiamata" sia visibile solo quando la videochiamata è effettivamente accessibile.

---

## 🎯 **Funzionalità Implementate**

### **1️⃣ Controllo Temporale Intelligente**
- **Accesso Precoce**: Videochiamata accessibile solo 10 minuti prima dell'inizio
- **Aggiornamento Automatico**: Controllo ogni 30 secondi senza ricaricare la pagina
- **Gestione Fine Pasto**: Accesso fino alla fine del pasto (durata + startTime)

### **2️⃣ Esperienza Utente Migliorata**
- **Pulsante Condizionale**: Mostra il pulsante solo quando è utilizzabile
- **Messaggio Informativo**: Spiega chiaramente quando la videochiamata sarà disponibile
- **Aggiornamento Real-time**: L'interfaccia si aggiorna automaticamente

### **3️⃣ Sicurezza Frontend**
- **Validazione UI**: Controlli lato client per una migliore UX
- **Sincronizzazione Backend**: Logica coerente con i controlli del server
- **Prevenzione Confusione**: Evita che l'utente clicchi su pulsanti non funzionanti

---

## 🔧 **Implementazione Tecnica**

### **Stato del Componente**
```javascript
const [canJoinCall, setCanJoinCall] = useState(false);
```

### **useEffect per Controllo Temporale**
```javascript
useEffect(() => {
    if (meal && meal.date) {
        const checkCallAvailability = () => {
            const now = new Date();
            const mealStartTime = new Date(meal.date);
            const tenMinutesBefore = new Date(mealStartTime.getTime() - 10 * 60 * 1000);
            
            // La chiamata è accessibile da 10 minuti prima fino alla fine del pasto
            const mealEndTime = new Date(mealStartTime.getTime() + (meal.duration || 0) * 60 * 1000);

            if (now >= tenMinutesBefore && now <= mealEndTime) {
                setCanJoinCall(true);
            } else {
                setCanJoinCall(false);
            }
        };

        // Controlla subito e poi ogni 30 secondi
        checkCallAvailability();
        const interval = setInterval(checkCallAvailability, 30000);

        return () => clearInterval(interval); // Pulisce l'intervallo quando il componente viene smontato
    }
}, [meal]); // Esegui questo effetto quando i dati del pasto cambiano
```

### **Rendering Condizionale**
```javascript
{/* Videochiamata: mostra pulsante solo quando disponibile */}
{isVirtual && (isParticipant || isHost) && (
    <>
        {canJoinCall ? (
            <Button 
                variant="danger" 
                size="lg" 
                onClick={() => navigate(`/meals/${id}/video`)}
                className={styles.chatButton}
            >
                <FaVideo /> {t('meals.detail.joinVideo')}
            </Button>
        ) : (
            <div className={styles.callUnavailableMessage}>
                <p className={styles.callUnavailableText}>
                    {t('meals.detail.callUnavailable')}
                </p>
            </div>
        )}
    </>
)}
```

---

## ⏰ **Logica Temporale Dettagliata**

### **Calcolo Tempo di Accesso**
```javascript
const now = new Date();
const mealStartTime = new Date(meal.date);
const tenMinutesBefore = new Date(mealStartTime.getTime() - 10 * 60 * 1000);
const mealEndTime = new Date(mealStartTime.getTime() + (meal.duration || 0) * 60 * 1000);
```

### **Condizioni di Accesso**
- **`now >= tenMinutesBefore`**: Almeno 10 minuti prima dell'inizio
- **`now <= mealEndTime`**: Non oltre la fine del pasto
- **`canJoinCall = true`**: Se entrambe le condizioni sono soddisfatte

### **Esempio Pratico**
- **Pasto inizia**: 20:00
- **Durata**: 60 minuti
- **Fine pasto**: 21:00
- **Accesso videochiamata**: 19:50 - 21:00
- **Blocco accesso**: Prima delle 19:50

---

## 🎨 **Stili CSS**

### **Messaggio Videochiamata Non Disponibile**
```css
.callUnavailableMessage {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 1rem;
    margin: 0.5rem 0;
    text-align: center;
}

.callUnavailableText {
    margin: 0;
    color: #6c757d;
    font-size: 0.95rem;
    font-style: italic;
}
```

---

## 🌐 **Internazionalizzazione**

### **Traduzione Italiana**
```json
{
  "meals": {
    "detail": {
      "callUnavailable": "Potrai accedere alla videochiamata 10 minuti prima dell'inizio."
    }
  }
}
```

### **Utilizzo nel Componente**
```javascript
{t('meals.detail.callUnavailable', { 
    defaultValue: 'Potrai accedere alla videochiamata 10 minuti prima dell\'inizio.' 
})}
```

---

## 🔄 **Aggiornamento Automatico**

### **Intervallo di Controllo**
- **Frequenza**: Ogni 30 secondi (30000 ms)
- **Pulizia**: `clearInterval` quando il componente si smonta
- **Performance**: Controllo leggero che non impatta le performance

### **Gestione Memoria**
```javascript
return () => clearInterval(interval); // Pulisce l'intervallo quando il componente viene smontato
```

---

## 🎯 **Benefici dell'Implementazione**

### **1️⃣ Esperienza Utente**
- **Chiarezza**: L'utente sa esattamente quando può accedere
- **Feedback Immediato**: Aggiornamento automatico dell'interfaccia
- **Prevenzione Errori**: Evita click su pulsanti non funzionanti

### **2️⃣ Sicurezza**
- **Validazione Frontend**: Controlli lato client per UX
- **Sincronizzazione Backend**: Logica coerente con il server
- **Doppia Protezione**: Frontend + Backend per massima sicurezza

### **3️⃣ Manutenibilità**
- **Codice Pulito**: Logica separata e ben organizzata
- **Configurabilità**: Facile modificare i parametri temporali
- **Debugging**: Log chiari per troubleshooting

---

## 🔍 **Debug e Troubleshooting**

### **Verifica Stato Temporale**
```javascript
// Aggiungi questi log per debugging
console.log('Ora:', now);
console.log('Inizio pasto:', mealStartTime);
console.log('10 minuti prima:', tenMinutesBefore);
console.log('Fine pasto:', mealEndTime);
console.log('Può accedere:', canJoinCall);
```

### **Test Controlli Temporali**
```javascript
// Simula diversi orari per testare la logica
const testNow = new Date('2024-01-01T19:45:00Z'); // 15 minuti prima
const testMealStart = new Date('2024-01-01T20:00:00Z');
const testTenMinutesBefore = new Date(testMealStart.getTime() - 10 * 60 * 1000);

console.log('Test accesso:', testNow >= testTenMinutesBefore); // false
```

---

## 🚀 **Prossimi Passi**

### **Miglioramenti Suggeriti**
1. **Countdown Timer**: Mostra tempo rimanente prima dell'accesso
2. **Notifiche Push**: Avvisa quando la videochiamata diventa disponibile
3. **Stati Intermedi**: Mostra "presto disponibile" con countdown
4. **Personalizzazione**: Permetti all'host di modificare l'intervallo

### **Integrazioni**
- **WebSocket**: Aggiornamenti real-time senza polling
- **Service Worker**: Controlli offline e notifiche
- **Analytics**: Traccia tentativi di accesso e timing

---

## 📞 **Supporto**

Per domande o problemi:
- **Controlla i log** per errori temporali
- **Verifica le traduzioni** per messaggi mancanti
- **Testa con diversi orari** per verificare la logica
- **Monitora le performance** dell'intervallo

---

## ✅ **Risultato Finale**

La logica temporale per le videochiamate è ora **completamente implementata** nel frontend e:

- **Mostra il pulsante** solo quando è effettivamente utilizzabile
- **Fornisce messaggi chiari** all'utente sul timing
- **Si aggiorna automaticamente** ogni 30 secondi
- **Sincronizza perfettamente** con i controlli backend
- **Migliora l'esperienza utente** prevenendo confusione

**"Potrai accedere alla videochiamata 10 minuti prima dell'inizio"** - Questo messaggio informativo chiarisce all'utente quando la funzionalità sarà disponibile, migliorando significativamente l'usabilità dell'app! 🕐✨
