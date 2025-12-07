import React, { useState } from 'react';

const InviteForm = ({ recipient, onSend, onBack }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    onSend(message);
  };

  return (
    <div>
      <button onClick={onBack}>← Torna al profilo</button>
      <h4>Invita {recipient?.nickname}</h4>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Scrivi un messaggio personalizzato..."
        style={{ width: '100%', minHeight: '100px', marginTop: '10px' }}
      />
      <button onClick={handleSend} disabled={!message.trim()} style={{ width: '100%', padding: '10px', marginTop: '10px' }}>
        Invia Invito
      </button>
    </div>
  );
};

export default InviteForm;