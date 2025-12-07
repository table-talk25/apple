// File: /pages/Auth/Login/index.js (Versione Corretta)

import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { getPreference, savePreference, removePreference, PREFERENCE_KEYS } from '../../../utils/preferences';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Logo from '../../../components/common/Logo';
import SocialLoginButtons from '../../../components/common/SocialLoginButtons';
import styles from './LoginPage.module.css';
import BackButton from '../../../components/common/BackButton';
import { useRedirectAfterAuth } from '../../../hooks/useRedirectAfterAuth';

const LoginPage = () => {
  console.log('🔥🔥🔥 LOGIN PAGE LOADED 🔥🔥🔥');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { redirectAfterAuth, savedPath } = useRedirectAfterAuth();
  const searchParams = new URLSearchParams(location.search);
  const reason = searchParams.get('reason');
  const nextUrl = searchParams.get('next');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 

  // Precarica l'email salvata in passato, se presente
  useEffect(() => {
    (async () => {
      try {
        const savedEmail = await getPreference(PREFERENCE_KEYS.LAST_LOGIN_EMAIL, '');
        if (savedEmail) {
          setFormData((prev) => ({ ...prev, email: savedEmail }));
          setRememberEmail(true);
        }
      } catch {}
    })();
  }, []);

  // Se già autenticato, usa il redirect intelligente
  useEffect(() => {
    if (isAuthenticated) {
      redirectAfterAuth('/meals');
    }
  }, [isAuthenticated, redirectAfterAuth]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('🔥 Form field changed:', name, value === 'password' ? '***' : value);
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    console.log('🔥 Normal login started');
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('🔥 Calling login with formData:', { email: formData.email, password: '***' });
      await login(formData); 
      console.log('🔥 Login successful');
      
      // Salva o rimuove l'email in base al toggle
      try {
        if (rememberEmail) {
          console.log('🔥 Saving email preference');
          await savePreference(PREFERENCE_KEYS.LAST_LOGIN_EMAIL, formData.email);
        } else {
          console.log('🔥 Removing email preference');
          await removePreference(PREFERENCE_KEYS.LAST_LOGIN_EMAIL);
        }
      } catch {}
      
      // 🔄 REDIRECT INTELLIGENTE: Vai alla pagina originale o fallback
      console.log('🔥 Redirecting after auth');
      redirectAfterAuth('/meals');
    
    } catch (err) {
      console.error('🔥 Normal login error:', err);
      console.error('Errore durante il login:', err);
      setError(err.message || t('auth.loginError'));
    } finally {
      console.log('🔥 Normal login finished');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
        <div style={{ padding: '12px 16px' }}>
            <BackButton />
        </div>
        <div className={styles.card}>
            <div className={styles.logoContainer}>
                <Link to="/" className={styles.logoLink}>
                    <Logo />
                </Link>
            </div>
            <h2 className={styles.title}>{t('auth.loginToTableTalk')}</h2>
            
            {/* Messaggio sessione scaduta */}
            {reason === 'session_expired' && (
              <Alert variant="warning" className="mb-3">
                <strong>{t('auth.sessionExpired') || 'Sessione scaduta'}</strong>
                <div>{t('auth.sessionExpiredMessage') || 'Per favore accedi nuovamente per continuare.'}</div>
              </Alert>
            )}
            
            {/* 🔄 Indicatore redirect intelligente */}
            {savedPath && savedPath !== '/login' && (
              <Alert variant="info" className="mb-3">
                <small>
                  <strong>💡 Dopo il login verrai reindirizzato a:</strong><br />
                  {savedPath === '/meals' ? '🏠 Pagina principale' : 
                   savedPath.includes('/meals/') ? '🍽️ Dettaglio pasto' :
                   savedPath === '/map' ? '🗺️ Mappa' :
                   savedPath === '/impostazioni/profilo' ? '👤 Profilo' :
                   savedPath === '/my-meals' ? '📋 I miei pasti' :
                   savedPath === '/chat/' ? '💬 Chat' :
                   savedPath}
                </small>
              </Alert>
            )}
            
            {location.state?.message && <Alert variant="success">{location.state.message}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form onSubmit={(e) => {
              console.log('Button clicked - before normal login call');
              handleSubmit(e);
            }} autoComplete="on">
                    <Form.Group className="mb-3">
                    <Form.Label className={styles.formLabel}>{t('auth.email')}</Form.Label>
                    <Form.Control
                        className={styles.formInput}
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={t('auth.emailPlaceholder')}
                            autoComplete="username"
                            inputMode="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      id="remember-email"
                      label={t('auth.rememberEmail') || 'Ricorda email'}
                      checked={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.checked)}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label className={styles.formLabel}>{t('auth.password')}</Form.Label>
                    <InputGroup className={styles.inputGroup}>
                        <Form.Control
                            className={styles.formInput}
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder={t('auth.passwordPlaceholder')}
                            autoComplete="current-password"
                            required
                        />
                        <InputGroup.Text
                            onClick={() => setShowPassword(!showPassword)}
                            className={styles.passwordToggle}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </InputGroup.Text>
                    </InputGroup>
                </Form.Group>

                <Button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={isLoading}
                >
                    {isLoading ? t('auth.loggingIn') : t('auth.login')}
                </Button>
            </Form>

            {/* Blocco registrazione */}
            <div className="mt-4 text-center">
                <p className="text-muted">
                    {t('auth.alreadyHaveAccount') || 'Non hai ancora un account?'}
                    {' '}
                    <Link to="/register" className="text-primary fw-bold" style={{ textDecoration: 'none' }}>
                        {t('auth.register') || 'Registrati ora'}
                    </Link>
                </p>
            </div>

            {/* Pulsanti di login social */}
            <SocialLoginButtons
                onSuccess={(result) => {
                    console.log('Login social completato:', result);
                    // 🔄 REDIRECT INTELLIGENTE: Usa lo stesso sistema del login normale
                    redirectAfterAuth('/meals');
                }}
                onError={(errorMessage) => {
                    setError(errorMessage);
                }}
                disabled={isLoading}
            />

            <div className={styles.links}>
                <Link to="/forgot-password" className={styles.link}>
                    {t('auth.forgotPassword')}
                </Link>
                <Link to="/register" className={styles.link}>
                    {t('auth.alreadyHaveAccount')}
                </Link>
            </div>
        </div>
    </div>
  );
};

export default LoginPage;
