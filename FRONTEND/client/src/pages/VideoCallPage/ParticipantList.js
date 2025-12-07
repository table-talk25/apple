import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { FaEllipsisV, FaFlag } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import styles from './VideoCallPage.module.css';

const ParticipantList = ({ participants, currentUser, onReportUser }) => {
    const { t } = useTranslation();

    if (!participants || participants.length === 0) {
        return (
            <div className={styles.participantsList}>
                <p className={styles.noParticipants}>
                    {t('videoCall.noParticipants')}
                </p>
            </div>
        );
    }

    return (
        <div className={styles.participantsList}>
            <h6 className={styles.participantsTitle}>
                {t('videoCall.participants')} ({participants.length})
            </h6>
            {participants.map((participant) => (
                <div key={participant.identity} className={styles.participantItem}>
                    <div className={styles.participantInfo}>
                        <div className={styles.participantAvatar}>
                            {participant.identity.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.participantDetails}>
                            <span className={styles.participantName}>
                                {participant.identity}
                            </span>
                            {participant.identity === currentUser?.nickname && (
                                <span className={styles.currentUserBadge}>
                                    {t('videoCall.you')}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* Menu di azioni per ogni partecipante (escludendo se stessi) */}
                    {participant.identity !== currentUser?.nickname && (
                        <Dropdown className={styles.participantActions}>
                            <Dropdown.Toggle 
                                variant="link" 
                                size="sm"
                                className={styles.actionToggle}
                            >
                                <FaEllipsisV />
                            </Dropdown.Toggle>
                            
                            <Dropdown.Menu>
                                <Dropdown.Item 
                                    onClick={() => onReportUser(participant)}
                                    className={styles.reportAction}
                                >
                                    <FaFlag className={styles.reportIcon} />
                                    {t('videoCall.reportUser')}
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ParticipantList;
