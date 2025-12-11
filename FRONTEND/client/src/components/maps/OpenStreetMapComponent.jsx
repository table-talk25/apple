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
function FlyToMarker({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position && position.lat && position.lng) {
      const targetZoom = zoom || map.getZoom();
      // Usa flyTo per animazione smooth invece di setView
      map.flyTo([position.lat, position.lng], targetZoom, {
        duration: 1.5 // Animazione di 1.5 secondi
      });
    }
  }, [position?.lat, position?.lng, zoom, map]);
  return null;
}

// Componente per reagire ai cambiamenti di center prop
function CenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      const [lat, lng] = center;
      const targetZoom = zoom || map.getZoom();
      map.flyTo([lat, lng], targetZoom, {
        duration: 1.5
      });
    }
  }, [center, zoom, map]);
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
  // Verifica che Leaflet sia caricato correttamente
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.L) {
      console.error('❌ [Map] Leaflet non è disponibile');
    } else {
      console.log('✅ [Map] Leaflet caricato correttamente');
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Mappa */}
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height, width, borderRadius: '8px' }}
        whenReady={() => {
          console.log('✅ [Map] Mappa Leaflet pronta');
        }}
        whenCreated={(mapInstance) => {
          console.log('✅ [Map] Istanza mappa creata');
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          errorTileUrl="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Crect fill='%23ddd' width='256' height='256'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3EErrore caricamento mappa%3C/text%3E%3C/svg%3E"
        />
        
        {/* Aggiorna il centro quando cambia il prop center */}
        <CenterUpdater center={center} zoom={zoom} />
        
        {/* Gestione click per selezionare posizione e chiudere card */}
        <LocationPicker onLocationSelect={onLocationSelect} onMapClick={onMapClick} />
        
        {/* Centra la mappa sulla posizione selezionata */}
        {selectedLocation && <FlyToMarker position={selectedLocation} zoom={zoom} />}
        
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
