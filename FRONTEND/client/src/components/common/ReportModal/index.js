import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { createReport } from '../../../services/apiService';
import styles from './ReportModal.module.css';

const ReportModal = ({ show, onHide, reportedUser, context = 'general', mealId = null }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    reason: '',
    details: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const reasons = [
    { value: 'inappropriate', label: t('report.reasons.inappropriate') },
    { value: 'spam', label: t('report.reasons.spam') },
    { value: 'fakeProfile', label: t('report.reasons.fakeProfile') },
    { value: 'other', label: t('report.reasons.other') }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.reason) {
      setError(t('report.selectReasonError'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const reportData = {
        reportedUserId: reportedUser._id,
        reason: formData.reason,
        details: formData.details,
        context
      };

      // Aggiungi mealId se disponibile
      if (mealId) {
        reportData.meal = mealId;
      }

      await createReport(reportData);

      setSuccess(true);
      setTimeout(() => {
        onHide();
        setSuccess(false);
        setFormData({ reason: '', details: '' });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || t('report.sendError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onHide();
      setFormData({ reason: '', details: '' });
      setError('');
      setSuccess(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{t('report.reportUser')}</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {success ? (
          <Alert variant="success">
            {t('report.reportSuccess')}
          </Alert>
        ) : (
          <>
            <div className={styles.userInfo}>
              <img
                src={reportedUser?.profileImage ? `/uploads/profile-images/${reportedUser.profileImage}` : '/default-avatar.jpg'}
                alt={reportedUser?.nickname}
                className={styles.userAvatar}
              />
              <div>
                <h6>{reportedUser?.nickname}</h6>
                <small className="text-muted">{t('report.userToReport')}</small>
              </div>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>{t('report.reportReason')}</Form.Label>
                <Form.Select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                >
                  <option value="">{t('report.selectReason')}</option>
                  {reasons.map(reason => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('report.additionalDetails')}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  placeholder={t('report.detailsPlaceholder')}
                />
              </Form.Group>
            </Form>
          </>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        {!success && (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              {t('report.cancel')}
            </Button>
            <Button 
              variant="danger" 
              onClick={handleSubmit} 
              disabled={isSubmitting || !formData.reason}
            >
              {isSubmitting ? t('report.sending') : t('report.sendReport')}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ReportModal; 