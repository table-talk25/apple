# 📊 Sistema di Analytics

## Panoramica

Il sistema di analytics permette di tracciare e analizzare l'attività degli utenti, gli eventi dei pasti e l'utilizzo dell'applicazione per fornire insights dettagliati.

## Modello Analytics

### Schema del Database

```javascript
const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user_action', 'meal_event', 'app_usage'],
    required: true
  },
  event: {
    type: String,
    required: true // 'meal_created', 'user_joined', 'meal_completed', etc.
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  mealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meal'
  },
  data: {
    type: mongoose.Schema.Types.Mixed // Dati specifici evento
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number] // [longitude, latitude]
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});
```

### Campi del Modello

- **`type`** - Tipo di evento: `user_action`, `meal_event`, `app_usage`
- **`event`** - Nome specifico dell'evento (es. `meal_created`, `user_joined`)
- **`userId`** - ID dell'utente che ha generato l'evento
- **`mealId`** - ID del pasto (se applicabile)
- **`data`** - Dati aggiuntivi specifici per l'evento
- **`location`** - Posizione geografica dell'evento (GeoJSON Point)
- **`timestamp`** - Data e ora dell'evento

## API Endpoints

### 1. Dashboard Analytics

**GET** `/api/analytics/dashboard?range=week`

```javascript
// Response
[
  {
    "event": "meal_created",
    "count": 45,
    "uniqueUsers": 23
  },
  {
    "event": "user_joined",
    "count": 128,
    "uniqueUsers": 67
  }
]
```

### 2. Statistiche Geografiche

**GET** `/api/analytics/geo?lat=45.4642&lng=9.1900&radius=50`

```javascript
// Response
[
  {
    "_id": "meal_created",
    "count": 12,
    "avgDistance": 2500.5
  }
]
```

### 3. Attività Utente

**GET** `/api/analytics/user/:userId?range=week`

```javascript
// Response
[
  {
    "event": "meal_created",
    "count": 3,
    "lastActivity": "2024-01-20T10:30:00.000Z"
  }
]
```

### 4. Analytics Pasto

**GET** `/api/analytics/meal/:mealId`

```javascript
// Response
[
  {
    "event": "meal_viewed",
    "count": 15,
    "uniqueUsers": 8
  }
]
```

### 5. Eventi Popolari

**GET** `/api/analytics/popular?range=week&limit=10`

```javascript
// Response
[
  {
    "event": "meal_created",
    "count": 45,
    "uniqueUsers": 23
  }
]
```

### 6. Traccia Evento

**POST** `/api/analytics/track`

```javascript
// Request Body
{
  "type": "user_action",
  "event": "app_opened",
  "data": {
    "platform": "mobile",
    "version": "1.1.9"
  }
}

// Response
{
  "success": true,
  "message": "Evento tracciato con successo"
}
```

## Tipi di Eventi

### Eventi Utente (`user_action`)
- `app_opened` - App aperta
- `profile_updated` - Profilo aggiornato
- `search_performed` - Ricerca effettuata
- `location_shared` - Posizione condivisa
- `user_registered` - Nuovo utente registrato

### Eventi Pasto (`meal_event`)
- `meal_created` - Pasto creato
- `meal_joined` - Partecipazione a pasto
- `meal_completed` - Pasto completato
- `meal_cancelled` - Pasto cancellato
- `meal_viewed` - Pasto visualizzato
- `message_sent` - Messaggio inviato nel chat

### Eventi App (`app_usage`)
- `feature_used` - Funzionalità utilizzata
- `error_occurred` - Errore verificato
- `performance_metric` - Metrica di performance

## Servizio AnalyticsService

### Metodi Principali

```javascript
// Traccia evento
await AnalyticsService.trackEvent(type, event, data);

// Ottieni statistiche dashboard
await AnalyticsService.getDashboardStats(timeRange);

// Ottieni statistiche geografiche
await AnalyticsService.getGeoStats(centerPoint, radiusKm);

// Ottieni attività utente
await AnalyticsService.getUserActivity(userId, timeRange);

// Ottieni analytics pasto
await AnalyticsService.getMealAnalytics(mealId);

// Ottieni eventi popolari
await AnalyticsService.getPopularEvents(timeRange, limit);
```

## Integrazione Frontend

### Componente AnalyticsDashboard

