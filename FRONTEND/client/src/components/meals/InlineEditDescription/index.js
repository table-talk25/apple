import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import { Button, Form } from 'react-bootstrap';
import styles from './InlineEditDescription.module.css';

const InlineEditDescription = ({ 
  description, 
  onSave, 
  isEditing = false, 
  onEditClick, 
  onCancel,
  className = ''
}) => {
  const { t } = useTranslation();
  const [editValue, setEditValue] = useState(description || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setEditValue(description || '');
    onEditClick();
  };

  const handleCancel = () => {
    setEditValue(description || '');
    onCancel();
  };

  const handleSave = async () => {
    if (editValue.trim() === (description || '')) {
      onCancel();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue.trim());
    } catch (error) {
      console.error('Errore nel salvataggio della descrizione:', error);
      // Ripristina il valore originale in caso di errore
      setEditValue(description || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`${styles.inlineEditContainer} ${className}`}>
        <Form.Control
          as="textarea"
          rows={4}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          className={styles.editTextarea}
          placeholder={t('meals.edit.descriptionPlaceholder')}
          autoFocus
        />
        <div className={styles.editButtons}>
          <Button
            variant="success"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className={styles.saveButton}
          >
            <FaCheck />
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
            className={styles.cancelButton}
          >
            <FaTimes />
          </Button>
        </div>
        <small className={styles.helpText}>
          {t('meals.edit.descriptionHelp', { defaultValue: 'Premi Ctrl+Enter per salvare' })}
        </small>
      </div>
    );
  }

  return (
    <div className={`${styles.descriptionContainer} ${className}`}>
      <div className={styles.descriptionHeader}>
        <h4>{t('meals.detail.description')}</h4>
        <Button
          variant="link"
          size="sm"
          onClick={handleEdit}
          className={styles.editButton}
          title={t('meals.edit.editDescription')}
        >
          <FaEdit />
        </Button>
      </div>
      {description ? (
        <p className={styles.description}>{description}</p>
      ) : (
        <p className={styles.noDescription}>
          {t('meals.detail.noDescription', { defaultValue: 'Nessuna descrizione disponibile' })}
        </p>
      )}
    </div>
  );
};

export default InlineEditDescription;
