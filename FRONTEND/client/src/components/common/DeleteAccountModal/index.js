import React, { useState } from 'react';
import { Modal, Button, Form, Alert, ListGroup } from 'react-bootstrap';
import { FaExclamationTriangle, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import styles from './DeleteAccountModal.module.css';

const DeleteAccountModal = ({ show, onHide, onDeleteAccount, user }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1: conferma, 2: password, 3: success
  const [formData, setFormData] = useState({
    password: '',
    confirmCheckbox: false,
    understandCheckbox: false
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
      setStep(3); // Mostra successo
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('deleteAccountModal.deleteError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = formData.confirmCheckbox && formData.understandCheckbox && formData.password;

  const consequences = [
    t('deleteAccountModal.consequences.profile'),
    t('deleteAccountModal.consequences.meals'),
    t('deleteAccountModal.consequences.chat'),
    t('deleteAccountModal.consequences.invitations'),
    t('deleteAccountModal.consequences.access'),
    t('deleteAccountModal.consequences.irreversible')
  ];

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton className={styles.header}>
        <Modal.Title className={styles.title}>
          <FaExclamationTriangle className={styles.warningIcon} />
          {t('deleteAccountModal.title')}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className={styles.body}>
        {step === 1 && (
          <>
            <Alert variant="danger" className={styles.warningAlert}>
              <Alert.Heading>{t('deleteAccountModal.warningTitle')}</Alert.Heading>
              <p>
                {t('deleteAccountModal.warningMessage')}
              </p>
            </Alert>

            <div className={styles.userInfo}>
              <img
                src={user?.profileImage ? `/uploads/profile-images/${user.profileImage}` : '/default-avatar.jpg'}
                alt={user?.nickname}
                className={styles.userAvatar}
              />
              <div>
                <h6>{user?.nickname}</h6>
                <small className="text-muted">{t('deleteAccountModal.accountToDelete')}</small>
              </div>
            </div>

            <h6 className={styles.sectionTitle}>{t('deleteAccountModal.whatWillHappen')}</h6>
            <ListGroup className={styles.consequencesList}>
              {consequences.map((consequence, index) => (
                <ListGroup.Item key={index} className={styles.consequenceItem}>
                  <FaTimes className={styles.consequenceIcon} />
                  {consequence}
                </ListGroup.Item>
              ))}
            </ListGroup>

            <div className={styles.checkboxes}>
              <Form.Check
                type="checkbox"
                id="confirmCheckbox"
                label={t('deleteAccountModal.confirmDelete')}
                checked={formData.confirmCheckbox}
                onChange={(e) => setFormData({ ...formData, confirmCheckbox: e.target.checked })}
                className={styles.checkbox}
              />
              <Form.Check
                type="checkbox"
                id="understandCheckbox"
                label={t('deleteAccountModal.understandIrreversible')}
                checked={formData.understandCheckbox}
                onChange={(e) => setFormData({ ...formData, understandCheckbox: e.target.checked })}
                className={styles.checkbox}
              />
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                {t('deleteAccountModal.cancel')}
              </Button>
              <Button 
                variant="danger" 
                onClick={() => setStep(2)}
                disabled={!formData.confirmCheckbox || !formData.understandCheckbox || isSubmitting}
              >
                <FaTrash /> {t('deleteAccountModal.proceed')}
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Alert variant="warning">
              <strong>{t('deleteAccountModal.lastStep')}</strong>
            </Alert>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>{t('deleteAccountModal.password')}</Form.Label>
                <Form.Control
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t('deleteAccountModal.passwordPlaceholder')}
                  required
                />
              </Form.Group>

              <div className={styles.actions}>
                <Button variant="secondary" onClick={() => setStep(1)} disabled={isSubmitting}>
                  {t('deleteAccountModal.back')}
                </Button>
                <Button 
                  variant="danger" 
                  type="submit"
                  disabled={!formData.password || isSubmitting}
                >
                  {isSubmitting ? t('deleteAccountModal.deleting') : t('deleteAccountModal.deleteDefinitely')}
                </Button>
              </div>
            </Form>
          </>
        )}

        {step === 3 && (
                      <div className={styles.successStep}>
              <div className={styles.successIcon}>
                <FaCheck />
              </div>
              <h5>{t('deleteAccountModal.accountDeleted')}</h5>
              <p>{t('deleteAccountModal.deletedSuccess')}</p>
              <small className="text-muted">{t('deleteAccountModal.redirecting')}</small>
            </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default DeleteAccountModal; 