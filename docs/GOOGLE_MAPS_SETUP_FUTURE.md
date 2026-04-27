# Configurazione Google Maps per TableTalk - Guida Futura

## Problema Risolto

L'errore `API key not found` per Google Maps è stato risolto temporaneamente disabilitando i componenti mappa. L'app ora funziona correttamente mostrando messaggi informativi invece di crashare.

## Per Abilitare Google Maps in Futuro

### 1. Ottenere una Chiave API Google Maps

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o usa uno esistente
3. Abilita le seguenti API:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
4. Crea credenziali (chiave API)
5. Restringi la chiave API per sicurezza (solo per il tuo dominio)

### 2. Configurare la Chiave API

1. **Crea un file `.env` nella directory `FRONTEND/client/`:**
   ```bash
   REACT_APP_GOOGLE_MAPS_API_KEY=la_tua_chiave_api_qui
   ```

2. **Oppure usa variabili d'ambiente del sistema:**
   ```bash
   export REACT_APP_GOOGLE_MAPS_API_KEY="la_tua_chiave_api_qui"
   ```

### 3. Riabilitare Google Maps

1. **Reinstalla il plugin:**
   ```bash
   npm install @capacitor/google-maps
   ```

2. **Modifica `capacitor.config.js`:**
   ```javascript
   plugins: {
     GoogleMaps: {
       apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || ''
     },
     // ... altri plugin
   }
   ```

3. **Modifica `src/config/capacitorConfig.js`:**
   ```javascript
   plugins: {
     GoogleMaps: {
       apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || ''
     },
     // ... altri plugin
   }
   ```

4. **Riabilita i componenti mappa:**
   - Rimuovi i commenti da `MapView.js`
   - Rimuovi i commenti da `LocationPicker.js`
   - Rimuovi i commenti da `PlacesAutocompleteInput.js`

5. **Ricostruisci l'app:**
   ```bash
   npm run build
   npx cap sync android
   cd android && ./gradlew assembleDebug
   ```

## Funzionalità che Verranno Riabilitate

### 🗺️ **MapView**
- Visualizzazione mappa interattiva
- Marker per utenti e TableTalk®
- Click sui marker per aprire dettagli
- Centra mappa sulla posizione utente

### 📍 **LocationPicker**
- Selezione posizione cliccando sulla mappa
- Geocoding inverso automatico
- Marker per posizione selezionata
- Posizione corrente dell'utente

### 🔍 **PlacesAutocompleteInput**
- Ricerca luoghi automatica
- Suggerimenti mentre si digita
- Autocompletamento indirizzi
- Geocoding per coordinate precise

## Stato Attuale

- ✅ **App stabile**: Nessun crash Google Maps
- ✅ **Componenti funzionanti**: Mostrano messaggi informativi
- ❌ **Mappa interattiva**: Disabilitata
- ❌ **Selezione posizione**: Disabilitata
- ❌ **Ricerca luoghi**: Disabilitata

## Vantaggi della Soluzione Temporanea

1. **App stabile**: Nessun crash per API key mancante
2. **Funzionalità informative**: I componenti mostrano cosa è disponibile
3. **Facile riabilitazione**: Basta seguire i passi sopra
4. **Nessuna perdita di funzionalità**: L'app funziona normalmente

## Note Importanti

- Google Maps richiede una chiave API valida
- La chiave API deve essere configurata nelle variabili d'ambiente
- Le API Google Maps hanno limiti di utilizzo (quota)
- È consigliabile restringere la chiave API per sicurezza
- La configurazione può essere fatta in qualsiasi momento futuro
