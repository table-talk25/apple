// File: FRONTEND/client/src/components/Map/PlacesAutocompleteInput.js
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const PlacesAutocompleteInput = ({ value, onChange, onSelect, placeholder, className = '', disabled = false }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Inizializza il valore dal prop
  useEffect(() => {
    if (value?.address) {
      setQuery(value.address);
    }
  }, [value?.address]);

  // Funzione di ricerca usando Nominatim API (gratuita)
  const searchPlaces = async (searchQuery) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=it&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Errore nella ricerca luoghi');
      }
      
      const results = await response.json();
      
      const formattedResults = results.map(place => ({
        id: place.place_id,
        description: place.display_name,
        place_id: place.place_id,
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        address: place.display_name
      }));
      
      setSuggestions(formattedResults);
    } catch (error) {
      console.error('[PlacesAutocompleteInput] Errore nella ricerca:', error);
      setError(error.message);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setShowSuggestions(true);
    
    // Chiama onChange per aggiornare il valore nel form
    if (onChange) {
      onChange(newQuery);
    }
    
    if (newQuery.trim() && newQuery.length >= 3) {
      searchPlaces(newQuery);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    try {
      setQuery(suggestion.description);
      setShowSuggestions(false);
      setSuggestions([]);
      
      const location = {
        coordinates: [suggestion.lng, suggestion.lat],
        address: suggestion.description
      };
      
      // Chiama onSelect se fornito, altrimenti onChange
      if (onSelect) {
        onSelect(location);
      } else if (onChange) {
        onChange(location);
      }
      
    } catch (error) {
      console.error('[PlacesAutocompleteInput] Errore nella selezione:', error);
      setError(error.message);
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Ritarda la chiusura per permettere il click sui suggerimenti
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <div className={`places-autocomplete ${className}`} ref={containerRef}>
      <div className="input-group">
        <input
          ref={inputRef}
          type="text"
          className="form-control"
          placeholder={placeholder || "🔍 Cerca ristoranti, indirizzi..."}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={disabled}
        />
        {isLoading && (
          <span className="input-group-text">
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Caricamento...</span>
            </div>
          </span>
        )}
      </div>
      
      {/* Suggerimenti */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-dropdown" style={{
          position: 'absolute',
          zIndex: 1000,
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          marginTop: '5px',
          maxHeight: '200px',
          overflowY: 'auto',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          {suggestions.map(suggestion => (
            <div
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '10px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            >
              📍 {suggestion.description}
            </div>
          ))}
        </div>
      )}
      
      {/* Messaggio di errore */}
      {error && (
        <div className="mt-2">
          <div className="alert alert-warning" role="alert">
            <small>⚠️ {error}</small>
          </div>
        </div>
      )}
      
      {/* Info */}
      <div className="mt-2">
        <small className="text-muted">
          🔍 Ricerca gratuita con OpenStreetMap • Inserisci almeno 3 caratteri
        </small>
      </div>
    </div>
  );
};

export default PlacesAutocompleteInput;


