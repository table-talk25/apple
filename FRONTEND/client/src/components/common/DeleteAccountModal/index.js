import React, { useState } from 'react';
import { AlertTriangle, Trash2, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import profileService from '../../../services/profileService';
import { Avatar, Button, Modal } from '../../ui';
import styles from './DeleteAccountModal.module.css';

const DeleteAccountModal = ({ show, onHide, onDeleteAccount, user }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    password: '',
    confirmCheckbox: false,
    understandCheckbox: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    if (!isSubmitting) {
      onHide();
      setStep(1);
      setFormData({ password: '', confirmCheckbox: false, understandCheckbox: false });
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.password) {
      setError(t('deleteAccountModal.passwordRequired'));
      return;
    }

    if (!formData.confirmCheckbox || !formData.understandCheckbox) {
      setError(t('deleteAccountModal.confirmAllOptions'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onDeleteAccount(formData.password);
      setStep(3);
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('deleteAccountModal.deleteError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const consequences = [
    t('deleteAccountModal.consequences.profile'),
    t('deleteAccountModal.consequences.meals'),
    t('deleteAccountModal.consequences.chat'),
    t('deleteAccountModal.consequences.invitations'),
    t('deleteAccountModal.consequences.access'),
    t('deleteAccountModal.consequences.irreversible'),
  ];

  const userDisplayName = user?.nickname || user?.name || 'User';

  return (
    <Modal
      isOpen={Boolean(show)}
      onClose={handleClose}
      title={t('deleteAccountModal.title', 'Elimina account')}
      size="md"
    >
      <div className={styles.body} data-testid="delete-account-dialog-body">
        {step === 1 && (
          <>
            <div className={styles.warningAlert} role="alert">
              <div className={styles.warningTitleRow}>
                <AlertTriangle size={18} strokeWidth={2.2} aria-hidden="true" />
                <strong>{t('deleteAccountModal.warningTitle')}</strong>
              </div>
              <p>{t('deleteAccountModal.warningMessage')}</p>
            </div>

            <div className={styles.userInfo}>
              <Avatar
                src={user?.profileImage ? profileService.getFullImageUrl(user.profileImage) : ''}
                name={userDisplayName}
                alt={userDisplayName}
                size={48}
                tone="primary"
              />
              <div>
                <h6>{userDisplayName}</h6>
                <small>{t('deleteAccountModal.accountToDelete')}</small>
              </div>
            </div>

            <h6 className={styles.sectionTitle}>{t('deleteAccountModal.whatWillHappen')}</h6>
            <ul className={styles.consequencesList}>
              {consequences.map((consequence, index) => (
                <li key={index} className={styles.consequenceItem}>
                  <X size={15} strokeWidth={2.4} className={styles.consequenceIcon} aria-hidden="true" />
                  <span>{consequence}</span>
                </li>
              ))}
            </ul>

            <div className={styles.checkboxes}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.confirmCheckbox}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmCheckbox: e.target.checked })
                  }
                />
                <span>{t('deleteAccountModal.confirmDelete')}</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.understandCheckbox}
                  onChange={(e) =>
                    setFormData({ ...formData, understandCheckbox: e.target.checked })
                  }
                />
                <span>{t('deleteAccountModal.understandIrreversible')}</span>
              </label>
            </div>

            <div className={styles.actions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                {t('deleteAccountModal.cancel')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setStep(2)}
                disabled={
                  !formData.confirmCheckbox || !formData.understandCheckbox || isSubmitting
                }
              >
                <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
                <span>{t('deleteAccountModal.proceed')}</span>
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className={styles.warningAlert} role="alert">
              <strong>{t('deleteAccountModal.lastStep')}</strong>
            </div>

            {error && (
              <div className={styles.errorAlert} role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="delete-account-password">
                  {t('deleteAccountModal.password')}
                </label>
                <input
                  id="delete-account-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t('deleteAccountModal.passwordPlaceholder')}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.actions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                >
                  {t('deleteAccountModal.back')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={!formData.password || isSubmitting}
                >
                  {isSubmitting
                    ? t('deleteAccountModal.deleting')
                    : t('deleteAccountModal.deleteDefinitely')}
                </Button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <div className={styles.successStep}>
            <div className={styles.successIcon}>
              <Check size={34} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h5>{t('deleteAccountModal.accountDeleted')}</h5>
            <p>{t('deleteAccountModal.deletedSuccess')}</p>
            <small>{t('deleteAccountModal.redirecting')}</small>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DeleteAccountModal;
