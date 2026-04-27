# 🤖 Sistema AI per Raccomandazioni TableTalk®

## Panoramica

Il sistema AI di TableTalk® utilizza algoritmi di machine learning per fornire raccomandazioni personalizzate di pasti basate sulle preferenze dell'utente, posizione geografica e comportamento storico.

## Architettura

### Backend

#### 1. SmartAIRecommendationService (`services/aiRecommendationService.js`)
- **Algoritmo di scoring personalizzato** che considera:
  - Preferenze culinarie (cucina italiana, asiatica, etc.)
  - Orari preferiti (colazione, pranzo, cena)
  - Budget (costo stimato)
  - Fattori sociali (dimensione gruppo, età partecipanti)
  - Distanza geografica (formula di Haversine)
  - Novità e popolarità

#### 2. AI Controller (`controllers/aiController.js`)
- `getPersonalizedRecommendations()` - Genera raccomandazioni AI
- `getUserPreferences()` - Recupera preferenze utente
- `createUserPreferences()` - Crea preferenze iniziali
- `updateUserPreferences()` - Aggiorna preferenze esistenti

#### 3. Modelli Database
- **UserPreference** - Preferenze personalizzate utente
- **Analytics** - Tracking comportamentale per migliorare AI

### Frontend

#### 1. AIRecommendationsSimple (`components/AI/AIRecommendationsSimple.jsx`)
- Componente per visualizzare raccomandazioni AI
- Mostra score di compatibilità e motivazioni
- Integrazione con geolocalizzazione

#### 2. AIRecommendationsSection (`pages/Home/AIRecommendationsSection.jsx`)
- Sezione principale per raccomandazioni nella HomePage
- UI moderna con preview e generazione on-demand
- Gestione errori geolocalizzazione

## API Endpoints

### Raccomandazioni AI
```http
GET /api/ai/recommendations?latitude=45.4642&longitude=9.1900&limit=6
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "_id": "meal_id",
      "title": "Pranzo Italiano",
      "aiCompatibility": 95,
      "aiRank": 1,
      "aiReason": "Perfetto per le tue preferenze culinarie italiane",
      "aiFactors": {
        "cuisine": 0.9,
        "time": 0.8,
        "price": 0.7,
        "social": 0.6,
        "distance": 0.5,
        "novelty": 0.3,
        "popularity": 0.4
      }
    }
  ]
}
```

### Preferenze Utente
```http
GET /api/ai/preferences
POST /api/ai/preferences
POST /api/ai/preferences/update
Authorization: Bearer <token>
```

## Algoritmo di Scoring

### Formula di Compatibilità
```javascript
const compatibilityScore = (
  cuisineScore * 0.25 +
  timeScore * 0.20 +
  priceScore * 0.15 +
  socialScore * 0.15 +
  distanceScore * 0.10 +
  noveltyScore * 0.10 +
  popularityScore * 0.05
) * 100;
```

### Fattori di Scoring

1. **Cucina (25%)** - Corrispondenza con preferenze culinarie
2. **Orario (20%)** - Allineamento con orari preferiti
3. **Prezzo (15%)** - Compatibilità con budget
4. **Sociale (15%)** - Dimensione gruppo e dinamiche sociali
5. **Distanza (10%)** - Prossimità geografica
6. **Novità (10%)** - Varietà nelle raccomandazioni
7. **Popolarità (5%)** - Successo storico del ristorante

## Configurazione

### Variabili d'Ambiente
```env
# AI Configuration
AI_RECOMMENDATION_LIMIT=6
AI_DEFAULT_RADIUS_KM=50
AI_MIN_COMPATIBILITY_SCORE=60
```

### Dipendenze
```json
{
  "dependencies": {
    "mongoose": "^7.0.0",
    "express": "^4.18.0"
  }
}
```

## Utilizzo

### 1. Backend - Generare Raccomandazioni
```javascript
const aiService = require('./services/aiRecommendationService');

const recommendations = await aiService.getPersonalizedRecommendations(
  userId,
  { latitude: 45.4642, longitude: 9.1900 },
  6
);
```

### 2. Frontend - Mostrare Raccomandazioni
```jsx
import AIRecommendationsSection from './pages/Home/AIRecommendationsSection';

<AIRecommendationsSection />
```

### 3. Aggiornare Preferenze Utente
```javascript
const response = await fetch('/api/ai/preferences/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    cuisinePreferences: ['italian', 'mediterranean'],
    preferredTimes: ['lunch', 'dinner'],
    budgetRange: { min: 20, max: 50 }
  })
});
```

## Test

### Test API
```bash
# Test senza autenticazione (dovrebbe fallire)
curl -X GET "http://localhost:5001/api/ai/recommendations?latitude=45.4642&longitude=9.1900&limit=3"

# Test con autenticazione
curl -X GET "http://localhost:5001/api/ai/recommendations?latitude=45.4642&longitude=9.1900&limit=3" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Script
```bash
cd BACKEND
node test-ai-api.js
```

## Roadmap

### Fase 1 ✅ (Completata)
- [x] Algoritmo di scoring base
- [x] API backend per raccomandazioni
- [x] Componenti frontend base
- [x] Integrazione geolocalizzazione

### Fase 2 🔄 (In corso)
- [ ] Integrazione nella HomePage
- [ ] Gestione preferenze utente avanzata
- [ ] Test con utenti reali

### Fase 3 📋 (Pianificata)
- [ ] Machine Learning avanzato
- [ ] Analisi comportamentale
- [ ] Raccomandazioni in tempo reale
- [ ] A/B testing per ottimizzazione

## Troubleshooting

### Errori Comuni

1. **"Non autorizzato. Token mancante"**
   - Verifica che l'utente sia autenticato
   - Controlla che il token JWT sia valido

2. **"Nessuna raccomandazione disponibile"**
   - Verifica che ci siano pasti nelle vicinanze
   - Controlla le preferenze utente

3. **"Errore geolocalizzazione"**
   - Verifica i permessi del browser
   - Controlla la connessione internet

### Debug
```javascript
// Abilita logging dettagliato
console.log('AI Debug:', {
  userLocation,
  preferences,
  nearbyMeals: meals.length,
  recommendations: recommendations.length
});
```

## Contributi

Per contribuire al sistema AI:
1. Modifica l'algoritmo di scoring in `aiRecommendationService.js`
2. Aggiungi nuovi fattori di compatibilità
3. Migliora l'UI dei componenti frontend
4. Aggiungi test per nuove funzionalità

---

**Sviluppato per TableTalk® - Connettere le persone attraverso il cibo** 🍽️
