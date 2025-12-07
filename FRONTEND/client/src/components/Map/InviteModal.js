import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const InviteModal = ({ show, onClose, onSend, recipient }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    onSend(message);
    setMessage('');
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Invita {recipient?.nickname}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label>Messaggio</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Scrivi un messaggio personalizzato..."
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Annulla</Button>
        <Button variant="primary" onClick={handleSend} disabled={!message.trim()}>Invia</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default InviteModal; 