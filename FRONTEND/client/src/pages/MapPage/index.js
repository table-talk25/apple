import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, LocateFixed } from 'lucide-react';
import mealService from '../../services/mealService';
import OpenStreetMapComponent from '../../components/maps/OpenStreetMapComponent';
import MealDetailModal from '../../components/meals/MealDetailModal';
import ShareMealModal from '../../components/meals/ShareMealModal';
import { Button, Toast } from '../../components/ui';
import { extractCity, formatMealWhen } from '../../utils/mealFormat';
import styles from './MapPage.module.css';

const DEFAULT_COORDS = [45.4642, 9.19]; // Milano default

const MapPage = () => {
  const { t, i18n } = useTranslation();

  const [center, setCenter] = useState(DEFAULT_COORDS);
  const [zoom, setZoom] = useState(13);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [shareMeal, setShareMeal] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastState, setToastState] = useState({ message: '', tone: 'success', visible: false });

  const mapCenterRef = useRef(DEFAULT_COORDS);

  const showToast = useCallback((message, tone = 'success') => {
    setToastState({ message, tone, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToastState((prev) => ({ ...prev, visible: false }));
  }, []);

  const fetchMealsForMap = useCallback(
    async (lat, lng, radius, { quiet = false } = {}) => {
      try {
        setLoading(true);
        const response = await mealService.getMealsForMap(
          { latitude: lat, longitude: lng },
          radius,
          { mealType: 'physical', status: 'upcoming,ongoing', suppressErrorAlert: true }
        );

        const rawList = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : [];
        setMeals(rawList);

        if (!quiet) {
          if (rawList.length > 0) {
            showToast(
              t('mapUi.foundCount', {
                count: rawList.length,
                defaultValue: `Trovati ${rawList.length} t2t in questa zona.`,
              }),
              'success'
            );
          } else {
            showToast(
              t(
                'mapUi.noneInArea',
                'Nessun t2t dal vivo in questa zona. Sposta la mappa e premi «Cerca in questa zona».'
              ),
              'info'
            );
          }
        }
      } catch (error) {
        console.error('❌ [MapPage] Errore caricamento mappa:', error);
        if (!quiet) {
          showToast(
            t('mapUi.loadError', 'Impossibile caricare i t2t sulla mappa.'),
            'error'
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [showToast, t]
  );

  const getCurrentLocation = useCallback(
    async ({ quiet = false } = {}) => {
      try {
        setLoading(true);
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { Geolocation } = await import('@capacitor/geolocation');
          let permissionStatus = await Geolocation.checkPermissions();

          if (permissionStatus.location !== 'granted') {
            permissionStatus = await Geolocation.requestPermissions();
            if (permissionStatus.location !== 'granted') {
              if (!quiet) {
                showToast(
                  t(
                    'mapUi.locationDenied',
                    'Permesso posizione negato. Cerca manualmente la tua città.'
                  ),
                  'info'
                );
              }
              return false;
            }
          }

          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000,
          });
          const userCoords = [position.coords.latitude, position.coords.longitude];
          setCenter(userCoords);
          mapCenterRef.current = userCoords;
          setUserLocation(userCoords);
          setZoom(14);
          await fetchMealsForMap(userCoords[0], userCoords[1], searchRadius, { quiet });
          if (!quiet) {
            showToast(t('mapUi.locationUpdated', 'Posizione aggiornata!'), 'success');
          }
          return true;
        }

        if (!navigator.geolocation) {
          if (!quiet) {
            showToast(
              t(
                'mapUi.locationUnavailable',
                'Usa la barra in alto per cercare la tua città.'
              ),
              'info'
            );
          }
          return false;
        }

        return await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const userCoords = [position.coords.latitude, position.coords.longitude];
              setCenter(userCoords);
              mapCenterRef.current = userCoords;
              setUserLocation(userCoords);
              setZoom(14);
              await fetchMealsForMap(userCoords[0], userCoords[1], searchRadius, { quiet });
              if (!quiet) {
                showToast(t('mapUi.locationUpdated', 'Posizione aggiornata!'), 'success');
              }
              resolve(true);
            },
            () => {
              if (!quiet) {
                showToast(
                  t(
                    'mapUi.locationUnavailable',
                    'Usa la barra in alto per cercare la tua città.'
                  ),
                  'info'
                );
              }
              resolve(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        });
      } catch (error) {
        console.error('📍 [MapPage] Errore geolocalizzazione:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchMealsForMap, searchRadius, showToast, t]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      const ok = await getCurrentLocation({ quiet: true });
      if (!ok && active) {
        await fetchMealsForMap(DEFAULT_COORDS[0], DEFAULT_COORDS[1], searchRadius, {
          quiet: true,
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [getCurrentLocation, fetchMealsForMap, searchRadius]);

  const mapMarkers = useMemo(
    () =>
      meals
        .filter(
          (m) =>
            m?.location?.coordinates &&
            Array.isArray(m.location.coordinates) &&
            m.location.coordinates.length === 2
        )
        .map((meal) => ({
          id: meal._id,
          lat: meal.location.coordinates[1],
          lng: meal.location.coordinates[0],
          title: meal.title,
          when: formatMealWhen(meal.date, i18n.language),
          city: extractCity(meal.location),
        })),
    [meals, i18n.language]
  );

  const selectedMeal = useMemo(
    () => (selectedMealId ? meals.find((m) => m._id === selectedMealId) || null : null),
    [meals, selectedMealId]
  );

  const handleMealChange = useCallback((updated) => {
    if (!updated || !updated._id) return;
    setMeals((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
  }, []);

  const handleSearchHere = async () => {
    const coords = mapCenterRef.current;
    if (!coords || coords.length !== 2) return;
    await fetchMealsForMap(coords[0], coords[1], searchRadius);
  };

  const handleLocationSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2) return;

    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=it&addressdetails=1`
      );
      const results = await response.json();

      if (Array.isArray(results) && results.length > 0) {
        const place = results[0];
        const newCenter = [parseFloat(place.lat), parseFloat(place.lon)];
        setCenter(newCenter);
        mapCenterRef.current = newCenter;
        setZoom(14);
        await fetchMealsForMap(newCenter[0], newCenter[1], searchRadius);
        showToast(
          t('mapUi.movedTo', {
            place: String(place.display_name || query).split(',')[0],
            defaultValue: `Spostato su: ${String(place.display_name || query).split(',')[0]}`,
          }),
          'success'
        );
      } else {
        showToast(
          t('mapUi.placeNotFound', 'Luogo non trovato. Prova «Milano» o «Roma».'),
          'info'
        );
      }
    } catch (error) {
      console.error('Errore ricerca luogo:', error);
      showToast(
        t('mapUi.connectionError', 'Errore di connessione durante la ricerca.'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMapMove = useCallback((location) => {
    if (location && location.lat != null && location.lng != null) {
      mapCenterRef.current = [location.lat, location.lng];
    }
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1>{t('mapUi.title', 'Mappa')}</h1>
        <p>{t('mapUi.subtitle', 'I tavoli dal vivo vicino a te.')}</p>
      </header>

      <div className={styles.mapWrap}>
        <OpenStreetMapComponent
          center={center}
          zoom={zoom}
          zoomPosition="bottomleft"
          markers={mapMarkers}
          onOpenMeal={(id) => setSelectedMealId(id)}
          onMapMove={handleMapMove}
          userLocation={
            userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null
          }
          height="100%"
          width="100%"
          readOnly
        />

        <form
          className={styles.mapSearch}
          onSubmit={handleLocationSearch}
          role="search"
        >
          <Search size={17} strokeWidth={2} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(
              'mapUi.searchPlaceholder',
              'Cerca città o via (es. Milano)…'
            )}
            aria-label={t(
              'mapUi.searchPlaceholder',
              'Cerca città o via (es. Milano)…'
            )}
            className={styles.searchInput}
            data-testid="map-search-input"
          />
          <button
            type="button"
            className={styles.locateBtn}
            onClick={() => getCurrentLocation({ quiet: false })}
            disabled={loading}
            title={t('mapUi.myLocation', 'La mia posizione')}
            aria-label={t('mapUi.myLocation', 'La mia posizione')}
            data-testid="map-locate-btn"
          >
            <LocateFixed size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={loading || !searchQuery.trim()}
            data-testid="map-go-btn"
          >
            {t('mapUi.go', 'Vai')}
          </Button>
        </form>

        <button
          type="button"
          className={styles.mapHere}
          onClick={handleSearchHere}
          disabled={loading}
          data-testid="map-here-btn"
        >
          🔄{' '}
          {loading
            ? t('mapUi.searching', 'Ricerca…')
            : t('mapUi.searchThisArea', 'Cerca in questa zona')}
        </button>
      </div>

      <MealDetailModal
        meal={selectedMeal}
        isOpen={Boolean(selectedMeal)}
        onClose={() => setSelectedMealId(null)}
        onMealChange={handleMealChange}
        onOpenShare={(targetMeal) => setShareMeal(targetMeal)}
        onToast={showToast}
      />

      <ShareMealModal
        meal={shareMeal}
        isOpen={Boolean(shareMeal)}
        onClose={() => setShareMeal(null)}
        onToast={showToast}
      />

      <Toast
        message={toastState.message}
        visible={toastState.visible}
        tone={toastState.tone}
        onClose={hideToast}
      />
    </div>
  );
};

export default MapPage;
