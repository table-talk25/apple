import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import styles from './UserPreferences.module.css';

const UserPreferences = ({ onPreferencesUpdated }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/ai/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setPreferences(data.data);
      } else {
        setError(data.message || 'Errore nel caricamento delle preferenze');
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/ai/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Preferenze salvate con successo!');
        onPreferencesUpdated && onPreferencesUpdated(data.data);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Errore nel salvataggio');
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Errore di connessione');
    } finally {
      setSaving(false);
    }
  };

  const resetPreferences = async () => {
    if (!window.confirm('Sei sicuro di voler ripristinare le preferenze ai valori di default?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await fetch('/api/ai/preferences', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setPreferences(data.data);
        setSuccess('Preferenze ripristinate ai valori di default');
        onPreferencesUpdated && onPreferencesUpdated(data.data);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Errore nel ripristino');
      }
    } catch (err) {
      console.error('Error resetting preferences:', err);
      setError('Errore di connessione');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (category, key, value) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const updateNestedPreference = (category, subcategory, key, value) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subcategory]: {
          ...prev[category][subcategory],
          [key]: value
        }
      }
    }));
  };

  const renderSlider = (label, value, onChange, min = -1, max = 1) => (
    <div className={styles.sliderContainer}>
      <label className={styles.sliderLabel}>
        {label}: <span className={styles.sliderValue}>{Math.round(value * 100)}%</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={styles.slider}
      />
      <div className={styles.sliderLabels}>
        <span>Non mi piace</span>
        <span>Neutro</span>
        <span>Mi piace molto</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Caricamento preferenze...</p>
      </div>
    );
  }

  if (!preferences) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Errore</Alert.Heading>
        <p>{error || 'Impossibile caricare le preferenze'}</p>
        <Button variant="outline-danger" onClick={loadPreferences}>
          Riprova
        </Button>
      </Alert>
    );
  }

  return (
    <div className={styles.container}>
      <Card>
        <Card.Header className={styles.header}>
          <h4>🤖 Preferenze AI</h4>
          <p className="mb-0">Personalizza le tue raccomandazioni</p>
        </Card.Header>

        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <Tabs defaultActiveKey="cuisine" className={styles.tabs}>
            {/* CUCINA */}
            <Tab eventKey="cuisine" title="🍽️ Cucina">
              <div className={styles.tabContent}>
                <h5>Preferenze Culinarie</h5>
                <p className="text-muted">Indica quanto ti piacciono questi tipi di cucina</p>
                
                <Row>
                  {Object.entries(preferences.cuisinePreferences || {}).map(([cuisine, value]) => (
                    <Col md={6} key={cuisine}>
                      {renderSlider(
                        cuisine.charAt(0).toUpperCase() + cuisine.slice(1),
                        value,
                        (newValue) => updatePreference('cuisinePreferences', cuisine, newValue)
                      )}
                    </Col>
                  ))}
                </Row>
              </div>
            </Tab>

            {/* ORARIO */}
            <Tab eventKey="time" title="⏰ Orario">
              <div className={styles.tabContent}>
                <h5>Preferenze Orario</h5>
                <p className="text-muted">Quando preferisci mangiare?</p>
                
                <Row>
                  {Object.entries(preferences.timePreferences || {}).map(([time, value]) => (
                    <Col md={6} key={time}>
                      {renderSlider(
                        time.charAt(0).toUpperCase() + time.slice(1),
                        value,
                        (newValue) => updatePreference('timePreferences', time, newValue)
                      )}
                    </Col>
                  ))}
                </Row>
              </div>
            </Tab>

            {/* PREZZO */}
            <Tab eventKey="price" title="💰 Prezzo">
              <div className={styles.tabContent}>
                <h5>Preferenze Prezzo</h5>
                <p className="text-muted">Quale fascia di prezzo preferisci?</p>
                
                <Row>
                  {Object.entries(preferences.priceRange || {}).map(([range, value]) => (
                    <Col md={4} key={range}>
                      {renderSlider(
                        range.charAt(0).toUpperCase() + range.slice(1),
                        value,
                        (newValue) => updatePreference('priceRange', range, newValue)
                      )}
                    </Col>
                  ))}
                </Row>
              </div>
            </Tab>

            {/* SOCIALE */}
            <Tab eventKey="social" title="👥 Sociale">
              <div className={styles.tabContent}>
                <h5>Preferenze Sociali</h5>
                <p className="text-muted">Che tipo di gruppo preferisci?</p>
                
                <Row>
                  {Object.entries(preferences.socialPreferences?.groupSize || {}).map(([size, value]) => (
                    <Col md={4} key={size}>
                      {renderSlider(
                        size.charAt(0).toUpperCase() + size.slice(1),
                        value,
                        (newValue) => updateNestedPreference('socialPreferences', 'groupSize', size, newValue)
                      )}
                    </Col>
                  ))}
                </Row>
              </div>
            </Tab>

            {/* LOCATION */}
            <Tab eventKey="location" title="📍 Posizione">
              <div className={styles.tabContent}>
                <h5>Preferenze Posizione</h5>
                <p className="text-muted">Configura le tue preferenze di distanza</p>
                
                <Form.Group className="mb-3">
                  <Form.Label>Distanza massima (km)</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="100"
                    value={preferences.locationPreferences?.maxDistance || 15}
                    onChange={(e) => updateNestedPreference('locationPreferences', null, 'maxDistance', parseInt(e.target.value))}
                  />
                </Form.Group>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>

        <Card.Footer className={styles.footer}>
          <div className={styles.buttonGroup}>
            <Button 
              variant="outline-secondary" 
              onClick={resetPreferences}
              disabled={saving}
            >
              🔄 Ripristina
            </Button>
            <Button 
              variant="primary" 
              onClick={savePreferences}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Salvando...
                </>
              ) : (
                '💾 Salva Preferenze'
              )}
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
};

export default UserPreferences;
