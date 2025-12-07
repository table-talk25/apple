import React, { useEffect, useState } from 'react';
import apiClient from '../../services/apiService';
import { Card, Spinner } from 'react-bootstrap';

const AdminLeaveReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/leave-reports')
      .then(res => setReports(res.data.data))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
              <h2>Segnalazioni di abbandono (TableTalk®/chat)</h2>
      {reports.length === 0 && <p>Nessun report trovato.</p>}
      {reports.map(report => (
        <Card key={report._id} className="mb-3">
          <Card.Body>
            <div><strong>Utente:</strong> {report.user?.nickname} ({report.user?.email})</div>
                    <div><strong>Tipo:</strong> {report.type === 'meal' ? 'TableTalk®' : 'Chat'}</div>
        {report.meal && <div><strong>TableTalk®:</strong> {report.meal.title}</div>}
            {report.chat && <div><strong>Chat:</strong> {report.chat.name}</div>}
            <div><strong>Motivo:</strong> {report.reason}</div>
            {report.customReason && <div><strong>Motivo personalizzato:</strong> {report.customReason}</div>}
            <div><strong>Data:</strong> {new Date(report.createdAt).toLocaleString('it-IT')}</div>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
};

export default AdminLeaveReports; 