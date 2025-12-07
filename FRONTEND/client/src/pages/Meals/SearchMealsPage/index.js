import React, { useEffect, useMemo, useState } from 'react';
import { Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaSearch } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { useMeals } from '../../../contexts/MealsContext';
import MealFilters from '../../../components/meals/MealFilters';
import MealsList from '../../../components/meals/MealsList';
import mealService from '../../../services/mealService';
import BackButton from '../../../components/common/BackButton';
import styles from './SearchMealsPage.module.css';

const SearchMealsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { meals, loading, error } = useMeals();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ type: '', mealType: '', status: '', sortBy: 'date' });
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Debounce search on term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults(null);
      setSearchError('');
      return;
    }
    setIsSearching(true);
    setSearchError('');
    const timer = setTimeout(async () => {
      try {
        const res = await mealService.searchMeals(searchTerm);
        setSearchResults(res.data);
      } catch (e) {
        setSearchError(t('meals.searchError'));
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, t]);

  const filteredMeals = useMemo(() => {
    // If we are showing remote search results, filter/sort those
    let base = Array.isArray(searchResults) ? searchResults : meals || [];
    if (filters.type) base = base.filter(m => m.type === filters.type);
    if (filters.mealType) base = base.filter(m => m.mealType === filters.mealType);
    if (filters.status) base = base.filter(m => m.status === filters.status);
    if (filters.sortBy === 'participants') {
      base = [...base].sort((a, b) => (b.participants?.length || 0) - (a.participants?.length || 0));
    } else {
      base = [...base].sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    return base;
  }, [meals, searchResults, filters]);

  return (
    <Container fluid className={styles.page}>
      <div className={styles.header}>
        <BackButton onClick={() => navigate(-1)} />
        <h1 className={styles.pageTitle}>{t('meals.searchTitle', 'Cerca TableTalk')}</h1>
      </div>

      <Link to="/meals/create" className={styles.createButton}>{t('meals.createButton')}</Link>

      <div className={styles.searchBar}>
        <div className={styles.searchContainer}>
          <FaSearch className={styles.searchIcon} />
          <input
            autoFocus
            type="text"
            placeholder={t('meals.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.filtersSection}>
        <MealFilters filters={filters} onFilterChange={setFilters} />
      </div>

      <div className={styles.resultsSection}>
        {isSearching && <div className={styles.infoText}>{t('meals.loading')}</div>}
        {searchError && <div className={styles.errorText}>{searchError}</div>}
        <MealsList meals={filteredMeals} />
        {filteredMeals?.length === 0 && !isSearching && !searchError && (
          <div className={styles.infoText}>{t('meals.noMealsFound', { searchTerm })}</div>
        )}
      </div>
    </Container>
  );
};

export default SearchMealsPage;


