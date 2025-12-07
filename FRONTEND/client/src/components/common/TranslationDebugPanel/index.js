// File: src/components/common/TranslationDebugPanel/index.js
// 🐛 PANNELLO DI DEBUG PER TRADUZIONI
// 
// Questo componente fornisce un'interfaccia visiva per monitorare
// lo stato delle traduzioni e identificare problemi durante lo sviluppo

import React, { useState, useEffect } from 'react';
import useTranslationDebug from '../../../hooks/useTranslationDebug';
import { useTranslation } from 'react-i18next';
import styles from './TranslationDebugPanel.module.css';

const TranslationDebugPanel = () => {
  const { i18n } = useTranslation();
  const {
    debugMode,
    missingKeys,
    translationStats,
    getTranslationStats,
    generateMissingKeysReport,
    clearMissingKeys,
    toggleDebugMode,
    validateKeys
  } = useTranslationDebug();

  const [isExpanded, setIsExpanded] = useState(false);
  const [testKeys, setTestKeys] = useState([
    'common.loading',
    'meals.createMeal',
    'auth.login',
    'nonexistent.key',
    'meals.mealCount_one'
  ]);

  // Aggiorna statistiche periodicamente
  useEffect(() => {
    if (debugMode) {
      const interval = setInterval(() => {
        getTranslationStats();
      }, 5000); // Aggiorna ogni 5 secondi

      return () => clearInterval(interval);
    }
  }, [debugMode, getTranslationStats]);

  // Testa chiavi specifiche
  const testSpecificKeys = () => {
    const results = validateKeys(testKeys);
    console.log('🧪 [TranslationDebug] Test chiavi specifiche:', results);
  };

  // Aggiungi chiave di test
  const addTestKey = () => {
    const newKey = prompt('Inserisci una chiave da testare:');
    if (newKey && !testKeys.includes(newKey)) {
      setTestKeys([...testKeys, newKey]);
    }
  };

  // Rimuovi chiave di test
  const removeTestKey = (keyToRemove) => {
    setTestKeys(testKeys.filter(key => key !== keyToRemove));
  };

  // Genera report completo
  const handleGenerateReport = () => {
    const report = generateMissingKeysReport();
    if (report) {
      // Copia nel clipboard se supportato
      if (navigator.clipboard) {
        navigator.clipboard.writeText(JSON.stringify(report, null, 2));
        alert('Report copiato nel clipboard!');
      }
    }
  };

  // Cambia lingua per test
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  if (!debugMode) {
    return (
      <div className={styles.debugToggle}>
        <button onClick={toggleDebugMode} className={styles.toggleButton}>
          🔇 Abilita Debug Traduzioni
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header con toggle */}
      <div className={styles.header}>
        <h3>🐛 Debug Traduzioni</h3>
        <div className={styles.headerControls}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={styles.expandButton}
          >
            {isExpanded ? '📁' : '📂'}
          </button>
          <button 
            onClick={toggleDebugMode}
            className={styles.closeButton}
          >
            ❌
          </button>
        </div>
      </div>

      {/* Contenuto espandibile */}
      {isExpanded && (
        <div className={styles.content}>
          {/* Statistiche generali */}
          <div className={styles.section}>
            <h4>📊 Statistiche</h4>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Lingua:</span>
                <span className={styles.statValue}>{translationStats.currentLanguage}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Chiavi Totali:</span>
                <span className={styles.statValue}>{translationStats.totalKeys}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Chiavi Mancanti:</span>
                <span className={styles.statValue} className={missingKeys.length > 0 ? styles.warning : styles.success}>
                  {missingKeys.length}
                </span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Lingue Caricate:</span>
                <span className={styles.statValue}>{translationStats.loadedLanguages.length}</span>
              </div>
            </div>
          </div>

          {/* Controlli lingua */}
          <div className={styles.section}>
            <h4>🌍 Controlli Lingua</h4>
            <div className={styles.languageControls}>
              {['it', 'en', 'fr', 'de', 'es', 'ar', 'zh'].map(lng => (
                <button
                  key={lng}
                  onClick={() => changeLanguage(lng)}
                  className={`${styles.langButton} ${i18n.language === lng ? styles.active : ''}`}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Chiavi mancanti */}
          {missingKeys.length > 0 && (
            <div className={styles.section}>
              <h4>🚨 Chiavi Mancanti ({missingKeys.length})</h4>
              <div className={styles.missingKeysList}>
                {missingKeys.map(key => (
                  <div key={key} className={styles.missingKey}>
                    <code>{key}</code>
                    <span className={styles.suggestion}>
                      Aggiungi in: src/locales/{i18n.language}/translation.json
                    </span>
                  </div>
                ))}
              </div>
              <div className={styles.missingKeysActions}>
                <button onClick={handleGenerateReport} className={styles.actionButton}>
                  📋 Genera Report
                </button>
                <button onClick={clearMissingKeys} className={styles.actionButton}>
                  🧹 Pulisci
                </button>
              </div>
            </div>
          )}

          {/* Test chiavi */}
          <div className={styles.section}>
            <h4>🧪 Test Chiavi</h4>
            <div className={styles.testKeysList}>
              {testKeys.map(key => (
                <div key={key} className={styles.testKey}>
                  <code>{key}</code>
                  <span className={styles.testKeyStatus}>
                    {i18n.exists(key) ? '✅' : '❌'}
                  </span>
                  <button 
                    onClick={() => removeTestKey(key)}
                    className={styles.removeTestKey}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.testKeysActions}>
              <button onClick={testSpecificKeys} className={styles.actionButton}>
                🧪 Testa Chiavi
              </button>
              <button onClick={addTestKey} className={styles.actionButton}>
                ➕ Aggiungi Chiave
              </button>
            </div>
          </div>

          {/* Azioni rapide */}
          <div className={styles.section}>
            <h4>⚡ Azioni Rapide</h4>
            <div className={styles.quickActions}>
              <button onClick={getTranslationStats} className={styles.actionButton}>
                🔄 Aggiorna Statistiche
              </button>
              <button onClick={() => console.log('i18n instance:', i18n)} className={styles.actionButton}>
                📋 Log i18n
              </button>
              <button onClick={() => console.log('Missing keys:', missingKeys)} className={styles.actionButton}>
                📊 Log Chiavi Mancanti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationDebugPanel;
