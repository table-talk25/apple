// File: FRONTEND/client/src/pages/PrivacyPolicyPage/index.js

// File: FRONTEND/client/src/pages/PrivacyPolicyPage/index.js

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './PrivacyPolicyPage.module.css';
import BackButton from '../../components/common/BackButton';

const PrivacyPolicyPage = () => {
    const { t } = useTranslation();

    return (
        <div className={styles.privacyContainer}>
            <div className={styles.topBar}>
                <BackButton className={styles.backButton} />
            </div>
            
            <h1 className={styles.mainTitle}>{t('privacy.title')}</h1>
            <p className={styles.lastUpdated}>{t('privacy.lastUpdated')}</p>
            
            <p>{t('privacy.introduction')}</p>

            <h2 className={styles.sectionTitle}>{t('privacy.legalBasis.title')}</h2>
            <p>{t('privacy.legalBasis.description')}</p>
            <ul>
                <li><strong>{t('privacy.legalBasis.contractual')}</strong> {t('privacy.legalBasis.contractualDesc')}</li>
                <li><strong>{t('privacy.legalBasis.consent')}</strong> {t('privacy.legalBasis.consentDesc')}</li>
                <li><strong>{t('privacy.legalBasis.legitimate')}</strong> {t('privacy.legalBasis.legitimateDesc')}</li>
            </ul>

            <h2 className={styles.sectionTitle}>{t('privacy.dataCollection.title')}</h2>
            <p>{t('privacy.dataCollection.description')}</p>
            <ul>
                <li><strong>{t('privacy.dataCollection.provided.title')}</strong>
                    <ul>
                        <li><strong>{t('privacy.dataCollection.provided.registration')}</strong> {t('privacy.dataCollection.provided.registrationDesc')}</li>
                        <li><strong>{t('privacy.dataCollection.provided.profile')}</strong> {t('privacy.dataCollection.provided.profileDesc')}</li>
                        <li><strong>{t('privacy.dataCollection.provided.communications')}</strong> {t('privacy.dataCollection.provided.communicationsDesc')}</li>
                    </ul>
                </li>
                <li><strong>{t('privacy.dataCollection.usage.title')}</strong>
                    <ul>
                        <li><strong>{t('privacy.dataCollection.usage.interaction')}</strong> {t('privacy.dataCollection.usage.interactionDesc')}</li>
                        <li><strong>{t('privacy.dataCollection.usage.technical')}</strong> {t('privacy.dataCollection.usage.technicalDesc')}</li>
                    </ul>
                </li>
                 <li><strong>{t('privacy.dataCollection.location.title')}</strong> {t('privacy.dataCollection.location.description')}</li>
            </ul>

            <h2 className={styles.sectionTitle}>{t('privacy.dataUsage.title')}</h2>
            <p>{t('privacy.dataUsage.description')}</p>
            <ul>
                <li>{t('privacy.dataUsage.provide')}</li>
                <li>{t('privacy.dataUsage.personalize')}</li>
                <li>{t('privacy.dataUsage.manage')}</li>
                <li>{t('privacy.dataUsage.security')}</li>
            </ul>
            
            <h2 className={styles.sectionTitle}>{t('privacy.dataSharing.title')}</h2>
            <p>{t('privacy.dataSharing.description')}</p>
            <ul>
                <li><strong>{t('privacy.dataSharing.serviceProviders')}</strong> {t('privacy.dataSharing.serviceProvidersDesc')}</li>
                <li><strong>{t('privacy.dataSharing.legalObligations')}</strong> {t('privacy.dataSharing.legalObligationsDesc')}</li>
            </ul>
            
            <h2 className={styles.sectionTitle}>{t('privacy.internationalTransfers.title')}</h2>
            <p>{t('privacy.internationalTransfers.description')}</p>

            <h2 className={styles.sectionTitle}>{t('privacy.dataRetention.title')}</h2>
            <p>{t('privacy.dataRetention.description')}</p>

            <h2 className={styles.sectionTitle}>{t('privacy.yourRights.title')}</h2>
            <p>{t('privacy.yourRights.description')}</p>
            <ul>
                <li><strong>{t('privacy.yourRights.access')}</strong> {t('privacy.yourRights.accessDesc')}</li>
                <li><strong>{t('privacy.yourRights.rectification')}</strong> {t('privacy.yourRights.rectificationDesc')}</li>
                <li><strong>{t('privacy.yourRights.deletion')}</strong> {t('privacy.yourRights.deletionDesc')}</li>
                <li><strong>{t('privacy.yourRights.limitation')}</strong> {t('privacy.yourRights.limitationDesc')}</li>
                <li><strong>{t('privacy.yourRights.portability')}</strong> {t('privacy.yourRights.portabilityDesc')}</li>
                <li><strong>{t('privacy.yourRights.opposition')}</strong> {t('privacy.yourRights.oppositionDesc')}</li>
            </ul>
            <p>{t('privacy.yourRights.exercise')}</p>

            <h2 className={styles.sectionTitle}>{t('privacy.accountDeletion.title')}</h2>
            <p>{t('privacy.accountDeletion.description')}</p>

            <h2 className={styles.sectionTitle}>{t('privacy.minors.title')}</h2>
            <p>{t('privacy.minors.description')}</p>
            <p><strong>Nota:</strong> La nostra app non è destinata a minori di 18 anni.</p>

            <h2 className={styles.sectionTitle}>{t('privacy.contact.title')}</h2>
            <p>{t('privacy.contact.description')}</p>
        <p><strong>Email:</strong> infotabletalk.app@gmail.com</p>
        </div>
    );
};

export default PrivacyPolicyPage;