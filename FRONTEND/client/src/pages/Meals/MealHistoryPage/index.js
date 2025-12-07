import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Tab, Nav, Spinner, Alert, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaUtensils, FaCalendarCheck } from 'react-icons/fa';
import mealService from '../../../services/mealService';
import MealCard from '../../../components/meals/MealCard';
import { useAuth } from '../../../contexts/AuthContext';
import BackButton from '../../../components/common/BackButton';
import styles from './MealHistoryPage.module.css';

const MealHistoryPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allMeals, setAllMeals] = useState([]);
  const [activeTab, setActiveTab] = useState('hosting'); // 'hosting' | 'joining'

  useEffect(() => {
    const fetchMyMeals = async () => {
      try {
        setLoading(true);
        // Recupera tutti i pasti associati all'utente (sia come host che partecipante)
        // Il backend restituisce già ordinato per data
        const response = await mealService.getUserMeals();
        setAllMeals(response.data || []);
      } catch (err) {
        console.error('Errore caricamento pasti:', err);
        setError(t('common.errorLoading') || 'Errore nel caricamento dei pasti');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchMyMeals();
    }
  }, [user, t]);

  // Logica di filtraggio: Separiamo i pasti creati da quelli a cui si partecipa
  const myHostedMeals = allMeals.filter(meal => {
    const hostId = meal.host?._id || meal.host;
    const myId = user?._id || user?.id;
    return hostId === myId;
  });

  const myJoinedMeals = allMeals.filter(meal => {
    const hostId = meal.host?._id || meal.host;
    const myId = user?._id || user?.id;
    return hostId !== myId;
  });

  // Helper per renderizzare la lista o il messaggio "vuoto"
  const renderMealList = (meals, emptyMessage, icon) => {
    if (meals.length === 0) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>{icon}</div>
          <h3>{t('common.noMealsFound') || 'Nessun pasto trovato'}</h3>
          <p>{emptyMessage}</p>
          <Button 
            variant="primary" 
            className={styles.createButton}
            onClick={() => navigate('/meals/create')}
          >
            <FaPlus className="me-2" /> {t('meals.createButton') || 'Crea un TableTalk'}
          </Button>
        </div>
      );
    }

    return (
      <Row>
        {meals.map(meal => (
          <Col key={meal._id} xs={12} md={6} lg={4} className="mb-4">
            <MealCard meal={meal} />
          </Col>
        ))}
      </Row>
    );
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Container className="py-3">
        <div className={styles.header}>
          <BackButton />
          <h1 className={styles.title}>{t('profile.myMeals') || 'I Miei TableTalk'}</h1>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <Tab.Container id="my-meals-tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
          <div className={styles.tabsWrapper}>
            <Nav variant="pills" className="justify-content-center mb-4">
              <Nav.Item>
                <Nav.Link eventKey="hosting" className={styles.tabLink}>
                  <FaUtensils className="me-2" />
                  {t('profile.tabs.hosting') || 'Organizzo io'} 
                  <span className={styles.badge}>{myHostedMeals.length}</span>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="joining" className={styles.tabLink}>
                  <FaCalendarCheck className="me-2" />
                  {t('profile.tabs.joining') || 'Partecipo'}
                  <span className={styles.badge}>{myJoinedMeals.length}</span>
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>

          <Tab.Content>
            <Tab.Pane eventKey="hosting">
              {renderMealList(
                myHostedMeals, 
                t('profile.noHostedMeals') || 'Non hai ancora organizzato nessun TableTalk.',
                <FaUtensils />
              )}
            </Tab.Pane>
            <Tab.Pane eventKey="joining">
              {renderMealList(
                myJoinedMeals, 
                t('profile.noJoinedMeals') || 'Non ti sei ancora iscritto a nessun TableTalk.',
                <FaCalendarCheck />
              )}
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Container>
    </div>
  );
};

export default MealHistoryPage;
