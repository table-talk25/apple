import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Search, Users, Shuffle, MapPin, CalendarDays } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { isRouteActive } from '../navRoutes';
import styles from './BottomNav.module.css';

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (
    location.pathname.startsWith('/chat') ||
    location.pathname.startsWith('/video')
  ) {
    return null;
  }

  const items = [
    ...(isAuthenticated
      ? []
      : [{ key: 'home', to: '/', label: t('nav.home', 'Home'), Icon: Home }]),
    { key: 'explore', to: '/explore', label: t('nav.explore', 'Esplora'), Icon: Search },
    { key: 'tribe', to: '/tribe', label: t('nav.tribe', 'Tribù'), Icon: Users },
    { key: 'surprise', to: '/surprise', label: t('nav.surprise', 'Sorpresa'), Icon: Shuffle },
    { key: 'map', to: '/map', label: t('nav.map', 'Mappa'), Icon: MapPin },
    {
      key: 'mine',
      to: '/my-meals',
      label: t('nav.myT2tShort', 'I miei'),
      Icon: CalendarDays,
    },
  ];

  return (
    <nav
      className={styles.bottomNav}
      aria-label={t('nav.mobileNavLabel', 'Navigazione mobile')}
    >
      {items.map(({ key, to, label, Icon, isCenter }) => {
        const active = isRouteActive(key, location.pathname);

        if (isCenter) {
          return (
            <Link
              key={key}
              to={to}
              className={`${styles.item} ${active ? styles.active : ''}`}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <span className={styles.plusBtn} aria-hidden="true">
                <Icon size={22} strokeWidth={2.5} />
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={key}
            to={to}
            className={`${styles.item} ${active ? styles.active : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.9} className={styles.ico} />
            <span className={styles.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
