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
    const [errors, setErrors] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setErrors({});
        try {
            await authService.forgotPassword({ email });
            setMessage(t('auth.emailSentMessage'));
            toast.success(t('auth.requestSent'));
        } catch (err) {
            const serverData = (err && err.response && err.response.data) || {};
            const serverMessage = (serverData.message || '').toString();
            const serverErrors = Array.isArray(serverData.errors) ? serverData.errors : [];
            const lowerMsg = serverMessage.toLowerCase();
            const status = err && err.response && err.response.status;
            const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED';

            if (serverErrors.length > 0) {
                const firstMsg = (serverErrors[0] && serverErrors[0].msg) || serverMessage || 'Controlla i campi del form';
                toast.error(firstMsg, { autoClose: 7000 });
            } else if (lowerMsg.includes('cooldown') || status === 429) {
                const msg = serverMessage || 'Hai già richiesto un reset di recente. Riprova tra qualche minuto.';
                toast.error(msg, { autoClose: 8000 });
            } else if (isNetworkError) {
                const msg = 'Impossibile contattare il server. Controlla la connessione e riprova.';
                toast.error(msg, { autoClose: 7000 });
                setErrors((prev) => ({ ...prev, _form: msg }));
            } else if (serverMessage) {
                toast.error(serverMessage, { autoClose: 7000 });
            } else {
                toast.error(t('common.error') || 'Errore. Riprova tra poco.', { autoClose: 6000 });
            }
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
                {errors._form && (
                    <div role="alert" style={{
                        background: '#fdecea',
                        color: '#a32424',
                        border: '1px solid #f5b7b1',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        marginBottom: '14px',
                        fontSize: '0.9rem',
                    }}>
                        {errors._form}
                    </div>
                )}
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