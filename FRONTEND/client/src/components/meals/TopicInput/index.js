import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TopicInput.module.css';

const MAX_TOPICS = 5;

const isValidTopicText = (topic) => {
  if (typeof topic !== 'string') return false;
  const trimmed = topic.trim();
  return (
    trimmed.length >= 2 &&
    trimmed.length <= 50 &&
    !/^\s+$/.test(trimmed) &&
    !/^[^\w\s]+$/.test(trimmed) &&
    /^[\w\s\u00C0-\u017F]+$/i.test(trimmed)
  );
};

const TopicInput = ({ topics = [], setTopics, onValidationChange }) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!Array.isArray(topics) || topics.length === 0) return;
    const cleaned = topics.filter(isValidTopicText);
    if (cleaned.length !== topics.length) {
      setTopics(cleaned);
    }
    // Clean once on mount for any legacy initial data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (onValidationChange) {
      const valid = Array.isArray(topics) && topics.length > 0 && topics.every(isValidTopicText);
      onValidationChange(valid);
    }
  }, [topics, onValidationChange]);

  const validateTopic = useCallback(
    (raw) => {
      if (typeof raw !== 'string') {
        return { isValid: false, error: "L'argomento deve essere un testo valido." };
      }
      const trimmed = raw.trim().replace(/,+$/, '').trim();
      if (trimmed.length < 2) {
        return { isValid: false, error: "L'argomento deve avere almeno 2 caratteri." };
      }
      if (trimmed.length > 50) {
        return { isValid: false, error: "L'argomento non può superare i 50 caratteri." };
      }
      if (topics.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
        return { isValid: false, error: 'Questo argomento è già presente.' };
      }
      if (!/^[\w\s\u00C0-\u017F]+$/i.test(trimmed)) {
        return {
          isValid: false,
          error: "L'argomento può contenere solo lettere, numeri e spazi.",
        };
      }
      return { isValid: true, topic: trimmed };
    },
    [topics]
  );

  const tryAddTopic = useCallback(
    (raw) => {
      const trimmed = String(raw || '').trim().replace(/,+$/, '').trim();
      if (!trimmed) return;
      if (topics.length >= MAX_TOPICS) {
        setError(t('create.topicsMaxReached', 'Massimo 5 argomenti raggiunti'));
        return;
      }
      const validation = validateTopic(trimmed);
      if (validation.isValid) {
        setTopics([...topics, validation.topic]);
        setInputValue('');
        setError('');
      } else {
        setError(validation.error);
      }
    },
    [topics, setTopics, validateTopic, t]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      tryAddTopic(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && topics.length > 0) {
      setTopics(topics.slice(0, -1));
    }
  };

  const removeTopic = (topicToRemove) => {
    setTopics(topics.filter((topic) => topic !== topicToRemove));
    if (error) setError('');
  };

  return (
    <div>
      <div
        className={`${styles.tagbox} ${error ? styles.hasError : ''}`}
        data-testid="topics-box"
      >
        {topics.map((topic, index) => (
          <span key={`${topic}-${index}`} className={styles.tag}>
            <span>{topic}</span>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => removeTopic(topic)}
              aria-label={`Rimuovi ${topic}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            const val = e.target.value;
            if (val.endsWith(',')) {
              tryAddTopic(val.slice(0, -1));
              return;
            }
            setInputValue(val);
            if (error) setError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            topics.length < MAX_TOPICS
              ? t('create.topicsPlaceholder', 'Scrivi e premi Invio o la virgola…')
              : t('create.topicsMaxReached', 'Massimo 5 argomenti raggiunti')
          }
          className={styles.input}
          disabled={topics.length >= MAX_TOPICS}
          data-testid="topics-input"
        />
      </div>
      {error && (
        <div className={styles.errorText} role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default TopicInput;
