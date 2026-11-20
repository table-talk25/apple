import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useChatDrawer } from '../../../contexts/ChatDrawerContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { getHostAvatarUrl } from '../../../constants/mealConstants';
import Logo from '../../common/Logo';
import LanguageMenu from '../../common/LanguageMenu';
import Notifications from '../../notifications/Notifications';
import { Avatar, Button } from '../../ui';
import { isRouteActive } from '../navRoutes';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { openDrawer } = useChatDrawer();
  const { notifications } = useNotifications();

  const chatUnreadCount = useMemo(() => {
    if (!Array.isArray(notifications)) return 0;
    return notifications.filter(
      (n) => n && n.type === 'new_message' && !(n.read || n.isRead)
    ).length;
  }, [notifications]);

  const displayName = useMemo(() => {
    if (!user) return '';
    return (
      user.name ||
      user.nickname ||
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.email ||
      ''
    );
  }, [user]);

  const avatarSrc = useMemo(() => {
    if (!user?.profileImage) return '';
    return getHostAvatarUrl(user.profileImage);
  }, [user?.profileImage]);

  // Gli utenti autenticati non vedono la Home (landing): "/" reindirizza a Esplora
  const navItems = [
    ...(isAuthenticated ? [] : [{ key: 'home', to: '/', label: t('nav.home', 'Home') }]),
    { key: 'explore', to: '/meals', label: t('nav.explore', 'Esplora') },
    { key: 'map', to: '/map', label: t('nav.map', 'Mappa') },
    { key: 'mine', to: '/my-meals', label: t('nav.myT2t', 'I miei t2t') },
  ];

  return (
    <header className={styles.topbar}>
      <div className={styles.wrap}>
        <Logo to={isAuthenticated ? '/meals' : '/'} />

        <nav
          className={styles.nav}
          aria-label={t('nav.mainNavLabel', 'Navigazione principale')}
        >
          {navItems.map((item) => {
            const active = isRouteActive(item.key, location.pathname);
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`${styles.navLink} ${active ? styles.active : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.topActions}>
          <Button
            variant="primary"
            size="sm"
            to="/meals/create"
            className={styles.createBtn}
          >
            ＋ {t('nav.create', 'Crea')}
          </Button>

          <div className={styles.langWrap}>
            <LanguageMenu />
          </div>

          {isAuthenticated ? (
            <>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={openDrawer}
                aria-label={t('nav.chat', 'Chat')}
              >
                <span className={styles.iconEmoji} aria-hidden="true">💬</span>
                {chatUnreadCount > 0 && (
                  <span className={styles.dot}>
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
              </button>

              <Notifications />

              <Link
                to="/impostazioni/profilo"
                className={`${styles.avatarLink} ${
                  isRouteActive('profile', location.pathname) ? styles.avatarActive : ''
                }`}
                aria-label={t('nav.profile', 'Profilo')}
              >
                <Avatar src={avatarSrc} name={displayName} size="md" tone="accent" />
              </Link>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              to="/login"
              className={styles.loginBtn}
            >
              {t('nav.login', 'Accedi')}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
