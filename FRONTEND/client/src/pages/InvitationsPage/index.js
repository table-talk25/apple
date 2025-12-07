import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getReceivedInvitations, acceptInvitation } from '../../services/invitationService';
import { Button, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import BackButton from '../../components/common/BackButton';

const InvitationsPage = () => {
  const { t } = useTranslation();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReceivedInvitations()
      .then(data => setInvitations(data.data))
      .catch(() => toast.error(t('invitations.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const handleAccept = async (invitationId) => {
    try {
      await acceptInvitation(invitationId);
      toast.success(t('invitations.acceptSuccess'));
      setInvitations(prev => prev.filter(inv => inv._id !== invitationId));
    } catch {
      toast.error(t('invitations.acceptError'));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <BackButton className="mb-3" />
      <h2>{t('invitations.pageTitle')}</h2>
      {invitations.length === 0 && <p>{t('invitations.noInvitations')}</p>}
      {invitations.map(inv => (
        <Card key={inv._id} className="mb-3">
          <Card.Body>
            <Card.Title>{t('invitations.from')} {inv.sender.nickname}</Card.Title>
            <Card.Text>{inv.message}</Card.Text>
            {inv.status === 'accepted' && inv.chatId ? (
              <Link to={`/chat/${inv.chatId}`}>{t('invitations.goToChat')}</Link>
            ) : (
              <Button onClick={() => handleAccept(inv._id)}>{t('invitations.accept')}</Button>
            )}
          </Card.Body>
        </Card>
      ))}
    </div>
  );
};

export default InvitationsPage; 