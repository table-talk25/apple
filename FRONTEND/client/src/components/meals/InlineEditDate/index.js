import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaCheck, FaTimes, FaCalendarAlt } from 'react-icons/fa';
import { Button, Form } from 'react-bootstrap';
import styles from './InlineEditDate.module.css';

const InlineEditDate = ({ 
  date, 
  onSave, 
  isEditing = false, 
  onEditClick, 
  onCancel,
  className = ''
}) => {
  const { t } = useTranslation();
  const [editValue, setEditValue] = useState(date ? new Date(date).toISOString().slice(0, 16) : '');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setEditValue(date ? new Date(date).toISOString().slice(0, 16) : '');
    onEditClick();
  };

  const handleCancel = () => {
    setEditValue(date ? new Date(date).toISOString().slice(0, 16) : '');
    onCancel();
  };

  const handleSave = async () => {
    if (!editValue) {
      return;
    }

    const newDate = new Date(editValue);
    if (newDate.getTime() === new Date(date).getTime()) {
      onCancel();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(newDate.toISOString());
    } catch (error) {
      console.error('Errore nel salvataggio della data:', error);
      // Ripristina il valore originale in caso di errore
      setEditValue(date ? new Date(date).toISOString().slice(0, 16) : '');
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isEditing) {
    return (
      <div className={`${styles.inlineEditContainer} ${className}`}>
        <div className={styles.dateTimeInputs}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>
              <FaCalendarAlt /> {t('meals.edit.date')}
            </label>
            <Form.Control
              type="date"
              value={editValue.split('T')[0]}
              onChange={(e) => {
                const time = editValue.split('T')[1] || '12:00';
                setEditValue(`${e.target.value}T${time}`);
              }}
              className={styles.dateInput}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>
              <FaCalendarAlt /> {t('meals.edit.time')}
            </label>
            <Form.Control
              type="time"
              value={editValue.split('T')[1] || '12:00'}
              onChange={(e) => {
                const date = editValue.split('T')[0];
                setEditValue(`${date}T${e.target.value}`);
              }}
              className={styles.timeInput}
            />
          </div>
        </div>
        <div className={styles.editButtons}>
          <Button
            variant="success"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !editValue}
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

  return (
    <div className={`${styles.dateContainer} ${className}`}>
      <div className={styles.dateInfo}>
        <FaCalendarAlt className={styles.dateIcon} />
        <div className={styles.dateText}>
          <span className={styles.dateValue}>{formatDate(date)}</span>
          <span className={styles.timeValue}>{formatTime(date)}</span>
        </div>
        <Button
          variant="link"
          size="sm"
          onClick={handleEdit}
          className={styles.editButton}
          title={t('meals.edit.editDate')}
        >
          <FaEdit />
        </Button>
      </div>
    </div>
  );
};

export default InlineEditDate;
