// File: src/pages/Auth/ForgotPassword/index.js (Versione Corretta)

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// --- CORREZIONE: Importiamo l'oggetto di default senza parentesi graffe ---
import authService from '../../../services/authService';
import Logo from '../../../components/common/Logo';
import styles from './ForgotPassword.module.css';
import BackButton from '../../../components/common/BackButton';

const ForgotPasswordPage = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            await authService.forgotPassword({ email });
            setMessage(t('auth.emailSentMessage'));
            toast.success(t('auth.requestSent'));
        } catch (error) {
            toast.error(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div style={{ padding: '12px 16px' }}>
                <BackButton />
            </div>
            <div className={styles.card}>
                <div className={styles.logoContainer}>
                    <Link to="/" className={styles.logoLink}>
                        <Logo />
                    </Link>
                </div>
                <h2>{t('auth.forgotPasswordTitle')}</h2>
                <p>{t('auth.forgotPasswordDescription')}</p>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">{t('auth.email')}</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('auth.emailPlaceholder')}
                            required
                        />
                    </div>
                    <button type="submit" className={styles.submitButton} disabled={loading}>
                        {loading ? t('auth.sending') : t('auth.sendInstructions')}
                    </button>
                </form>
                {message && <div className={styles.message}>{message}</div>}
                <div className={styles.backLink}>
                    <Link to="/login">{t('auth.backToLogin')}</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;