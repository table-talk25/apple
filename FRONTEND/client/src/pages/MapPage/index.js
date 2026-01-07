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
  const [searchQuery, setSearchQuery] = useState('');

  // Funzione per ottenere la posizione (riutilizzabile)
  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      // Su mobile, usa Capacitor Geolocation
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        
        // Controlla permessi
        let permissionStatus = await Geolocation.checkPermissions();
        console.log('📍 [MapPage] Stato permessi posizione:', permissionStatus);
        
        // Richiedi permessi se non concessi
        if (permissionStatus.location !== 'granted') {
          console.log('📍 [MapPage] Richiesta permessi posizione...');
          permissionStatus = await Geolocation.requestPermissions();
          console.log('📍 [MapPage] Risultato richiesta permessi:', permissionStatus);
          
          if (permissionStatus.location !== 'granted') {
            toast.warn("Permesso posizione negato. Abilitalo nelle impostazioni per usare la tua posizione.");
            setLoading(false);
            return false;
          }
        }
        
        // Ottieni posizione con Capacitor
        console.log('📍 [MapPage] Richiesta posizione corrente...');
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000 // Accetta posizioni fino a 1 minuto fa
        });
        
        console.log('📍 [MapPage] Posizione ottenuta:', position.coords);
        const { latitude, longitude } = position.coords;
        const userCoords = [latitude, longitude];
        setCenter(userCoords);
        setUserLocation(userCoords);
        setZoom(14); // Zoom più vicino quando si ottiene la posizione
        await fetchMealsForMap(latitude, longitude, searchRadius);
        toast.success("Posizione aggiornata!");
        setLoading(false);
        return true;
      } else {
        // Su web, usa navigator.geolocation
        if (navigator.geolocation) {
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude, longitude } = position.coords;
                const userCoords = [latitude, longitude];
                setCenter(userCoords);
                setUserLocation(userCoords);
                setZoom(14);
                await fetchMealsForMap(latitude, longitude, searchRadius);
                toast.success("Posizione aggiornata!");
                setLoading(false);
                resolve(true);
              },
              (error) => {
                console.warn("Geolocalizzazione non disponibile o negata:", error);
                toast.warn("Impossibile rilevare la posizione. Usa il pulsante per cercare manualmente.");
                setLoading(false);
                resolve(false);
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
            );
          });
        } else {
          toast.warn("Geolocalizzazione non supportata dal browser.");
          setLoading(false);
          return false;
        }
      }
    } catch (error) {
      console.error('📍 [MapPage] Errore geolocalizzazione:', error);
      toast.error(`Errore: ${error.message || 'Impossibile ottenere la posizione'}`);
      setLoading(false);
      return false;
    }
  };

  // 1. Prova a ottenere la posizione all'avvio (senza forzare)
  useEffect(() => {
    getCurrentLocation().catch(() => {
      // Se fallisce, mostra Roma di default
      fetchMealsForMap(41.9028, 12.4964, searchRadius);
    });
    // eslint-disable-next-line
  }, []);

  // 2. Carica Pasti (Fisici)
  const fetchMealsForMap = async (lat, lng, radius) => {
    try {
      setLoading(true);
      console.log('🗺️ [MapPage] Ricerca pasti fisici:', { lat, lng, radius });
      
      // Usiamo il service dedicato che abbiamo controllato prima
      const response = await mealService.getMealsForMap(
        { latitude: lat, longitude: lng },
        radius,
        { mealType: 'physical', status: 'upcoming,ongoing' }
      );
      
      const mealsData = response.data || response;
      const count = Array.isArray(mealsData) ? mealsData.length : 0;
      console.log(`🗺️ [MapPage] Trovati ${count} TableTalk fisici nella zona`);
      
      setMeals(Array.isArray(mealsData) ? mealsData : []);
      
      // Mostra feedback
      if (count > 0) {
        toast.success(`Trovati ${count} TableTalk nella zona! 🍽️`, { autoClose: 3000 });
      } else {
        toast.info("Nessun TableTalk trovato in questa zona. Prova a spostare la mappa.", { autoClose: 3000 });
      }
    } catch (error) {
      console.error('❌ [MapPage] Errore caricamento mappa:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Errore caricamento mappa';
      toast.error(errorMsg);
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

  // Ricarica nell'area corrente
  const handleSearchHere = async () => {
    if (!center || center.length !== 2) {
      toast.warn("Posizione non valida. Sposta la mappa e riprova.");
      return;
    }
    
    const [lat, lng] = center;
    console.log('🔄 [MapPage] Cerca qui - Coordinate:', { lat, lng, radius: searchRadius });
    
    // Mostra feedback visivo
    toast.info(`Cercando TableTalk fisici nella zona...`, { autoClose: 2000 });
    
    try {
      setLoading(true);
      await fetchMealsForMap(lat, lng, searchRadius);
      // Il toast di successo viene mostrato in fetchMealsForMap
    } catch (error) {
      console.error('❌ [MapPage] Errore ricerca pasti:', error);
      toast.error("Errore durante la ricerca. Riprova.");
      setLoading(false);
    }
  };

  // Handler per ricerca città/luogo
  const handleLocationSearch = async (query) => {
    if (!query || query.length < 3) return;
    
    try {
      setLoading(true);
      // Usa Nominatim API per geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=it&addressdetails=1`
      );
      const results = await response.json();
      
      if (results && results.length > 0) {
        const place = results[0];
        const newCenter = [parseFloat(place.lat), parseFloat(place.lon)];
        setCenter(newCenter);
        setZoom(14); // Zoom più vicino quando si cerca un luogo
        // Ricarica i pasti nella nuova posizione
        fetchMealsForMap(newCenter[0], newCenter[1], searchRadius);
        toast.success(`Mappa centrata su ${place.display_name}`);
      } else {
        toast.warn('Luogo non trovato. Prova con un altro nome.');
      }
    } catch (error) {
      console.error('Errore ricerca luogo:', error);
      toast.error('Errore durante la ricerca del luogo');
    } finally {
      setLoading(false);
    }
  };

  // Handler per selezione posizione dalla mappa
  const handleLocationSelect = (location) => {
    if (location && location.lat && location.lng) {
      const newCenter = [location.lat, location.lng];
      setCenter(newCenter);
      setZoom(14);
      fetchMealsForMap(location.lat, location.lng, searchRadius);
    }
  };

  // Handler per aggiornare il centro quando la mappa viene spostata
  const handleMapMove = (location) => {
    if (location && location.lat && location.lng) {
      const newCenter = [location.lat, location.lng];
      setCenter(newCenter);
      console.log('📍 [MapPage] Mappa spostata - Nuovo centro:', newCenter);
    }
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
            placeholder={t('map.searchPlaceholder') || "Cerca città o zona..."} 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleLocationSearch(searchQuery);
              }
            }}
          />
          <button
            onClick={() => handleLocationSearch(searchQuery)}
            disabled={loading || !searchQuery.trim()}
            className={styles.searchButton}
          >
            {loading ? '...' : 'Cerca'}
          </button>
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
          onLocationSelect={handleLocationSelect}
          onMapMove={handleMapMove}
          userLocation={userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null}
          selectedLocation={center ? { lat: center[0], lng: center[1] } : null}
          height="100vh"
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
          onClick={async () => {
            const success = await getCurrentLocation();
            if (!success) {
              toast.info("Sposta la mappa manualmente o usa il pulsante 'Cerca qui' per cercare nella zona visibile.");
            }
          }}
          title="Ottieni la mia posizione"
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
