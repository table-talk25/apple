import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import OpenStreetMapComponent from '../maps/OpenStreetMapComponent';

const LocationPicker = ({ value, onChange, onLocationSelect, initialCenter = null, currentLocation = null }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Inizializza la posizione selezionata
  useEffect(() => {
    if (value) {
      setSelectedLocation({
        lat: value.coordinates?.[1] || 45.4642,
        lng: value.coordinates?.[0] || 9.1900,
        address: value.address
      });
    }
  }, [value]);

  // Gestisce la selezione di una nuova posizione
  const handleLocationSelect = (location) => {
    const locationData = {
      coordinates: [location.lng, location.lat], // MongoDB usa [lng, lat]
      address: location.address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
    };
    
    setSelectedLocation(location);
    
    // Chiama le callback
    if (onChange) {
      onChange(locationData);
    }
    if (onLocationSelect) {
      onLocationSelect(locationData);
    }
  };

  // Determina il centro della mappa
  const getMapCenter = () => {
    if (selectedLocation) {
      return [selectedLocation.lat, selectedLocation.lng];
    }
    if (initialCenter?.coordinates) {
      return [initialCenter.coordinates[1], initialCenter.coordinates[0]];
    }
    if (currentLocation?.coordinates) {
      return [currentLocation.coordinates[1], currentLocation.coordinates[0]];
    }
    return [45.4642, 9.1900]; // Milano di default
  };

  return (
    <div className="location-picker">
      <div style={{ marginBottom: '10px' }}>
        <h6>📍 Seleziona Posizione</h6>
        <p className="text-muted small">
          Clicca sulla mappa o usa la ricerca per selezionare una posizione
        </p>
      </div>
      
      <OpenStreetMapComponent
        selectedLocation={selectedLocation}
        onLocationSelect={handleLocationSelect}
        height="400px"
        center={getMapCenter()}
      />
      
      {selectedLocation && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <strong>📍 Posizione Selezionata:</strong><br />
          <span style={{ fontSize: '14px' }}>
            {selectedLocation.address || `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
          </span>
        </div>
      )}
    </div>
  );
};

export default LocationPicker; 