/**
 * Configurazione per le notifiche geolocalizzate
 */

const GEOLOCATION_CONFIG = {
    // 🌍 Configurazione Geografica
    GEOGRAPHY: {
        // Raggio massimo per le notifiche (in km)
        MAX_RADIUS_KM: 50,
        
        // Raggio predefinito per le notifiche (in km)
        DEFAULT_RADIUS_KM: 10,
        
        // Raggio minimo per le notifiche (in km)
        MIN_RADIUS_KM: 1,
        
        // Fuso orario per i calcoli
        TIMEZONE: 'Europe/Rome',
        
        // Raggio della Terra in km (per calcoli di distanza)
        EARTH_RADIUS_KM: 6371
    },

    // ⏰ Configurazione Temporale
    TIMING: {
        // Frequenza di esecuzione del job (cron expression)
        JOB_FREQUENCY: '*/30 * * * *', // Ogni 30 minuti
        
        // Ore indietro da controllare per pasti recenti
        HOURS_BACK_DEFAULT: 2,
        
        // Ore indietro per esecuzione manuale
        HOURS_BACK_MANUAL: 24,
        
        // Timeout per operazioni geografiche (in ms)
        GEO_TIMEOUT_MS: 10000
    },

    // 🍽️ Configurazione Pasti
    MEALS: {
        // Tipi di pasto supportati per le notifiche
        SUPPORTED_TYPES: ['breakfast', 'lunch', 'dinner', 'aperitif'],
        
        // Solo pasti fisici generano notifiche geolocalizzate
        ONLY_PHYSICAL: true,
        
        // Solo pasti pubblici generano notifiche
        ONLY_PUBLIC: true,
        
        // Stato minimo per generare notifiche
        MIN_STATUS: 'upcoming'
    },

    // 👥 Configurazione Utenti
    USERS: {
        // Numero massimo di utenti da notificare per pasto
        MAX_NOTIFICATIONS_PER_MEAL: 100,
        
        // Numero massimo di notifiche per utente al giorno
        MAX_DAILY_NOTIFICATIONS_PER_USER: 10,
        
        // Intervallo minimo tra notifiche per lo stesso utente (in minuti)
        MIN_INTERVAL_BETWEEN_NOTIFICATIONS_MINUTES: 30
    },

    // 📱 Configurazione Notifiche
    NOTIFICATIONS: {
        // Abilita notifiche push
        PUSH_ENABLED: true,
        
        // Abilita notifiche socket
        SOCKET_ENABLED: true,
        
        // Abilita notifiche email
        EMAIL_ENABLED: false,
        
        // Template per i messaggi
        MESSAGE_TEMPLATES: {
            TITLE: '🍽️ Nuovo TableTalk® nelle vicinanze!',
            BREAKFAST: 'Nuova colazione vicino a te! Dai un\'occhiata a "{{title}}" a soli {{distance}} da casa tua.',
            LUNCH: 'Nuovo pranzo vicino a te! Dai un\'occhiata a "{{title}}" a soli {{distance}} da casa tua.',
            DINNER: 'Nuova cena vicino a te! Dai un\'occhiata a "{{title}}" a soli {{distance}} da casa tua.',
            APERITIF: 'Nuovo aperitivo vicino a te! Dai un\'occhiata a "{{title}}" a soli {{distance}} da casa tua.',
            GENERIC: 'Nuovo {{mealType}} vicino a te! Dai un\'occhiata a "{{title}}" a soli {{distance}} da casa tua.'
        }
    },

    // 🔧 Configurazione Tecnica
    TECHNICAL: {
        // Abilita logging dettagliato
        LOGGING_ENABLED: true,
        
        // Livelli di logging
        LOG_LEVELS: {
            INFO: '📍',
            SUCCESS: '✅',
            WARNING: '⚠️',
            ERROR: '❌'
        },
        
        // Abilita metriche e statistiche
        METRICS_ENABLED: true,
        
        // Abilita test di connessione
        CONNECTION_TEST_ENABLED: true,
        
        // Timeout per operazioni asincrone (in ms)
        ASYNC_TIMEOUT_MS: 30000
    },

    // 🚨 Configurazione Sicurezza
    SECURITY: {
        // Abilita validazione coordinate
        COORDINATE_VALIDATION: true,
        
        // Limiti per coordinate valide
        COORDINATE_LIMITS: {
            LATITUDE_MIN: -90,
            LATITUDE_MAX: 90,
            LONGITUDE_MIN: -180,
            LONGITUDE_MAX: 180
        },
        
        // Abilita rate limiting per utente
        RATE_LIMITING_ENABLED: true,
        
        // Numero massimo di richieste per utente al minuto
        MAX_REQUESTS_PER_MINUTE: 60
    },

    // 📊 Configurazione Performance
    PERFORMANCE: {
        // Abilita caching delle query geografiche
        CACHE_ENABLED: true,
        
        // Durata cache in secondi
        CACHE_DURATION_SECONDS: 300,
        
        // Numero massimo di risultati per query
        MAX_QUERY_RESULTS: 1000,
        
        // Timeout per query database (in ms)
        DB_QUERY_TIMEOUT_MS: 5000,
        
        // Abilita indici geografici
        GEO_INDEXES_ENABLED: true
    },

    // 🌐 Configurazione Internazionalizzazione
    I18N: {
        // Lingua predefinita
        DEFAULT_LANGUAGE: 'it',
        
        // Lingue supportate
        SUPPORTED_LANGUAGES: ['it', 'en', 'de', 'fr', 'es'],
        
        // Traduzioni per tipi di pasto
        MEAL_TYPE_TRANSLATIONS: {
            it: {
                breakfast: 'colazione',
                lunch: 'pranzo',
                dinner: 'cena',
                aperitif: 'aperitivo'
            },
            en: {
                breakfast: 'breakfast',
                lunch: 'lunch',
                dinner: 'dinner',
                aperitif: 'aperitif'
            },
            de: {
                breakfast: 'Frühstück',
                lunch: 'Mittagessen',
                dinner: 'Abendessen',
                aperitif: 'Aperitif'
            },
            fr: {
                breakfast: 'petit-déjeuner',
                lunch: 'déjeuner',
                dinner: 'dîner',
                aperitif: 'apéritif'
            },
            es: {
                breakfast: 'desayuno',
                lunch: 'almuerzo',
                dinner: 'cena',
                aperitif: 'aperitivo'
            }
        }
    },

    // 📈 Configurazione Analytics
    ANALYTICS: {
        // Abilita raccolta metriche
        ENABLED: true,
        
        // Metriche da tracciare
        TRACKED_METRICS: [
            'notifications_sent',
            'users_notified',
            'meals_processed',
            'response_time',
            'error_rate',
            'geographic_coverage'
        ],
        
        // Intervallo di aggregazione in minuti
        AGGREGATION_INTERVAL_MINUTES: 60
    }
};

module.exports = GEOLOCATION_CONFIG;
