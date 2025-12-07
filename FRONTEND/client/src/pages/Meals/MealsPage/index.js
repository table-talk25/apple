import React, { useState, useEffect, useMemo } from 'react'; 
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import mealService from '../../../services/mealService';
import { useMeals } from '../../../contexts/MealsContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Spinner, Container, Badge } from 'react-bootstrap';
import { FaSearch, FaUtensils, FaStar, FaMagic } from 'react-icons/fa';
import { useMealTranslations } from '../../../hooks/useMealTranslations';
import styles from './MealsPage.module.css';
import BackButton from '../../../components/common/BackButton';
import MealsList from '../../../components/meals/MealsList';
import AIRecommendations from '../../../components/AI/AIRecommendations';

const MealsPage = () => {
  const { t } = useTranslation();
  const { getMealTypeText } = useMealTranslations();
  const navigate = useNavigate();
  
  // Hooks
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { meals, loading, error, fetchMeals } = useMeals();
  
  // Stato locale per la ricerca
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // Stato per posizione utente (per AI)
  const [userLocation, setUserLocation] = useState(null);

  // 1. Caricamento iniziale
  useEffect(() => {
    console.log('🔄 MealsPage: Caricamento feed...');
    fetchMeals({ status: 'upcoming,ongoing' });
    // eslint-disable-next-line
  }, []);

  // 1.5. Geolocalizzazione per AI
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('Posizione non disponibile per AI:', error);
          // Fallback opzionale: coordinate di default (es. Roma/Milano) o null
        }
      );
    }
  }, []);

  // 2. Logica di Ricerca
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults(null);
      setSearchError('');
      return;
    }
    setIsSearching(true);
    setSearchError('');
    
    const timeoutId = setTimeout(async () => {
      try {
        const response = await mealService.searchMeals(searchTerm);
        setSearchResults(response.data);
      } catch (error) {
        setSearchError(t('meals.searchError'));
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, t]);

  // 3. LOGICA RAGGRUPPAMENTO (rimossa logica matching locale, ora usa AI)
  const groupedMeals = useMemo(() => {
    if (searchResults) return {};

    // A. Filtra base: No miei pasti, solo futuri
    const availableMeals = (meals || []).filter(meal => {
      const hostId = meal.host?._id || meal.host;
      const myId = user?._id || user?.id;
      const isMyMeal = hostId === myId;
      const isFuture = new Date(meal.date) > new Date();

      return !isMyMeal && isFuture;
    });

    // B. Raggruppa per categoria (Standard Feed)
    // Ordina per data i pasti per il feed normale
    const sortedByDate = [...availableMeals].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const grouped = sortedByDate.reduce((acc, meal) => {
      const type = meal.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(meal);
      return acc;
    }, {});

    return grouped;
  }, [meals, searchResults, user]);

  // Redirect
  if (!authLoading && !isAuthenticated) return <Navigate to="/login" replace />;
  if (authLoading) return <Container fluid className="d-flex justify-content-center align-items-center vh-100"><Spinner animation="border" /></Container>;

  const renderContent = () => {
    // Stati di ricerca/errore...
    if (isSearching) return <div className="text-center py-4"><Spinner animation="border" size="sm" /> {t('meals.loading')}</div>;
    if (searchError) return <div className="text-center py-4 text-danger">{searchError}</div>;
    if (searchResults) {
      return searchResults.length > 0 ? <div className="mt-3"><h5>Risultati</h5><MealsList meals={searchResults} /></div> : <div className="text-center py-5 text-muted">Nessun risultato.</div>;
    }

    if (loading && (!meals || meals.length === 0)) return <div className="text-center py-5"><Spinner animation="border" /></div>;
    if (error) return <div className="text-center py-5 text-danger">{error}</div>;

    // Feed Vuoto
    if (Object.keys(groupedMeals).length === 0) {
      return (
        <div className={styles.emptyFeed}> 
          <div className={styles.heroCard}>
            <FaUtensils size={40} className="mb-3 text-primary" />
            <h2>{t('meals.emptyFeed.title')}</h2>
            <p>{t('meals.emptyFeed.description')}</p>
            <Link to="/meals/create" className={styles.ctaPrimary}>{t('meals.createButton')}</Link>
          </div>
        </div>
      );
    }

    const typeOrder = ['breakfast', 'lunch', 'dinner', 'snack', 'drink', 'other'];
    const sortedTypes = Object.keys(groupedMeals).sort((a, b) => {
        const indexA = typeOrder.indexOf(a);
        const indexB = typeOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return (
      <>
        {/* ✨ SEZIONE AI REALE (Sostituisce quella calcolata localmente) */}
        {/* Mostra solo se non stiamo cercando e abbiamo la posizione */}
        {!searchResults && userLocation && (
          <AIRecommendations 
            userLocation={userLocation} 
            onMealSelect={(meal) => navigate(`/meals/${meal._id}`)}
          />
        )}

        {/* Feed Categorie Standard */}
        {sortedTypes.map((type) => (
          <div key={type} className={styles.sectionWrapper}>
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>{getMealTypeText(type)}</h3>
                <span className={styles.sectionCount}>{groupedMeals[type].length}</span>
            </div>
            <MealsList meals={groupedMeals[type]} />
          </div>
        ))}
      </>
    );
  };

  return (
    <Container fluid className={styles.mealsPage}>
      <div className={styles.topBar}>
        <BackButton className={styles.backButton} />
        <h1 className={styles.pageTitle}>Esplora</h1>
        <div style={{ width: 40 }}></div>
      </div>

      <div className={styles.searchWrapper}>
        <div className={styles.searchContainer}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder={t('meals.searchPlaceholder')}
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.content}>
        {renderContent()}
      </div>
      
      <Link to="/meals/create" className={styles.fabButton}>
        <span className={styles.fabIcon}>+</span>
      </Link>
    </Container>
  );
};

export default MealsPage;