```javascript
import AnalyticsDashboard from '../components/Analytics/AnalyticsDashboard';

// Utilizzo
<AnalyticsDashboard />
```

### Tracciamento Eventi

```javascript
// Traccia evento semplice
const trackEvent = async (type, event, data) => {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type, event, data })
    });
  } catch (error) {
    console.error('Errore tracking:', error);
  }
};

// Esempi di utilizzo
trackEvent('user_action', 'app_opened');
trackEvent('meal_event', 'meal_viewed', { mealId: '123' });
```

## Integrazione Backend

### Tracciamento Automatico

```javascript
// Nel controller dei pasti
exports.createMeal = asyncHandler(async (req, res, next) => {
  // ... logica creazione pasto
  
  // Traccia evento
  await AnalyticsService.trackEvent('meal_event', 'meal_created', {
    userId: req.user.id,
    mealId: meal._id,
    additionalData: {
      mealType: meal.mealType,
      participants: meal.participants.length
    }
  });
  
  res.status(201).json({ success: true, data: meal });
});
```

### Middleware di Tracciamento

```javascript
// Middleware per tracciare automaticamente le azioni
const trackAction = (event) => {
  return (req, res, next) => {
    // Traccia dopo la risposta
    res.on('finish', async () => {
      if (res.statusCode < 400) {
        await AnalyticsService.trackEvent('user_action', event, {
          userId: req.user?.id,
          additionalData: {
            method: req.method,
            path: req.path,
            timestamp: new Date()
          }
        });
      }
    });
    next();
  };
};
```

## Dashboard Analytics

### Funzionalità

- **Selettore periodo**: Giorno, Settimana, Mese
- **Statistiche eventi**: Conteggi e utenti unici
- **Visualizzazione griglia**: Cards responsive
- **Riepilogo**: Statistiche aggregate
- **Gestione errori**: UI per errori di caricamento

### Design

- **Colori**: Tema TableTalk® (#FF6B35)
- **Layout**: Grid responsive
- **Interazioni**: Hover effects
- **Loading states**: Indicatori di caricamento
- **Error handling**: Messaggi di errore user-friendly

## Sicurezza

### Autorizzazioni

- **Dashboard**: Solo admin
- **Statistiche geografiche**: Solo admin
- **Attività utente**: Proprio utente o admin
- **Analytics pasto**: Partecipanti o admin
- **Tracciamento**: Tutti gli utenti autenticati

### Privacy

- **Dati personali**: Non tracciati nei dati aggiuntivi
- **Posizioni**: Solo coordinate, non indirizzi
- **Retention**: Configurabile (default: 1 anno)

## Performance

### Ottimizzazioni

- **Indici**: Su timestamp, tipo, evento, location
- **Aggregazioni**: Pipeline MongoDB ottimizzate
- **Caching**: Statistiche frequenti in cache
- **Batch processing**: Tracciamento in batch per performance

### Limitazioni

- **Rate limiting**: Max 100 eventi/minuto per utente
- **Dimensione dati**: Max 1KB per evento
- **Retention**: Cleanup automatico dopo 1 anno

## Esempi di Utilizzo

Vedi il file `BACKEND/examples/analyticsExamples.js` per esempi completi:

- `trackUserAction()` - Traccia azione utente
- `trackMealEvent()` - Traccia evento pasto
- `trackLocationEvent()` - Traccia evento con posizione
- `getDashboardData()` - Ottieni dati dashboard
- `getGeographicStats()` - Ottieni statistiche geografiche
- `getUserStats()` - Ottieni statistiche utente
- `getMealStats()` - Ottieni statistiche pasto
- `trackCommonEvents()` - Traccia eventi comuni
- `performCompleteAnalysis()` - Analisi completa
- `trackChatEvent()` - Traccia evento chat
- `trackSearchEvent()` - Traccia ricerca

## Troubleshooting

### Problemi Comuni:

1. **Eventi non tracciati**
   - Verifica autorizzazione utente
   - Controlla formato dati
   - Verifica connessione database

2. **Statistiche mancanti**
   - Verifica periodo selezionato
   - Controlla filtri applicati
   - Verifica indici database

3. **Performance lenta**
   - Ottimizza query aggregazione
   - Implementa caching
   - Riduci periodo di analisi

4. **Errori geografici**
   - Verifica formato coordinate
   - Controlla indici geospaziali
   - Valida raggio di ricerca
