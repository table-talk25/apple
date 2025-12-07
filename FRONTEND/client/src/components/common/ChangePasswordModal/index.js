import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { FaKey, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import styles from './ChangePasswordModal.module.css';

const ChangePasswordModal = ({ show, onHide, onChangePassword }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const handleClose = () => {
    if (!isSubmitting) {
      onHide();
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswords({ current: false, new: false, confirm: false });
      setError('');
      setValidationErrors({});
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Rimuovi l'errore di validazione per questo campo
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.currentPassword) {
      errors.currentPassword = t('changePasswordModal.currentPasswordRequired');
    }

    if (!formData.newPassword) {
      errors.newPassword = t('changePasswordModal.newPasswordRequired');
    } else if (formData.newPassword.length < 8) {
      errors.newPassword = t('changePasswordModal.passwordMinLength');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.newPassword)) {
      errors.newPassword = t('changePasswordModal.passwordRequirements');
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = t('changePasswordModal.confirmPasswordRequired');
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = t('changePasswordModal.passwordsDoNotMatch');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onChangePassword(formData.currentPassword, formData.newPassword);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || t('changePasswordModal.changeError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = Object.values(validationErrors).some(error => error) || error;

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton className={styles.header}>
        <Modal.Title className={styles.title}>
          <FaKey className={styles.keyIcon} />
          {t('changePasswordModal.title')}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className={styles.body}>
        <p className={styles.description}>
          {t('changePasswordModal.description')}
        </p>

        {error && (
          <Alert variant="danger" className={styles.errorAlert}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>{t('changePasswordModal.currentPassword')} *</Form.Label>
            <div className={styles.passwordInputGroup}>
              <Form.Control
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder={t('changePasswordModal.currentPasswordPlaceholder')}
                isInvalid={!!validationErrors.currentPassword}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="outline-secondary"
                className={styles.eyeButton}
                onClick={() => togglePasswordVisibility('current')}
                disabled={isSubmitting}
              >
                {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
              </Button>
            </div>
            {validationErrors.currentPassword && (
              <Form.Control.Feedback type="invalid">
                {validationErrors.currentPassword}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('changePasswordModal.newPassword')} *</Form.Label>
            <div className={styles.passwordInputGroup}>
              <Form.Control
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder={t('changePasswordModal.newPasswordPlaceholder')}
                isInvalid={!!validationErrors.newPassword}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="outline-secondary"
                className={styles.eyeButton}
                onClick={() => togglePasswordVisibility('new')}
                disabled={isSubmitting}
              >
                {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
              </Button>
            </div>
            {validationErrors.newPassword && (
              <Form.Control.Feedback type="invalid">
                {validationErrors.newPassword}
              </Form.Control.Feedback>
            )}
            <Form.Text className="text-muted">
              {t('changePasswordModal.passwordRequirements')}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('changePasswordModal.confirmPassword')} *</Form.Label>
            <div className={styles.passwordInputGroup}>
              <Form.Control
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={t('changePasswordModal.confirmPasswordPlaceholder')}
                isInvalid={!!validationErrors.confirmPassword}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="outline-secondary"
                className={styles.eyeButton}
                onClick={() => togglePasswordVisibility('confirm')}
                disabled={isSubmitting}
              >
                {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
              </Button>
            </div>
            {validationErrors.confirmPassword && (
              <Form.Control.Feedback type="invalid">
                {validationErrors.confirmPassword}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <div className={styles.actions}>
            <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              {t('changePasswordModal.cancel')}
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={isSubmitting || hasErrors}
            >
              {isSubmitting ? t('changePasswordModal.changing') : t('changePasswordModal.changePassword')}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ChangePasswordModal; 