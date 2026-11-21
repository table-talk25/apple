import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Users, Check, X, UserMinus, Clock } from 'lucide-react';
import tribeService from '../../services/tribeService';
import { getHostAvatarUrl } from '../../constants/mealConstants';
import { Avatar, Button, EmptyState } from '../../components/ui';
import styles from './TribePage.module.css';

function TribePage() {
  const { t } = useTranslation();
  const [data, setData] = useState({ members: [], received: [], sent: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadTribe = useCallback(async () => {
    try {
      const res = await tribeService.getMyTribe();
      setData({
        members: Array.isArray(res?.members) ? res.members : [],
        received: Array.isArray(res?.received) ? res.received : [],
        sent: Array.isArray(res?.sent) ? res.sent : [],
      });
    } catch (_) {
      toast.error(t('tribe.loadError', 'Impossibile caricare la tua tribù.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTribe();
  }, [loadTribe]);

  const handleAccept = async (inviteId) => {
    setBusyId(inviteId);
    try {
      await tribeService.acceptInvite(inviteId);
      toast.success(t('tribe.acceptedToast', 'Nuovo membro aggiunto alla tua tribù!'));
      await loadTribe();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('tribe.actionError', 'Operazione non riuscita.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (inviteId) => {
    setBusyId(inviteId);
    try {
      await tribeService.declineInvite(inviteId);
      toast.info(t('tribe.declinedToast', 'Invito rifiutato.'));
      await loadTribe();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('tribe.actionError', 'Operazione non riuscita.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (inviteId) => {
    setBusyId(inviteId);
    try {
      await tribeService.cancelInvite(inviteId);
      toast.info(t('tribe.cancelledToast', 'Invito annullato.'));
      await loadTribe();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('tribe.actionError', 'Operazione non riuscita.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (userId) => {
    setBusyId(userId);
    try {
      await tribeService.removeMember(userId);
      toast.info(t('tribe.removedToast', 'Rimosso dalla tribù.'));
      await loadTribe();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('tribe.actionError', 'Operazione non riuscita.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div className={styles.headTitleRow}>
          <span className={styles.headIcon} aria-hidden="true">
            <Users size={22} />
          </span>
          <div>
            <h1>{t('tribe.title', 'La tua tribù')}</h1>
            <p>
              {t(
                'tribe.subtitle',
                'Le persone conosciute nei t2t con cui condividere tavoli privati tra amici.'
              )}
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className={styles.loadingBox}>{t('common.loading', 'Caricamento...')}</div>
      ) : (
        <div className={styles.sections}>
          {/* Inviti ricevuti */}
          {data.received.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                {t('tribe.receivedTitle', 'Inviti ricevuti')} ({data.received.length})
              </h2>
              <div className={styles.list}>
                {data.received.map((inv) => {
                  const sender = inv.fromUser || {};
                  const name = sender.nickname || 'Utente';
                  const img = sender.profileImage ? getHostAvatarUrl(sender.profileImage) : '';
                  const isBusy = busyId === inv._id;
                  return (
                    <div key={inv._id} className={styles.row}>
                      <Link to={`/public-profile/${sender._id}`} className={styles.userLink}>
                        <Avatar src={img} name={name} size="md" tone="primary" />
                        <div className={styles.userInfo}>
                          <span className={styles.userName}>{name}</span>
                          {inv.meal?.title && (
                            <span className={styles.userMeta}>
                              {t('tribe.metAt', 'Conosciuto a:')} {inv.meal.title}
                            </span>
                          )}
                        </div>
                      </Link>
                      <div className={styles.rowActions}>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleAccept(inv._id)}
                        >
                          <Check size={15} aria-hidden="true" />
                          <span>{t('tribe.accept', 'Accetta')}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleDecline(inv._id)}
                        >
                          <X size={15} aria-hidden="true" />
                          <span>{t('tribe.decline', 'Rifiuta')}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Membri della tribù */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {t('tribe.membersTitle', 'Membri')} ({data.members.length})
            </h2>
            {data.members.length > 0 ? (
              <div className={styles.list}>
                {data.members.map((member) => {
                  const name = member.nickname || 'Utente';
                  const img = member.profileImage ? getHostAvatarUrl(member.profileImage) : '';
                  const isBusy = busyId === member._id;
                  return (
                    <div key={member._id} className={styles.row}>
                      <Link to={`/public-profile/${member._id}`} className={styles.userLink}>
                        <Avatar src={img} name={name} size="md" tone="accent" />
                        <div className={styles.userInfo}>
                          <span className={styles.userName}>{name}</span>
                        </div>
                      </Link>
                      <div className={styles.rowActions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleRemove(member._id)}
                          aria-label={t('tribe.remove', 'Rimuovi')}
                        >
                          <UserMinus size={15} aria-hidden="true" />
                          <span>{t('tribe.remove', 'Rimuovi')}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon="👥"
                title={t('tribe.emptyTitle', 'La tua tribù è ancora vuota')}
                description={t(
                  'tribe.emptyDescription',
                  'Partecipa a un t2t e invita i partecipanti nella tua tribù dalla scheda del tavolo.'
                )}
                actionLabel={t('tribe.exploreCta', 'Vedi i t2t disponibili')}
                actionTo="/meals"
              />
            )}
          </section>

          {/* Inviti inviati */}
          {data.sent.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                {t('tribe.sentTitle', 'Inviti in attesa')} ({data.sent.length})
              </h2>
              <div className={styles.list}>
                {data.sent.map((inv) => {
                  const target = inv.toUser || {};
                  const name = target.nickname || 'Utente';
                  const img = target.profileImage ? getHostAvatarUrl(target.profileImage) : '';
                  const isBusy = busyId === inv._id;
                  return (
                    <div key={inv._id} className={styles.row}>
                      <Link to={`/public-profile/${target._id}`} className={styles.userLink}>
                        <Avatar src={img} name={name} size="md" tone="accent" />
                        <div className={styles.userInfo}>
                          <span className={styles.userName}>{name}</span>
                          <span className={styles.userMeta}>
                            <Clock size={12} aria-hidden="true" />
                            <span>{t('tribe.pending', 'In attesa di risposta')}</span>
                          </span>
                        </div>
                      </Link>
                      <div className={styles.rowActions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleCancel(inv._id)}
                        >
                          {t('tribe.cancel', 'Annulla')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default TribePage;
