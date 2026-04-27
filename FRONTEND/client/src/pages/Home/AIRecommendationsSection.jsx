import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Spinner, Badge, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import AIRecommendations from '../../components/AI/AIRecommendations';
import styles from './AIRecommendationsSection.module.css';

const AIRecommendationsSection = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);

  useEffect(() => {
    const getLocation = async () => {
      try {
        // Su mobile, usa Capacitor Geolocation per richiedere permessi esplicitamente
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { Geolocation } = await import('@capacitor/geolocation');
          
          // Richiedi permessi esplicitamente
          const permissionStatus = await Geolocation.checkPermissions();
          console.log('📍 [AIRecommendationsSection] Stato permessi posizione:', permissionStatus);
          
          if (permissionStatus.location !== 'granted') {
            console.log('📍 [AIRecommendationsSection] Richiesta permessi posizione...');
            const requestResult = await Geolocation.requestPermissions();
            console.log('📍 [AIRecommendationsSection] Risultato richiesta permessi:', requestResult);
            
            if (requestResult.location !== 'granted') {
              setLocationError('Permesso posizione negato. Le raccomandazioni AI non sono disponibili.');
              return;
            }
          }
          
          // Ottieni posizione con Capacitor
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000
          });
          
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        } else {
          // Su web, usa navigator.geolocation
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setUserLocation({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                });
              },
              (error) => {
                console.warn('Geolocation error:', error);
                setLocationError('Impossibile ottenere la posizione. Le raccomandazioni AI non sono disponibili.');
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minuti
              }
            );
          } else {
            setLocationError('Geolocalizzazione non supportata dal browser.');
          }
        }
      } catch (error) {
        console.error('📍 [AIRecommendationsSection] Errore geolocalizzazione:', error);
        setLocationError('Errore rilevamento posizione. Le raccomandazioni AI non sono disponibili.');
      }
    };
    
    getLocation();
  }, []);

  const handleMealSelect = (meal) => {
    console.log('Meal selected:', meal);
    // Qui puoi navigare al dettaglio del pasto
    // navigate(`/meals/${meal._id}`);
  };

  if (!user) {
    return null; // Non mostrare se l'utente non è loggato
  }

  return (
    <div className={styles.container}>
      <Card className={styles.mainCard}>
        <Card.Header className={styles.header}>
          <div className={styles.headerContent}>
            <h4 className={styles.title}>
              🤖 Raccomandazioni AI Personalizzate
            </h4>
            <p className={styles.subtitle}>
              Scopri i TableTalk® perfetti per te basati sulle tue preferenze
            </p>
          </div>
        </Card.Header>

        <Card.Body className={styles.body}>
          {locationError ? (
            <Alert variant="warning" className={styles.alert}>
              <Alert.Heading>⚠️ Posizione Richiesta</Alert.Heading>
              <p>{locationError}</p>
              <Button 
                variant="outline-warning" 
                onClick={() => window.location.reload()}
              >
                Riprova
              </Button>
            </Alert>
          ) : !userLocation ? (
            <div className={styles.loadingLocation}>
              <Spinner animation="border" variant="primary" size="sm" />
              <span className="ms-2">Rilevamento posizione...</span>
            </div>
          ) : (
            <div className={styles.recommendationsContainer}>
              {!showRecommendations ? (
                <div className={styles.previewSection}>
                  <Row>
                    <Col md={8}>
                      <h5>🎯 Scopri i TableTalk® perfetti per te</h5>
                      <p className="text-muted">
                        La nostra AI analizza le tue preferenze di cucina, orario, prezzo e gruppo sociale 
                        per consigliarti i pasti più adatti a te.
                      </p>
                      <div className={styles.features}>
                        <div className={styles.feature}>
                          <span className={styles.featureIcon}>🍽️</span>
                          <span>Preferenze culinarie</span>
                        </div>
                        <div className={styles.feature}>
                          <span className={styles.featureIcon}>⏰</span>
                          <span>Orari ideali</span>
                        </div>
                        <div className={styles.feature}>
                          <span className={styles.featureIcon}>💰</span>
                          <span>Budget ottimale</span>
                        </div>
                        <div className={styles.feature}>
                          <span className={styles.featureIcon}>👥</span>
                          <span>Gruppo sociale</span>
                        </div>
                      </div>
                    </Col>
                    <Col md={4} className="text-center">
                      <div className={styles.locationInfo}>
                        <Badge bg="success" className={styles.locationBadge}>
                          📍 Posizione rilevata
                        </Badge>
                        <p className="mt-2 small text-muted">
                          Lat: {userLocation.latitude.toFixed(4)}<br />
                          Lng: {userLocation.longitude.toFixed(4)}
                        </p>
                      </div>
                    </Col>
                  </Row>
                  
                  <div className={styles.actionButtons}>
                    <Button 
                      variant="primary" 
                      size="lg"
                      onClick={() => setShowRecommendations(true)}
                      className={styles.generateButton}
                    >
                      🤖 Genera Raccomandazioni AI
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="lg"
                      className={styles.prefsButton}
                    >
                      ⚙️ Personalizza Preferenze
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.recommendationsSection}>
                  <div className={styles.sectionHeader}>
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => setShowRecommendations(false)}
                      className={styles.backButton}
                    >
                      ← Torna indietro
                    </Button>
                    <h5>Le tue raccomandazioni personalizzate</h5>
                  </div>
                  
                  <AIRecommendations 
                    userLocation={userLocation}
                    onMealSelect={handleMealSelect}
                  />
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default AIRecommendationsSection;
