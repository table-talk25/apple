import React, { Component, useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const createTablePinIcon = () =>
  L.divIcon({
    className: '',
    html: '<div class="tt-map-pin"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });

const createUserPinIcon = () =>
  L.divIcon({
    className: '',
    html: '<div class="tt-map-user-pin"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });

const tablePinIcon = createTablePinIcon();
const userPinIcon = createUserPinIcon();

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err) {
    console.error('[Map] Errore rendering mappa:', err);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function MapSizeInvalidator() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (_) {}
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

function FlyToMarker({ position, zoom }) {
  const map = useMap();
  const lat = position?.lat;
  const lng = position?.lng;

  useEffect(() => {
    if (lat != null && lng != null) {
      const targetZoom = zoom || map.getZoom();
      map.flyTo([lat, lng], targetZoom, { duration: 1.2 });
    }
  }, [lat, lng, zoom, map]);

  return null;
}

function CenterUpdater({ center, zoom }) {
  const map = useMap();
  const lat = Array.isArray(center) ? center[0] : null;
  const lng = Array.isArray(center) ? center[1] : null;

  useEffect(() => {
    if (lat != null && lng != null) {
      const targetZoom = zoom || map.getZoom();
      map.flyTo([lat, lng], targetZoom, { duration: 1.2 });
    }
  }, [lat, lng, zoom, map]);

  return null;
}

function LocationPicker({ onLocationSelect, onMapClick, onMapMove, readOnly = false }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (onMapClick) onMapClick();
      if (!readOnly && onLocationSelect) {
        onLocationSelect({ lat, lng });
      }
    },
    moveend() {
      if (onMapMove) {
        const c = map.getCenter();
        onMapMove({ lat: c.lat, lng: c.lng });
      }
    },
  });

  return null;
}

const OpenStreetMapComponent = ({
  meals = [],
  markers = [],
  onLocationSelect,
  onMarkerClick,
  onOpenMeal,
  onMapClick,
  onMapMove,
  selectedLocation,
  userLocation = null,
  zoom = 13,
  zoomPosition = 'bottomleft',
  height = '400px',
  width = '100%',
  center = [45.4642, 9.19],
  readOnly = false,
  showFallbackCta = true,
  forceFallback = false,
}) => {
  const { t } = useTranslation();
  const [tileFailed, setTileFailed] = useState(
    () =>
      Boolean(forceFallback) ||
      (typeof navigator !== 'undefined' && navigator.onLine === false)
  );
  const [retryKey, setRetryKey] = useState(0);
  const tileLoadCountRef = useRef(0);
  const tileErrorCountRef = useRef(0);

  useEffect(() => {
    if (forceFallback) {
      setTileFailed(true);
    }
  }, [forceFallback]);

  useEffect(() => {
    const handleOffline = () => setTileFailed(true);
    const handleOnline = () => {
      tileErrorCountRef.current = 0;
      setTileFailed(false);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleRetryMap = () => {
    tileLoadCountRef.current = 0;
    tileErrorCountRef.current = 0;
    setTileFailed(false);
    setRetryKey((k) => k + 1);
  };

  const fallbackNode = (
    <div
      data-testid="map-fallback"
      style={{
        width: '100%',
        height: height === '100%' ? '100%' : height,
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '28px 20px',
        gap: '10px',
        backgroundColor: 'var(--tt-background)',
        color: 'var(--tt-text-muted)',
        borderRadius: 'var(--tt-radius-lg)',
      }}
    >
      <div style={{ fontSize: '2.2rem', lineHeight: 1 }} aria-hidden="true">
        🗺️
      </div>
      <strong style={{ color: 'var(--tt-text)', fontSize: '1rem' }}>
        {t('mapUi.fallbackTitle', 'La mappa interattiva non è disponibile al momento.')}
      </strong>
      <p style={{ margin: 0, maxWidth: '38ch', fontSize: '0.9rem' }}>
        {t('mapUi.fallbackDesc', 'I tavoli dal vivo sono comunque elencati in Esplora.')}
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
        {showFallbackCta && (
          <Link
            to="/meals"
            style={{
              backgroundColor: 'var(--tt-primary)',
              color: 'var(--tt-on-primary)',
              borderRadius: 'var(--tt-radius-md)',
              padding: '0.5rem 1rem',
              fontWeight: 600,
              fontSize: '0.88rem',
              textDecoration: 'none',
            }}
          >
            {t('mapUi.fallbackCta', 'Vai a Esplora →')}
          </Link>
        )}
        <button
          type="button"
          onClick={handleRetryMap}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--tt-accent)',
            border: '1.5px solid var(--tt-accent)',
            borderRadius: 'var(--tt-radius-md)',
            padding: '0.45rem 0.95rem',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          {t('mapUi.fallbackRetry', 'Riprova')}
        </button>
      </div>
    </div>
  );

  if (tileFailed) {
    return fallbackNode;
  }

  return (
    <MapErrorBoundary fallback={fallbackNode}>
      <div style={{ width, height: '100%', position: 'relative' }}>
        <MapContainer
          key={retryKey}
          center={center}
          zoom={zoom}
          zoomControl={false}
          style={{ height, width }}
        >
          <ZoomControl position={zoomPosition} />
          <MapSizeInvalidator />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            eventHandlers={{
              tileload: () => {
                tileLoadCountRef.current += 1;
              },
              tileerror: () => {
                tileErrorCountRef.current += 1;
                if (tileLoadCountRef.current === 0 && tileErrorCountRef.current >= 4) {
                  setTileFailed(true);
                }
              },
            }}
          />

          <CenterUpdater center={center} zoom={zoom} />

          <LocationPicker
            onLocationSelect={onLocationSelect}
            onMapClick={onMapClick}
            onMapMove={onMapMove}
            readOnly={readOnly}
          />

          {selectedLocation && <FlyToMarker position={selectedLocation} zoom={zoom} />}

          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userPinIcon}>
              <Popup>
                <div className="tt-map-popup">
                  <div className="tt-map-popup-title">
                    {t('mapUi.youAreHere', 'Tu sei qui')}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {selectedLocation && (
            <Marker
              position={[selectedLocation.lat, selectedLocation.lng]}
              icon={tablePinIcon}
            >
              <Popup>
                <div className="tt-map-popup">
                  <div className="tt-map-popup-title">
                    {t('mapUi.selectedLocation', 'Posizione selezionata')}
                  </div>
                  <p className="tt-map-popup-meta">
                    {selectedLocation.address ||
                      `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {markers.map((marker, idx) => (
            <Marker
              key={marker.id || `${marker.lat}-${marker.lng}-${idx}`}
              position={[marker.lat, marker.lng]}
              icon={tablePinIcon}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick && marker.id) onMarkerClick(marker.id);
                },
              }}
            >
              <Popup>
                <div className="tt-map-popup" data-testid={`map-popup-${marker.id || idx}`}>
                  <div className="tt-map-popup-title">{marker.title || marker.name}</div>
                  {(marker.when || marker.date) && (
                    <p className="tt-map-popup-meta">
                      🕒 {marker.when || marker.date}
                    </p>
                  )}
                  {marker.city && (
                    <p className="tt-map-popup-meta">📍 {marker.city}</p>
                  )}
                  {onOpenMeal && marker.id && (
                    <button
                      type="button"
                      className="tt-map-popup-btn"
                      onClick={() => onOpenMeal(marker.id)}
                    >
                      {t('mapUi.openDetails', 'Vedi dettagli →')}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {meals.map((meal) => (
            <Marker
              key={meal.id}
              position={[meal.lat, meal.lng]}
              icon={tablePinIcon}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) onMarkerClick(meal.id);
                },
              }}
            >
              <Popup>
                <div className="tt-map-popup">
                  <div className="tt-map-popup-title">{meal.name}</div>
                  {(meal.restaurant || meal.address) && (
                    <p className="tt-map-popup-meta">
                      📍 {meal.restaurant || meal.address}
                    </p>
                  )}
                  {meal.date && <p className="tt-map-popup-meta">🕒 {meal.date}</p>}
                  <button
                    type="button"
                    className="tt-map-popup-btn"
                    onClick={() => {
                      if (onOpenMeal) onOpenMeal(meal.id);
                    }}
                  >
                    {t('mapUi.joinT2t', 'Partecipa al t2t')}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </MapErrorBoundary>
  );
};

export default OpenStreetMapComponent;
