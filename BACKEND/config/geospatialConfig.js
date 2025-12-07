/**
 * Configurazione per query geospaziali ottimizzate
 */

const GEOSPATIAL_CONFIG = {
    // 🌍 Configurazione Generale
    GENERAL: {
        // Abilita query geospaziali
        ENABLED: true,
        
        // Versione del sistema
        VERSION: '1.0.0',
        
        // Nome del sistema
        SYSTEM_NAME: 'TableTalk Geospatial Query System',
        
        // Descrizione
        DESCRIPTION: 'Sistema di query geospaziali ottimizzate per performance e scalabilità'
    },

    // 📍 Configurazione Coordinate
    COORDINATES: {
        // Limiti validi per latitudine
        LATITUDE: {
            MIN: -90,
            MAX: 90,
            PRECISION: 6 // Decimali massimi
        },
        
        // Limiti validi per longitudine
        LONGITUDE: {
            MIN: -180,
            MAX: 180,
            PRECISION: 6 // Decimali massimi
        },
        
        // Validazione coordinate
        VALIDATION: {
            STRICT: true,
            ALLOW_NULL: false,
            ALLOW_UNDEFINED: false
        }
    },

    // 📏 Configurazione Raggio
    RADIUS: {
        // Raggio minimo in km
        MIN_KM: 0.1,
        
        // Raggio massimo in km
        MAX_KM: 1000,
        
        // Raggio predefinito in km
        DEFAULT_KM: 50,
        
        // Raggio per ricerca rapida
        QUICK_SEARCH_KM: 25,
        
        // Raggio per ricerca estesa
        EXTENDED_SEARCH_KM: 100,
        
        // Raggio per notifiche geolocalizzate
        NOTIFICATION_KM: 10
    },

    // 🗺️ Configurazione Query
    QUERY: {
        // Tipi di query supportati
        TYPES: {
            BASIC: 'basic',           // Ricerca base con coordinate e raggio
            ADVANCED: 'advanced',     // Ricerca avanzata con filtri multipli
            STATISTICS: 'statistics', // Statistiche aggregate
            NEARBY: 'nearby',         // Ricerca pasti nelle vicinanze
            ROUTE: 'route'            // Ricerca lungo un percorso
        },
        
        // Operatori geospaziali MongoDB
        OPERATORS: {
            GEO_WITHIN: '$geoWithin',
            NEAR: '$near',
            NEAR_SPHERE: '$nearSphere',
            CENTER_SPHERE: '$centerSphere',
            CENTER: '$center',
            BOX: '$box',
            POLYGON: '$polygon'
        },
        
        // Indici geospaziali richiesti
        REQUIRED_INDEXES: [
            'location.coordinates_2dsphere',
            'mealType_1',
            'status_1',
            'date_1'
        ]
    },

    // ⚡ Configurazione Performance
    PERFORMANCE: {
        // Ottimizzazioni query
        OPTIMIZATIONS: {
            // Usa lean() per risultati più veloci
            USE_LEAN: true,
            
            // Limita campi selezionati
            SELECT_FIELDS: true,
            
            // Popolamento minimo
            MINIMAL_POPULATE: true,
            
            // Caching risultati
            ENABLE_CACHE: true,
            
            // Batch processing
            BATCH_SIZE: 100
        },
        
        // Timeout query
        TIMEOUTS: {
            BASIC_QUERY: 5000,        // 5 secondi
            ADVANCED_QUERY: 10000,    // 10 secondi
            STATISTICS_QUERY: 15000,  // 15 secondi
            AGGREGATION: 20000        // 20 secondi
        },
        
        // Limiti risultati
        LIMITS: {
            MAX_RESULTS: 1000,
            DEFAULT_LIMIT: 100,
            MIN_LIMIT: 10
        }
    },

    // 🔧 Configurazione Tecnica
    TECHNICAL: {
        // Calcoli geografici
        CALCULATIONS: {
            // Raggio della Terra in km
            EARTH_RADIUS_KM: 6371,
            
            // Raggio della Terra in metri
            EARTH_RADIUS_M: 6371000,
            
            // Conversione gradi-radianti
            DEG_TO_RAD: Math.PI / 180,
            
            // Conversione radianti-gradi
            RAD_TO_DEG: 180 / Math.PI
        },
        
        // Algoritmi di calcolo distanza
        DISTANCE_ALGORITHMS: {
            // Formula di Haversine (più precisa)
            HAVERSINE: 'haversine',
            
            // Formula sferica (più veloce)
            SPHERICAL: 'spherical',
            
            // Formula piana (approssimativa)
            PLANAR: 'planar'
        },
        
        // Precisione calcoli
        PRECISION: {
            DISTANCE_KM: 2,           // Decimali per distanza in km
            DISTANCE_M: 0,            // Decimali per distanza in metri
            COORDINATES: 6,           // Decimali per coordinate
            RADIUS: 1                 // Decimali per raggio
        }
    },

    // 📊 Configurazione Statistiche
    STATISTICS: {
        // Metriche calcolate
        METRICS: {
            // Conteggi base
            TOTAL_MEALS: true,
            UPCOMING_MEALS: true,
            ONGOING_MEALS: true,
            COMPLETED_MEALS: true,
            
            // Statistiche partecipanti
            AVG_PARTICIPANTS: true,
            MAX_PARTICIPANTS: true,
            MIN_PARTICIPANTS: true,
            
            // Distribuzione geografica
            DENSITY_PER_KM2: true,
            DENSITY_PER_100KM2: true,
            
            // Analisi temporale
            MEALS_PER_DAY: true,
            MEALS_PER_WEEK: true,
            MEALS_PER_MONTH: true
        },
        
        // Aggregazioni MongoDB
        AGGREGATIONS: {
            // Pipeline base
            BASIC_PIPELINE: [
                '$match',
                '$group',
                '$project'
            ],
            
            // Pipeline avanzata
            ADVANCED_PIPELINE: [
                '$match',
                '$lookup',
                '$group',
                '$project',
                '$sort'
            ]
        }
    },

    // 🌐 Configurazione Internazionalizzazione
    I18N: {
        // Lingua predefinita
        DEFAULT_LANGUAGE: 'it',
        
        // Lingue supportate
        SUPPORTED_LANGUAGES: ['it', 'en', 'de', 'fr', 'es'],
        
        // Traduzioni errori
        ERROR_TRANSLATIONS: {
            it: {
                INVALID_COORDINATES: 'Coordinate non valide',
                INVALID_RADIUS: 'Raggio non valido',
                COORDINATES_REQUIRED: 'Coordinate richieste',
                RADIUS_REQUIRED: 'Raggio richiesto',
                QUERY_TIMEOUT: 'Query scaduta',
                NO_RESULTS: 'Nessun risultato trovato'
            },
            en: {
                INVALID_COORDINATES: 'Invalid coordinates',
                INVALID_RADIUS: 'Invalid radius',
                COORDINATES_REQUIRED: 'Coordinates required',
                RADIUS_REQUIRED: 'Radius required',
                QUERY_TIMEOUT: 'Query timeout',
                NO_RESULTS: 'No results found'
            }
        }
    },

    // 🚨 Configurazione Sicurezza
    SECURITY: {
        // Validazione input
        VALIDATION: {
            // Sanitizza coordinate
            SANITIZE_COORDINATES: true,
            
            // Valida formato coordinate
            VALIDATE_FORMAT: true,
            
            // Controlla range coordinate
            CHECK_RANGE: true,
            
            // Limita precisione coordinate
            LIMIT_PRECISION: true
        },
        
        // Rate limiting
        RATE_LIMITING: {
            // Abilita rate limiting
            ENABLED: true,
            
            // Richieste per minuto
            REQUESTS_PER_MINUTE: 60,
            
            // Richieste per ora
            REQUESTS_PER_HOUR: 1000,
            
            // Burst massimo
            MAX_BURST: 10
        },
        
        // Logging
        LOGGING: {
            // Abilita logging
            ENABLED: true,
            
            // Livello logging
            LEVEL: 'info',
            
            // Log coordinate (attenzione privacy)
            LOG_COORDINATES: false,
            
            // Log query performance
            LOG_PERFORMANCE: true
        }
    },

    // 🔍 Configurazione Debug
    DEBUG: {
        // Modalità debug
        ENABLED: process.env.NODE_ENV === 'development',
        
        // Log dettagliati
        VERBOSE_LOGGING: false,
        
        // Profiling query
        QUERY_PROFILING: false,
        
        // Metriche performance
        PERFORMANCE_METRICS: true,
        
        // Simulazione latenza
        SIMULATE_LATENCY: false,
        LATENCY_MS: 100
    }
};

module.exports = GEOSPATIAL_CONFIG;
