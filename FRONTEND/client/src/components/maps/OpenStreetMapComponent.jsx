import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix per icone marker di default Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente per centrare la mappa su una posizione specifica
function FlyToMarker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], map.getZoom());
    }
  }, [position, map]);
  return null;
}

// Componente per gestire click sulla mappa
function LocationPicker({ onLocationSelect, onMapClick }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      // Se c'è onMapClick, chiamalo (per chiudere card/anteprima)
      if (onMapClick) {
        onMapClick();
      }
      // Se c'è onLocationSelect, chiamalo (per selezionare posizione)
      if (onLocationSelect) {
        onLocationSelect({ lat, lng });
      }
    },
  });
  return null;
}

const OpenStreetMapComponent = ({ 
  meals = [], 
  markers = [], // Nuova prop per markers dalla MapPage
  onLocationSelect, 
  onMarkerClick, // Nuova prop per gestire click sui marker
  onMapClick, // Nuova prop per gestire click sulla mappa
  selectedLocation,
  userLocation = null, // Nuova prop per posizione utente
  zoom = 13, // Nuova prop per zoom
  height = '400px',
  width = '100%',
  center = [45.4642, 9.1900] // Milano di default
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Funzione ricerca luoghi (API gratuita Nominatim)
  const searchPlaces = async (query) => {
    if (!query || query.length < 3) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=it&addressdetails=1`
      );
      const results = await response.json();
      
      const formattedResults = results.map(place => ({
        id: place.place_id,
        name: place.display_name,
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        address: place.display_name
      }));
      
      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Errore ricerca luoghi:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Barra di ricerca */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Cerca ristoranti, indirizzi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchPlaces(searchQuery)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
          <button
            onClick={() => searchPlaces(searchQuery)}
            disabled={isSearching}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#FF6B35',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {isSearching ? '...' : 'Cerca'}
          </button>
        </div>
        
        {/* Risultati ricerca */}
        {searchResults.length > 0 && (
          <div style={{
            position: 'absolute',
            zIndex: 1000,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            marginTop: '5px',
            maxHeight: '200px',
            overflowY: 'auto',
            width: '100%'
          }}>
            {searchResults.map(result => (
              <div
                key={result.id}
                onClick={() => {
                  onLocationSelect && onLocationSelect({
                    lat: result.lat,
                    lng: result.lng,
                    address: result.address
                  });
                  setSearchResults([]);
                  setSearchQuery(result.name.split(',')[0]);
                }}
                style={{
                  padding: '10px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                📍 {result.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mappa */}
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height, width, borderRadius: '8px' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Gestione click per selezionare posizione e chiudere card */}
        <LocationPicker onLocationSelect={onLocationSelect} onMapClick={onMapClick} />
        
        {/* Centra la mappa sulla posizione selezionata */}
        {selectedLocation && <FlyToMarker position={selectedLocation} />}
        
        {/* Marker per posizione utente */}
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]}
            icon={L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })}
          >
            <Popup>
              📍 <strong>La tua posizione</strong>
            </Popup>
          </Marker>
        )}
        
        {/* Marker per location selezionata */}
        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
            <Popup>
              📍 <strong>Posizione selezionata</strong><br />
              {selectedLocation.address || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}
            </Popup>
          </Marker>
        )}
        
        {/* Marker per i pasti dalla prop markers (usata da MapPage) */}
        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={[marker.lat, marker.lng]}
            eventHandlers={{
              click: () => {
                if (onMarkerClick) onMarkerClick(marker.id);
              },
            }}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#FF6B35' }}>
                  🍽️ {marker.title || marker.name}
                </h3>
                {marker.price && (
                  <p style={{ margin: '4px 0' }}>
                    💰 €{marker.price}
                  </p>
                )}
                {marker.type && (
                  <p style={{ margin: '4px 0', color: '#666' }}>
                    📅 {marker.type}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Marker per i pasti esistenti (compatibilità con vecchia API) */}
        {meals.map(meal => (
          <Marker 
            key={meal.id} 
            position={[meal.lat, meal.lng]}
            eventHandlers={{
              click: () => {
                if (onMarkerClick) onMarkerClick(meal.id);
              },
            }}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#FF6B35' }}>
                  🍽️ {meal.name}
                </h3>
                <p style={{ margin: '4px 0' }}>
                  📍 {meal.restaurant || meal.address}
                </p>
                <p style={{ margin: '4px 0' }}>
                  👥 {meal.participants || 0} partecipanti
                </p>
                <p style={{ margin: '4px 0' }}>
                  📅 {meal.date}
                </p>
                <button
                  onClick={() => window.open(`/meal/${meal.id}`, '_blank')}
                  style={{
                    background: '#FF6B35',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  Partecipa al TableTalk
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default OpenStreetMapComponent;
