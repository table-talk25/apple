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
    const { token } = useParams(); // Prende il token dall'URL
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
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
        } catch (error) {
            toast.error(error.message || t('auth.invalidToken'));
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