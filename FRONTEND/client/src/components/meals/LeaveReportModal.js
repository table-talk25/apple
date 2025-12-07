import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const LeaveReportModal = ({ show, onClose, onConfirm, type }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    onConfirm({ reason, customReason: reason === 'other' ? customReason : undefined });
    setReason('');
    setCustomReason('');
  };

  const subjectKey = `leaveReport.subjects.${type || 'chat'}`;

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{t('leaveReport.leaveTitle', { subject: t(subjectKey) })}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
        <Form>
          <Form.Group>
            <Form.Label>{t('leaveReport.whyLeaving', { subject: t(subjectKey) })}</Form.Label>
            <Form.Control as="select" value={reason} onChange={e => setReason(e.target.value)}>
              <option value="">{t('leaveReport.selectReason')}</option>
              <option value="personal">{t('leaveReport.reasons.personal')}</option>
              <option value="uncomfortable">{t('leaveReport.reasons.uncomfortable')}</option>
              <option value="technical">{t('leaveReport.reasons.technical')}</option>
              <option value="other">{t('leaveReport.reasons.other')}</option>
            </Form.Control>
          </Form.Group>
          {reason === 'other' && (
            <Form.Group className="mt-2">
              <Form.Control
                type="text"
                placeholder={t('leaveReport.writeReason')}
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
              />
            </Form.Group>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer style={{ position: 'sticky', bottom: 0, background: '#fff', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <Button variant="secondary" onClick={onClose}>{t('leaveReport.cancel')}</Button>
        <Button variant="danger" onClick={handleConfirm} disabled={!reason || (reason === 'other' && !customReason)}>{t('leaveReport.confirm')}</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LeaveReportModal; 