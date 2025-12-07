import React, { useState, useEffect, useCallback } from 'react';
import { Container, Spinner, Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaLocationArrow, FaList, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';

import mealService from '../../services/mealService';
import OpenStreetMapComponent from '../../components/maps/OpenStreetMapComponent';
import MealCard from '../../components/meals/MealCard';
import BackButton from '../../components/common/BackButton';
import styles from './MapPage.module.css';

const MapPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Stati
  const [center, setCenter] = useState([41.9028, 12.4964]); // Default Roma [Lat, Lng]
  const [zoom, setZoom] = useState(13);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(15); // km

  // 1. Ottieni Posizione Utente
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userCoords = [latitude, longitude];
          setCenter(userCoords);
          setUserLocation(userCoords);
          fetchMealsForMap(latitude, longitude, searchRadius);
        },
        (error) => {
          console.warn("Geolocalizzazione non disponibile o negata:", error);
          toast.info("Impossibile rilevare la posizione. Mostro Roma.");
          // Carica comunque i pasti sulla posizione di default
          fetchMealsForMap(41.9028, 12.4964, searchRadius);
        }
      );
    } else {
      fetchMealsForMap(41.9028, 12.4964, searchRadius);
    }
    // eslint-disable-next-line
  }, []);

  // 2. Carica Pasti (Fisici)
  const fetchMealsForMap = async (lat, lng, radius) => {
    try {
      setLoading(true);
      // Usiamo il service dedicato che abbiamo controllato prima
      const response = await mealService.getMealsForMap(
        { latitude: lat, longitude: lng },
        radius,
        { mealType: 'physical', status: 'upcoming,ongoing' }
      );
      
      const mealsData = response.data || response;
      console.log(`🗺️ Trovati ${mealsData.length} pasti sulla mappa`);
      setMeals(mealsData);
    } catch (error) {
      console.error('Errore mappa:', error);
      toast.error(t('map.loadError') || 'Errore caricamento mappa');
    } finally {
      setLoading(false);
    }
  };

  // 3. Prepara i Markers per OpenStreetMap
  // Il componente si aspetta array di { lat, lng, id, title, ... }
  const mapMarkers = meals
    .filter(m => m.location && m.location.coordinates)
    .map(meal => ({
      id: meal._id,
      lat: meal.location.coordinates[1], // MongoDB è [lng, lat]
      lng: meal.location.coordinates[0],
      title: meal.title,
      price: meal.estimatedCost, // Per mostrarlo nel pin se vuoi
      type: meal.type // Per colorare il pin in base al tipo (colazione/pranzo/cena)
    }));

  // Handler click su marker
  const handleMarkerClick = (markerId) => {
    const meal = meals.find(m => m._id === markerId);
    if (meal) {
      setSelectedMeal(meal);
    }
  };

  // Handler click su mappa (chiude la card)
  const handleMapClick = () => {
    if (selectedMeal) setSelectedMeal(null);
  };

  // Ricarica nell'area corrente (simulato)
  const handleSearchHere = () => {
    // In una implementazione avanzata, OpenStreetMapComponent dovrebbe esporre il centro attuale
    // Per ora, usiamo l'ultimo centro noto o quello utente
    fetchMealsForMap(center[0], center[1], searchRadius);
  };

  return (
    <div className={styles.mapPage}>
      {/* Header Fluttuante */}
      <div className={styles.topBar}>
        <BackButton className={styles.backButton} />
        <div className={styles.searchContainer}>
          <FaSearch className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder={t('map.searchPlaceholder') || "Cerca zona..."} 
            className={styles.searchInput}
            // Qui potresti collegare un autocomplete per spostare la mappa
          />
        </div>
      </div>

      {/* Mappa */}
      <div className={styles.mapContainer}>
        <OpenStreetMapComponent
          center={center}
          zoom={zoom}
          markers={mapMarkers}
          onMarkerClick={handleMarkerClick}
          onMapClick={handleMapClick}
          userLocation={userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null}
          height="100%"
          width="100%"
        />
      </div>

      {/* Pulsante "Cerca in questa zona" */}
      <div className={styles.floatingControls}>
        <Button variant="light" className={styles.fab} onClick={handleSearchHere}>
          {loading ? <Spinner size="sm" /> : '🔄 Cerca qui'}
        </Button>
        <Button 
          variant="light" 
          className={styles.fab}
          onClick={() => {
            if (userLocation) {
              setCenter(userLocation);
              setZoom(14);
            } else {
              toast.warn("Posizione non disponibile");
            }
          }}
        >
          <FaLocationArrow color="#007bff" />
        </Button>
      </div>

      {/* Card Anteprima Pasto (Bottom Sheet) */}
      {selectedMeal && (
        <div className={styles.mealPreviewContainer}>
          <div className={styles.mealPreviewCard}>
            {/* Usiamo la versione "compact" della card esistente */}
            <MealCard meal={selectedMeal} compact onClick={() => navigate(`/meals/${selectedMeal._id}`)} />
            <button 
              className={styles.closePreview}
              onClick={() => setSelectedMeal(null)}
            >
              &times;
            </button>
          </div>
        </div>
      )}
      
      {/* Toggle Lista/Mappa (per tornare alla lista facilmente) */}
      <Button 
        className={styles.listToggle}
        onClick={() => navigate('/meals')}
      >
        <FaList /> {t('navigation.meals') || 'Lista'}
      </Button>
    </div>
  );
};

export default MapPage;
