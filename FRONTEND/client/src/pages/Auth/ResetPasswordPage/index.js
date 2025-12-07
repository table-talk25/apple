// File: src/pages/Auth/ResetPasswordPage/index.js
// 🔑 PAGINA RESET PASSWORD
// 
// Questa pagina permette agli utenti di inserire una nuova password
// dopo aver cliccato sul link nell'email di reset

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import styles from './ResetPasswordPage.module.css';

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams();
  
  // Stato del form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  
  // Stato per mostrare/nascondere password
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Validazione password
  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    };
  };

  // Verifica token all'avvio
  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  // Verifica validità token
  const verifyToken = async () => {
    try {
      const response = await fetch(`/api/auth/verify-reset-token?token=${token}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setTokenValid(true);
        setUserInfo(data.user);
      } else {
        setTokenValid(false);
        setError(data.message || 'Token non valido o scaduto');
      }
    } catch (error) {
      console.error('Errore nella verifica token:', error);
      setTokenValid(false);
      setError('Errore di connessione durante la verifica del token');
    }
  };

  // Gestione invio form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validazione
    if (!newPassword.trim()) {
      setError('Inserisci una nuova password');
      return;
    }
    
    if (!confirmPassword.trim()) {
      setError('Conferma la nuova password');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }
    
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setError('La password deve essere di almeno 8 caratteri e contenere maiuscole, minuscole, numeri e caratteri speciali');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: token,
          newPassword: newPassword.trim() 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setIsSuccess(true);
        toast.success('Password resettata con successo! Ora puoi accedere con le nuove credenziali.');
      } else {
        setError(data.message || 'Errore nel reset della password');
        toast.error('Errore nel reset della password');
      }
    } catch (error) {
      console.error('Errore nel reset password:', error);
      setError('Errore di connessione. Riprova più tardi.');
      toast.error('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  // Gestione cambio password
  const handlePasswordChange = (e) => {
    setNewPassword(e.target.value);
    if (error) setError('');
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if (error) setError('');
  };

  // Se il token non è valido, mostra errore
  if (!tokenValid && !isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorHeader}>
            <FaExclamationTriangle className={styles.errorIcon} />
            <h1>Token Non Valido</h1>
            <p>{error}</p>
          </div>
          
          <div className={styles.errorContent}>
            <div className={styles.infoBox}>
              <h3>🔑 Possibili cause:</h3>
              <ul>
                <li>Il link è scaduto (valido per 1 ora)</li>
                <li>Il link è già stato utilizzato</li>
                <li>Il link non è corretto</li>
              </ul>
            </div>
            
            <div className={styles.actions}>
              <Link to="/forgot-password" className={styles.primaryButton}>
                Richiedi Nuovo Reset
              </Link>
              
              <Link to="/login" className={styles.secondaryButton}>
                <FaArrowLeft /> Torna al Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se il reset è completato con successo
  if (isSuccess) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successHeader}>
            <FaCheckCircle className={styles.successIcon} />
            <h1>Password Resettata!</h1>
            <p>Ora puoi accedere con le nuove credenziali</p>
          </div>
          
          <div className={styles.successContent}>
            <div className={styles.infoBox}>
              <h3>✅ Cosa è successo:</h3>
              <ul>
                <li>La tua password è stata aggiornata con successo</li>
                <li>I token di reset sono stati invalidati</li>
                <li>Ora puoi accedere con la nuova password</li>
              </ul>
            </div>
            
            <div className={styles.securityNotice}>
              <h4>🔒 Sicurezza:</h4>
              <ul>
                <li>Non condividere la tua nuova password</li>
                <li>Usa una password forte e unica</li>
                <li>Considera l'uso di un gestore password</li>
              </ul>
            </div>
            
            <div className={styles.actions}>
              <Link to="/login" className={styles.primaryButton}>
                Accedi Ora
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se sta caricando, mostra spinner
  if (isLoading && !tokenValid) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loadingHeader}>
            <div className={styles.spinner}></div>
            <h2>Verifica Token...</h2>
            <p>Stiamo verificando la validità del link</p>
          </div>
        </div>
      </div>
    );
  }

  // Form principale per il reset password
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <Link to="/login" className={styles.backButton}>
            <FaArrowLeft /> Torna al Login
          </Link>
          
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🍽️</span>
            <h1>TableTalk</h1>
          </div>
          
          <h2>Reset Password</h2>
          {userInfo && (
            <p>Ciao {userInfo.name} {userInfo.surname}, inserisci la tua nuova password</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorMessage}>
              <FaExclamationTriangle />
              <span>{error}</span>
            </div>
          )}
          
          <div className={styles.inputGroup}>
            <label htmlFor="newPassword">Nuova Password</label>
            <div className={styles.inputWrapper}>
              <FaLock className={styles.inputIcon} />
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                value={newPassword}
                onChange={handlePasswordChange}
                placeholder="Inserisci la nuova password"
                className={styles.input}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading}
              >
                {showNewPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <PasswordStrengthIndicator password={newPassword} />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">Conferma Password</label>
            <div className={styles.inputWrapper}>
              <FaLock className={styles.inputIcon} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                placeholder="Conferma la nuova password"
                className={styles.input}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading || !newPassword.trim() || !confirmPassword.trim()}
          >
            {isLoading ? (
              <>
                <div className={styles.spinner}></div>
                Reset in corso...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        {/* Informazioni aggiuntive */}
        <div className={styles.additionalInfo}>
          <div className={styles.infoCard}>
            <h4>🔒 Requisiti Password:</h4>
            <ul>
              <li>Minimo 8 caratteri</li>
              <li>Almeno una lettera maiuscola</li>
              <li>Almeno una lettera minuscola</li>
              <li>Almeno un numero</li>
              <li>Almeno un carattere speciale</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente per indicare la forza della password
const PasswordStrengthIndicator = ({ password }) => {
  if (!password) return null;
  
  const validation = validatePassword(password);
  const strength = validation.isValid ? 'strong' : 
                   password.length >= 6 ? 'medium' : 'weak';
  
  const getStrengthColor = () => {
    switch (strength) {
      case 'strong': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'weak': return '#ef4444';
      default: return '#6b7280';
    }
  };
  
  const getStrengthText = () => {
    switch (strength) {
      case 'strong': return 'Forte';
      case 'medium': return 'Media';
      case 'weak': return 'Debole';
      default: return '';
    }
  };
  
  return (
    <div className={styles.passwordStrength}>
      <div className={styles.strengthBar}>
        <div 
          className={styles.strengthFill}
          style={{ 
            width: `${(password.length / 8) * 100}%`,
            backgroundColor: getStrengthColor()
          }}
        />
      </div>
      <span className={styles.strengthText} style={{ color: getStrengthColor() }}>
        {getStrengthText()}
      </span>
    </div>
  );
};

// Funzione di validazione password (duplicata per il componente)
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
    minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar
  };
};

export default ResetPasswordPage;
