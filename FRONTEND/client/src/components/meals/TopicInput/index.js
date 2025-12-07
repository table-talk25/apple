import React, { useState, useEffect } from 'react';
import styles from './TopicInput.module.css';

const TopicInput = ({ topics, setTopics, onValidationChange }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(''); // 🔒 STATO ERRORE: Per feedback visivo

  // 🔒 PULIZIA AUTOMATICA: Esegui pulizia quando il componente si monta e quando cambiano i topics
  useEffect(() => {
    cleanTopics();
  }, []); // Solo al mount

  // 🔒 NOTIFICA VALIDAZIONE: Comunica lo stato di validazione al componente padre
  useEffect(() => {
    if (onValidationChange) {
      const hasValidTopics = topics.length > 0 && topics.every(topic => {
        const trimmedTopic = topic.trim();
        return trimmedTopic.length >= 2 && 
               trimmedTopic.length <= 50 && 
               !/^\s+$/.test(trimmedTopic);
      });
      
      onValidationChange(hasValidTopics);
    }
  }, [topics, onValidationChange]);

  // 🔒 VALIDAZIONE TOPICS: Funzione per validare un nuovo argomento
  const validateTopic = (topic) => {
    if (typeof topic !== 'string') {
      return { isValid: false, error: 'L\'argomento deve essere una stringa valida' };
    }
    
    const trimmedTopic = topic.trim();
    
    // Controllo lunghezza minima (almeno 2 caratteri)
    if (trimmedTopic.length < 2) {
      return { isValid: false, error: 'L\'argomento deve essere di almeno 2 caratteri' };
    }
    
    // Controllo lunghezza massima (massimo 50 caratteri)
    if (trimmedTopic.length > 50) {
      return { isValid: false, error: 'L\'argomento non può superare i 50 caratteri' };
    }
    
    // Controllo duplicati (case-insensitive)
    const isDuplicate = topics.some(existingTopic => 
      existingTopic.toLowerCase() === trimmedTopic.toLowerCase()
    );
    
    if (isDuplicate) {
      return { isValid: false, error: 'Questo argomento è già presente' };
    }
    
    // Controllo caratteri speciali non desiderati
    const hasOnlySpaces = /^\s+$/.test(trimmedTopic);
    if (hasOnlySpaces) {
      return { isValid: false, error: 'L\'argomento non può contenere solo spazi' };
    }
    
    // Controllo caratteri validi (solo lettere, numeri, spazi e caratteri accentati)
    const hasValidCharacters = /^[\w\s\u00C0-\u017F]+$/i.test(trimmedTopic);
    if (!hasValidCharacters) {
      return { isValid: false, error: 'L\'argomento può contenere solo lettere, numeri e spazi' };
    }
    
    return { isValid: true, topic: trimmedTopic };
  };

  const handleKeyDown = (e) => {
    // Se preme "Invio" o "Virgola"
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault(); // Impedisce al form di essere inviato o di scrivere la virgola
      
      // 🔒 VALIDAZIONE ROBUSTA: Controllo completo prima dell'aggiunta
      const validation = validateTopic(inputValue);
      
      if (validation.isValid) {
        if (topics.length < 5) { // Limite di 5 argomenti
          setTopics([...topics, validation.topic]);
          setInputValue(''); // Pulisci l'input solo se valido
          setError(''); // 🔒 Pulisci errori precedenti
        } else {
          const limitError = 'Limite massimo di 5 argomenti raggiunto';
          console.warn(`⚠️ [TopicInput] ${limitError}`);
          setError(limitError);
        }
      } else {
        // 🔒 FEEDBACK ERRORE: Mostra messaggio di errore visivo
        console.warn(`⚠️ [TopicInput] Argomento non valido: ${validation.error}`);
        setError(validation.error);
      }
    }
  };

  // 🔒 PULIZIA AUTOMATICA: Rimuove argomenti vuoti o non validi
  const cleanTopics = () => {
    if (!Array.isArray(topics) || topics.length === 0) return;
    
    const cleanedTopics = topics.filter(topic => {
      if (typeof topic !== 'string') return false;
      
      const trimmedTopic = topic.trim();
      // 🔒 VALIDAZIONE COMPLETA: Controlla lunghezza e caratteri
      return trimmedTopic.length >= 2 && 
             trimmedTopic.length <= 50 && 
             !/^\s+$/.test(trimmedTopic) &&
             !/^[^\w\s]+$/.test(trimmedTopic) && // Non solo caratteri speciali
             /^[\w\s\u00C0-\u017F]+$/i.test(trimmedTopic); // Solo lettere, numeri, spazi e caratteri accentati
    });
    
    // Se ci sono stati cambiamenti, aggiorna la lista
    if (cleanedTopics.length !== topics.length) {
      console.log(`🧹 [TopicInput] Puliti ${topics.length - cleanedTopics.length} argomenti non validi`);
      setTopics(cleanedTopics);
    }
  };

  const removeTopic = (topicToRemove) => {
    setTopics(topics.filter(topic => topic !== topicToRemove));
  };

  return (
    <div className={`${styles.topicInputContainer} ${error ? styles.hasError : ''}`}>
      {topics.map((topic, index) => (
        <div key={index} className={styles.topicTag}>
          {topic}
          <button 
            type="button" 
            className={styles.removeTagButton} 
            onClick={() => removeTopic(topic)}
          >
            &times;
          </button>
        </div>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          // 🔒 PULIZIA ERRORE: Rimuovi errori quando l'utente digita
          if (error) setError('');
        }}
        onKeyDown={handleKeyDown}
        placeholder={topics.length < 5 ? 'Aggiungi un argomento...' : 'Massimo 5 argomenti'}
        className={`${styles.topicInput} ${error ? styles.inputError : ''}`}
        disabled={topics.length >= 5}
      />
      {/* 🔒 FEEDBACK ERRORE: Mostra messaggio di errore sotto l'input */}
      {error && (
        <div className={styles.errorMessage}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

export default TopicInput;