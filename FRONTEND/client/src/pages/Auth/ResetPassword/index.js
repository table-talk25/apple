// File: src/pages/Auth/ResetPassword/index.js (Versione Corretta)

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

// --- CORREZIONE: Importiamo l'oggetto di default senza parentesi graffe ---
import authService from '../../../services/authService';
import Logo from '../../../components/common/Logo';
import styles from './ResetPassword.module.css';
import BackButton from '../../../components/common/BackButton';

const ResetPasswordPage = () => {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const { token } = useParams(); // Prende il token dall'URL
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        if (password !== confirmPassword) {
            toast.error(t('auth.passwordsDoNotMatch'));
            return;
        }
        setLoading(true);
        try {
            // Dobbiamo aggiungere la funzione al service, per ora simuliamo
            // await authService.resetPassword(token, password);
            toast.success(t('auth.resetPasswordSuccess'));
            navigate('/login');
        } catch (err) {
            const serverData = (err && err.response && err.response.data) || {};
            const serverMessage = (serverData.message || '').toString();
            const serverErrors = Array.isArray(serverData.errors) ? serverData.errors : [];
            const lowerMsg = serverMessage.toLowerCase();
            const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED';

            if (serverErrors.length > 0) {
                const backendErrors = {};
                serverErrors.forEach((e) => {
                    if (e && e.path) {
                        backendErrors[e.path] = e.msg;
                        if (e.path === 'password') {
                            backendErrors.newPassword = e.msg;
                        }
                    }
                });
                setErrors(backendErrors);
                const firstMsg = (serverErrors[0] && serverErrors[0].msg) || serverMessage || 'Controlla i campi del form';
                toast.error(firstMsg, { autoClose: 7000 });
            } else if (lowerMsg.includes('scaduto') || lowerMsg.includes('non valido')) {
                const msg = 'Link di reset scaduto o non valido. Richiedi un nuovo reset.';
                toast.error(msg, { autoClose: 8000 });
                setErrors((prev) => ({ ...prev, _form: msg }));
            } else if (isNetworkError) {
                const msg = 'Impossibile contattare il server. Controlla la connessione e riprova.';
                toast.error(msg, { autoClose: 7000 });
                setErrors((prev) => ({ ...prev, _form: msg }));
            } else if (serverMessage) {
                toast.error(serverMessage, { autoClose: 7000 });
            } else {
                toast.error(t('auth.invalidToken') || 'Errore. Riprova tra poco.', { autoClose: 6000 });
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
                <h2>{t('auth.resetPassword')}</h2>
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
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="password">{t('auth.newPassword')}</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        {errors.newPassword && (
                            <div style={{ color: '#a32424', fontSize: '0.85rem', marginTop: '4px' }}>
                                {errors.newPassword}
                            </div>
                        )}
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword">{t('auth.confirmNewPassword')}</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className={styles.submitButton} disabled={loading}>
                        {loading ? t('forms.saving') : t('forms.saveNewPassword')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;