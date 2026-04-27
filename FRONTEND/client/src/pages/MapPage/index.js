import React, { useState, useEffect, useCallback, useRef } from 'react'; // Aggiunto useRef
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

  // 🛑 FIX TRABALLAMENTO: Usiamo un Ref per tracciare il centro mentre ti muovi
  // Questo evita che React ricarichi la mappa ad ogni micro-spostamento
  const mapCenterRef = useRef([41.9028, 12.4964]);

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
        
        // Richiedi permessi se non concessi
        if (permissionStatus.location !== 'granted') {
          permissionStatus = await Geolocation.requestPermissions();
          
          if (permissionStatus.location !== 'granted') {
            toast.warn("Permesso posizione negato. Cerca manualmente la tua città.");
            setLoading(false);
            return false;
            }
          }
          
          // Ottieni posizione con Capacitor
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000 
          });
          
          const { latitude, longitude } = position.coords;
          const userCoords = [latitude, longitude];
          
          // Aggiorniamo tutto
          setCenter(userCoords);
          mapCenterRef.current = userCoords; // Aggiorna anche il ref
          setUserLocation(userCoords);
          setZoom(14); 
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
                mapCenterRef.current = userCoords;
                setUserLocation(userCoords);
                setZoom(14);
                await fetchMealsForMap(latitude, longitude, searchRadius);
                toast.success("Posizione aggiornata!");
                setLoading(false);
                resolve(true);
              },
              (error) => {
                console.warn("Geolocalizzazione non disponibile:", error);
                toast.warn("Usa la barra di ricerca per trovare la tua città.");
                setLoading(false);
                resolve(false);
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
            );
          });
          } else {
          toast.warn("Geolocalizzazione non supportata.");
          setLoading(false);
          return false;
          }
        }
      } catch (error) {
        console.error('📍 [MapPage] Errore geolocalizzazione:', error);
      toast.error(`Impossibile ottenere la posizione automatica.`);
      setLoading(false);
      return false;
    }
  };

  // 1. Prova a ottenere la posizione all'avvio
  useEffect(() => {
    getCurrentLocation().catch(() => {
        fetchMealsForMap(41.9028, 12.4964, searchRadius);
    });
    // eslint-disable-next-line
  }, []);

  // 2. Carica Pasti (Fisici)
  const fetchMealsForMap = async (lat, lng, radius) => {
    try {
      setLoading(true);
      
      const response = await mealService.getMealsForMap(
        { latitude: lat, longitude: lng },
        radius,
        { mealType: 'physical', status: 'upcoming,ongoing' }
      );
      
      const mealsData = response.data || response;
      const count = Array.isArray(mealsData) ? mealsData.length : 0;
      
      setMeals(Array.isArray(mealsData) ? mealsData : []);
      
      if (count > 0) {
        toast.success(`Trovati ${count} TableTalk qui! 🍽️`, { autoClose: 2000 });
      } else {
        toast.info("Nessun TableTalk in questa zona. Prova a 'Cerca qui' spostandoti.", { autoClose: 3000 });
      }
    } catch (error) {
      console.error('❌ [MapPage] Errore caricamento mappa:', error);
      toast.error("Errore caricamento pasti.");
    } finally {
      setLoading(false);
    }
  };

  const mapMarkers = meals
    .filter(m => m.location && m.location.coordinates)
    .map(meal => ({
      id: meal._id,
      lat: meal.location.coordinates[1], 
      lng: meal.location.coordinates[0],
      title: meal.title,
      price: meal.estimatedCost, 
      type: meal.type 
    }));

  const handleMarkerClick = (markerId) => {
    const meal = meals.find(m => m._id === markerId);
    if (meal) {
      setSelectedMeal(meal);
    }
  };

  const handleMapClick = () => {
    if (selectedMeal) setSelectedMeal(null);
  };

  // 🔄 "CERCA QUI": Ora usa il Ref invece dello stato (più stabile)
  const handleSearchHere = async () => {
    // Prendiamo le coordinate attuali dal Ref (dove l'utente ha trascinato la mappa)
    const currentCoords = mapCenterRef.current;
    
    if (!currentCoords || currentCoords.length !== 2) {
      toast.warn("Sposta la mappa e riprova.");
      return;
    }
    
    const [lat, lng] = currentCoords;
    console.log('🔄 [MapPage] Cerca qui:', { lat, lng });
    
    try {
      setLoading(true);
      await fetchMealsForMap(lat, lng, searchRadius);
    } catch (error) {
      toast.error("Errore ricerca.");
      setLoading(false);
    }
  };

  // 🌍 RICERCA CITTÀ: Sposta la mappa e cerca
  const handleLocationSearch = async (query) => {
    if (!query || query.length < 3) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=it&addressdetails=1`
      );
      const results = await response.json();
      
      if (results && results.length > 0) {
        const place = results[0];
        const newCenter = [parseFloat(place.lat), parseFloat(place.lon)];
        
        // 1. Aggiorna lo stato per far "volare" la mappa lì
        setCenter(newCenter);
        // 2. Aggiorna il ref
        mapCenterRef.current = newCenter;
        
        setZoom(14); 
        
        // 3. Cerca subito i pasti in quella zona
        fetchMealsForMap(newCenter[0], newCenter[1], searchRadius);
        toast.success(`Spostato su: ${place.display_name.split(',')[0]}`);
      } else {
        toast.warn('Luogo non trovato. Prova "Roma", "Milano"...');
      }
    } catch (error) {
      console.error('Errore ricerca luogo:', error);
      toast.error('Errore di connessione.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location) => {
    if (location && location.lat && location.lng) {
      const newCenter = [location.lat, location.lng];
      setCenter(newCenter);
      mapCenterRef.current = newCenter;
      setZoom(14);
      fetchMealsForMap(location.lat, location.lng, searchRadius);
    }
  };

  // 🛑 FIX TRABALLAMENTO: Questa funzione ora aggiorna SOLO il Ref, NON lo stato!
  const handleMapMove = (location) => {
    if (location && location.lat && location.lng) {
      // NON chiamiamo setCenter(newCenter) qui! Altrimenti parte il loop.
      // Aggiorniamo solo il "puntatore" silenzioso per il tasto "Cerca Qui".
      mapCenterRef.current = [location.lat, location.lng];
    }
  };

  return (
    <div className={styles.mapPage}>
      {/* Header Fluttuante */}
      <div className={styles.topBar}>
        <BackButton className={styles.backButton} />
        <div className={styles.searchContainer}>
          <FaSearch className={styles.searchIcon} />
          {/* ✏️ UX MIGLIORATA: Placeholder più chiaro */}
          <input 
            type="text" 
            placeholder={"Cerca città o via (es. Milano)..."} 
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
            {loading ? '...' : 'Vai'}
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
              toast.info("Usa la barra in alto per cercare la tua città.");
            }
          }}
          title="La mia posizione"
        >
          <FaLocationArrow color="#007bff" />
        </Button>
      </div>

      {/* Card Anteprima Pasto (Bottom Sheet) */}
      {selectedMeal && (
        <div className={styles.mealPreviewContainer}>
          <div className={styles.mealPreviewCard}>
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
      
      {/* Toggle Lista/Mappa */}
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
