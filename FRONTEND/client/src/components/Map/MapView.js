import React, { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet'; // 🚀 AGGIUNGI QUESTO
import OpenStreetMapComponent from '../maps/OpenStreetMapComponent'; // 🚀 USA IL NOSTRO COMPONENT

// 🚀 CONTROLLER PER MOVIMENTO AUTOMATICO
function MapController({ userPosition, centerOnUser }) {
  const map = useMap();

  useEffect(() => {
    if (centerOnUser && userPosition) {
      // Centra sulla posizione utente quando richiesto
      map.setView([userPosition.latitude, userPosition.longitude], 15, {
        animate: true,
        duration: 1.5
      });
    }
  }, [centerOnUser, userPosition, map]);

  return null;
}

const MapView = ({ 
  userPosition, 
  nearbyUsers, 
  nearbyMeals, 
  permissionStatus,
  centerOnUser = false // 🚀 NUOVA PROP
}) => {
  const [selectedLocation, setSelectedLocation] = useState(null);

  // 🚀 CENTRA SULLA POSIZIONE UTENTE QUANDO CAMBIA
  useEffect(() => {
    if (userPosition) {
      setSelectedLocation({
        lat: userPosition.latitude,
        lng: userPosition.longitude,
        address: 'La mia posizione'
      });
    }
  }, [userPosition]);

  // 🚀 CONVERTI I DATI PER OpenStreetMapComponent
  const mealsForMap = nearbyMeals.map(meal => ({
    id: meal._id,
    name: meal.title,
    lat: meal.location?.coordinates?.[1] || 0,
    lng: meal.location?.coordinates?.[0] || 0,
    address: meal.location?.address || 'Indirizzo non disponibile',
    restaurant: meal.restaurant || meal.location?.name,
    participants: meal.participants?.length || 0,
    date: new Date(meal.scheduledAt).toLocaleDateString()
  }));

  const usersForMap = nearbyUsers.map(user => ({
    id: user._id,
    name: user.name,
    lat: user.location?.coordinates?.[1] || 0,
    lng: user.location?.coordinates?.[0] || 0,
    address: user.location?.address || 'Posizione utente'
  }));

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <OpenStreetMapComponent
        meals={[...mealsForMap, ...usersForMap]} // 🚀 COMBINA PASTI E UTENTI
        selectedLocation={selectedLocation}
        onLocationSelect={setSelectedLocation}
        height="100%"
        center={userPosition ? [userPosition.latitude, userPosition.longitude] : [45.4642, 9.1900]}
        showSearchBar={true} // 🚀 ABILITA SEARCH BAR
      />
    </div>
  );
};

export default MapView;