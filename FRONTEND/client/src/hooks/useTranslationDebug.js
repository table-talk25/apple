// File: src/hooks/useTranslationDebug.js
// 🐛 HOOK PER DEBUG DELLE TRADUZIONI
// 
// Questo hook fornisce funzioni di debug per identificare rapidamente
// traduzioni mancanti e problemi di internazionalizzazione durante lo sviluppo

import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';

export const useTranslationDebug = () => {
  const { t, i18n } = useTranslation();
  const [debugMode, setDebugMode] = useState(process.env.NODE_ENV === 'development');
  const [missingKeys, setMissingKeys] = useState(new Set());
  const [translationStats, setTranslationStats] = useState({
    totalKeys: 0,
    missingKeys: 0,
    loadedLanguages: [],
    currentLanguage: 'it'
  });

  // 🔍 Controlla se una chiave esiste
  const hasKey = useCallback((key) => {
    return i18n.exists(key);
  }, [i18n]);

  // 🚨 Traduzione con debug
  const tDebug = useCallback((key, options = {}) => {
    if (!debugMode) {
      return t(key, options);
    }

    const exists = hasKey(key);
    if (!exists) {
      setMissingKeys(prev => new Set([...prev, key]));
      console.warn(`🚨 [TranslationDebug] Chiave mancante: "${key}"`);
      console.warn(`🔍 [TranslationDebug] Lingua corrente: ${i18n.language}`);
      console.warn(`💡 [TranslationDebug] Aggiungi in: src/locales/${i18n.language}/translation.json`);
      
      // Mostra la chiave in modo visibile per identificazione rapida
      return `[MISSING: ${key}]`;
    }

    return t(key, options);
  }, [t, hasKey, debugMode, i18n.language]);

  // 📊 Ottieni statistiche delle traduzioni
  const getTranslationStats = useCallback(() => {
    const currentLang = i18n.language;
    const bundle = i18n.getResourceBundle(currentLang, 'translation');
    const totalKeys = bundle ? Object.keys(bundle).length : 0;
    
    setTranslationStats({
      totalKeys,
      missingKeys: missingKeys.size,
      loadedLanguages: i18n.languages,
      currentLanguage: currentLang
    });

    return {
      totalKeys,
      missingKeys: missingKeys.size,
      loadedLanguages: i18n.languages,
      currentLanguage: currentLang
    };
  }, [i18n, missingKeys]);

  // 🔄 Controlla tutte le chiavi utilizzate
  const validateKeys = useCallback((keys) => {
    const results = keys.map(key => ({
      key,
      exists: hasKey(key),
      value: hasKey(key) ? t(key) : null
    }));

    const missing = results.filter(r => !r.exists);
    
    if (debugMode && missing.length > 0) {
      console.group(`🚨 [TranslationDebug] Validazione chiavi (${missing.length} mancanti)`);
      missing.forEach(({ key }) => {
        console.warn(`❌ Chiave mancante: "${key}"`);
      });
      console.groupEnd();
    }

    return results;
  }, [hasKey, t, debugMode]);

  // 📝 Genera report delle traduzioni mancanti
  const generateMissingKeysReport = useCallback(() => {
    if (missingKeys.size === 0) {
      console.log('✅ [TranslationDebug] Nessuna chiave mancante trovata!');
      return null;
    }

    const report = {
      timestamp: new Date().toISOString(),
      language: i18n.language,
      missingKeys: Array.from(missingKeys),
      suggestions: []
    };

    // Genera suggerimenti per le chiavi mancanti
    report.suggestions = report.missingKeys.map(key => {
      const parts = key.split('.');
      const lastPart = parts[parts.length - 1];
      
      return {
        key,
        suggestedValue: `"${lastPart}"`,
        file: `src/locales/${i18n.language}/translation.json`,
        path: parts.join(' > ')
      };
    });

    if (debugMode) {
      console.group(`📋 [TranslationDebug] Report chiavi mancanti (${missingKeys.size})`);
      console.table(report.suggestions);
      console.log('📁 File da aggiornare:', report.file);
      console.groupEnd();
    }

    return report;
  }, [missingKeys, i18n.language, debugMode]);

  // 🧹 Pulisci chiavi mancanti
  const clearMissingKeys = useCallback(() => {
    setMissingKeys(new Set());
    if (debugMode) {
      console.log('🧹 [TranslationDebug] Chiavi mancanti pulite');
    }
  }, [debugMode]);

  // 🔧 Abilita/disabilita debug mode
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev);
    if (debugMode) {
      console.log('🔇 [TranslationDebug] Modalità debug disabilitata');
    } else {
      console.log('🔊 [TranslationDebug] Modalità debug abilitata');
    }
  }, [debugMode]);

  // 📊 Aggiorna statistiche quando cambia lingua
  useEffect(() => {
    getTranslationStats();
  }, [i18n.language, getTranslationStats]);

  // 🎯 Log iniziale in modalità debug
  useEffect(() => {
    if (debugMode) {
      console.log('🔊 [TranslationDebug] Hook di debug attivato');
      console.log('🌍 [TranslationDebug] Lingua corrente:', i18n.language);
      console.log('📦 [TranslationDebug] Lingue caricate:', i18n.languages);
    }
  }, [debugMode, i18n.language, i18n.languages]);

  return {
    // Funzioni di debug
    tDebug,
    hasKey,
    validateKeys,
    getTranslationStats,
    generateMissingKeysReport,
    clearMissingKeys,
    toggleDebugMode,
    
    // Stato
    debugMode,
    missingKeys: Array.from(missingKeys),
    translationStats,
    
    // Funzioni di utilità
    isDevelopment: process.env.NODE_ENV === 'development',
    currentLanguage: i18n.language,
    loadedLanguages: i18n.languages
  };
};

export default useTranslationDebug;
