import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '../../ui';
import styles from './ChangePasswordModal.module.css';

const ChangePasswordModal = ({ show, onHide, onChangePassword }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
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
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
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

  const hasFieldErrors = Object.values(validationErrors).some(Boolean);

  return (
    <Modal
      isOpen={Boolean(show)}
      onClose={handleClose}
      title={t('changePasswordModal.title', 'Cambia password')}
      size="sm"
    >
      <div className={styles.body} data-testid="change-password-dialog-body">
        <p className={styles.description}>{t('changePasswordModal.description')}</p>

        {error && (
          <div className={styles.errorAlert} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="cp-current">
              {t('changePasswordModal.currentPassword')} *
            </label>
            <div className={styles.passwordInputGroup}>
              <input
                id="cp-current"
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder={t('changePasswordModal.currentPasswordPlaceholder')}
                className={`${styles.input} ${validationErrors.currentPassword ? styles.inputInvalid : ''}`}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => togglePasswordVisibility('current')}
                disabled={isSubmitting}
                aria-label={t('changePasswordModal.currentPassword')}
              >
                {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {validationErrors.currentPassword && (
              <span className={styles.fieldError}>{validationErrors.currentPassword}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="cp-new">{t('changePasswordModal.newPassword')} *</label>
            <div className={styles.passwordInputGroup}>
              <input
                id="cp-new"
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder={t('changePasswordModal.newPasswordPlaceholder')}
                className={`${styles.input} ${validationErrors.newPassword ? styles.inputInvalid : ''}`}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => togglePasswordVisibility('new')}
                disabled={isSubmitting}
                aria-label={t('changePasswordModal.newPassword')}
              >
                {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {validationErrors.newPassword && (
              <span className={styles.fieldError}>{validationErrors.newPassword}</span>
            )}
            <small className={styles.hint}>{t('changePasswordModal.passwordRequirements')}</small>
          </div>

          <div className={styles.field}>
            <label htmlFor="cp-confirm">
              {t('changePasswordModal.confirmPassword')} *
            </label>
            <div className={styles.passwordInputGroup}>
              <input
                id="cp-confirm"
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={t('changePasswordModal.confirmPasswordPlaceholder')}
                className={`${styles.input} ${validationErrors.confirmPassword ? styles.inputInvalid : ''}`}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => togglePasswordVisibility('confirm')}
                disabled={isSubmitting}
                aria-label={t('changePasswordModal.confirmPassword')}
              >
                {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <span className={styles.fieldError}>{validationErrors.confirmPassword}</span>
            )}
          </div>

          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('changePasswordModal.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isSubmitting || hasFieldErrors}
            >
              {isSubmitting
                ? t('changePasswordModal.changing')
                : t('changePasswordModal.changePassword')}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ChangePasswordModal;
