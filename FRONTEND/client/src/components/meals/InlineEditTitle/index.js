import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import { Button, Form } from 'react-bootstrap';
import styles from './InlineEditTitle.module.css';

const InlineEditTitle = ({ 
  title, 
  onSave, 
  isEditing = false, 
  onEditClick, 
  onCancel,
  className = '',
  size = 'h2'
}) => {
  const { t } = useTranslation();
  const [editValue, setEditValue] = useState(title);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setEditValue(title);
    onEditClick();
  };

  const handleCancel = () => {
    setEditValue(title);
    onCancel();
  };

  const handleSave = async () => {
    if (editValue.trim() === title || !editValue.trim()) {
      onCancel();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue.trim());
    } catch (error) {
      console.error('Errore nel salvataggio del titolo:', error);
      // Ripristina il valore originale in caso di errore
      setEditValue(title);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`${styles.inlineEditContainer} ${className}`}>
        <Form.Control
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          className={styles.editInput}
          placeholder={t('meals.edit.titlePlaceholder')}
          autoFocus
        />
        <div className={styles.editButtons}>
          <Button
            variant="success"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !editValue.trim() || editValue.trim() === title}
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
      </div>
    );
  }

  const TitleComponent = size;
  
  return (
    <div className={`${styles.titleContainer} ${className}`}>
      <TitleComponent className={styles.title}>{title}</TitleComponent>
      <Button
        variant="link"
        size="sm"
        onClick={handleEdit}
        className={styles.editButton}
        title={t('meals.edit.editTitle')}
      >
        <FaEdit />
      </Button>
    </div>
  );
};

export default InlineEditTitle;
