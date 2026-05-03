// File: frontend/client/src/pages/Auth/RegisterPage.js (Versione Finale)
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Form, Button, InputGroup, FormCheck } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';
import Logo from '../../../components/common/Logo';
import styles from './RegisterPage.module.css';
import BackButton from '../../../components/common/BackButton';

const RegisterPage = () => {
    const navigate = useNavigate();
    const { register, isAuthenticated } = useAuth();
    const { t } = useTranslation();
    const [formData, setFormData] = useState({ 
        name: '', 
        surname: '', 
        email: '', 
        password: '', 
        confirmPassword: '', 
        dateOfBirth: '',
        terms: false 
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadingHint, setLoadingHint] = useState(''); // messaggio dopo qualche secondo se il server tarda
    const [showPassword, setShowPassword] = useState(false);

    // Se già autenticato, evita la pagina e vai al profilo
    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/impostazioni/profilo', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const validateAge = (dateOfBirth) => {
        if (!dateOfBirth) return t('auth.dateOfBirthRequired');
        
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        if (age < 18) {
            return t('auth.minAgeRequired');
        }
        
        return '';
    };

    const handleChange = (e) => {
        const { name, value, type, checked  } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
        
        // Validazione specifica per la data di nascita
        if (name === 'dateOfBirth') {
            const ageError = validateAge(value);
            if (ageError) {
                setErrors(prev => ({ ...prev, [name]: ageError }));
            } else {
                setErrors(prev => ({ ...prev, [name]: null }));
            }
        } else if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setLoadingHint('');
        setErrors({});

        // Validazione frontend per l'età
        const ageError = validateAge(formData.dateOfBirth);
        if (ageError) {
            setErrors(prev => ({ ...prev, dateOfBirth: ageError }));
            setIsLoading(false);
            toast.error(t('common.pleaseCorrectErrors'));
            return;
        }

        // 🛌 Hint per cold start di Render: se dopo 6s la chiamata non è ancora tornata,
        // mostra all'utente che il server si sta svegliando. Sparisce nel finally.
        const hintTimer = setTimeout(() => {
            setLoadingHint('Stiamo svegliando il server, può richiedere fino a 1 minuto la prima volta…');
        }, 6000);

        try {
            await register({ ...formData });
            // 🎯 ONBOARDING: dopo la registrazione l'utente atterra sul profilo per
            // completarlo (nickname/bio/interessi). PrivateRoute con requireCompleteProfile
            // blocca comunque mappa/create-meal/my-meals finché il profilo non è completo,
            // quindi se non lo facciamo qui, lo costringiamo a tornarci comunque.
            // ?firstTime=1 lascia alla ProfilePage la possibilità di mostrare una
            // header di benvenuto invece dell'header standard di modifica.
            toast.success(
                'Benvenuto su TableTalk! Completa il tuo profilo per iniziare.',
                { autoClose: 6000 }
            );
            navigate('/impostazioni/profilo?firstTime=1', { replace: true });
        } catch (err) {
            // 🩹 FIX UX: il messaggio del server sta in err.response.data, NON in err.message
            // (err.message è solo "Request failed with status code 400" di axios — inutile per l'utente).
            const serverData = (err && err.response && err.response.data) || {};
            const serverMessage = (serverData.message || '').toString();
            const serverErrors = Array.isArray(serverData.errors) ? serverData.errors : [];
            const lowerMsg = serverMessage.toLowerCase();
            const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED';

            // 1) Errori di validazione campo-per-campo (express-validator)
            if (serverErrors.length > 0) {
                const backendErrors = {};
                serverErrors.forEach((e) => {
                    if (e && e.path) backendErrors[e.path] = e.msg;
                });
                setErrors(backendErrors);
                const firstMsg = (serverErrors[0] && serverErrors[0].msg) || serverMessage || 'Controlla i campi del form';
                toast.error(firstMsg, { autoClose: 7000 });
            }
            // 2) Email duplicata (errore Mongo 11000 → backend manda "esiste già")
            else if (lowerMsg.includes('esiste già') || lowerMsg.includes('already exists')) {
                toast.error(serverMessage, { autoClose: 8000 });
                setErrors((prev) => ({ ...prev, email: serverMessage }));
            }
            // 3) Errore di rete / server non raggiungibile
            else if (isNetworkError) {
                const msg = 'Impossibile contattare il server. Controlla la connessione e riprova.';
                toast.error(msg, { autoClose: 7000 });
                setErrors((prev) => ({ ...prev, _form: msg }));
            }
            // 4) Altro errore con messaggio dal server
            else if (serverMessage) {
                toast.error(serverMessage, { autoClose: 7000 });
            }
            // 5) Fallback: il server ha risposto ma senza dettagli interpretabili.
            //    NON inventiamo cause specifiche (che ingannerebbero l'utente quando
            //    il problema reale e' altro), preferiamo sempre il message del server
            //    se c'e', altrimenti messaggio neutro per status code.
            else {
                const status = err?.response?.status;
                let detail;

                if (serverMessage) {
                    // Caso 99% nel ramo 5 dopo la fix backend (errorResponse): il server
                    // ha mandato un message ma niente errors[] strutturato. Mostralo cosi' com'e'.
                    detail = serverMessage;
                } else if (status === 400) {
                    detail = 'Alcuni dati non sono validi. Controlla i campi compilati e riprova.';
                } else if (status === 429) {
                    detail = 'Troppi tentativi di registrazione. Riprova tra qualche minuto.';
                } else if (status >= 500) {
                    detail = 'Il server non risponde correttamente. Riprova tra un minuto.';
                } else {
                    detail = `Errore durante la registrazione${status ? ` (codice ${status})` : ''}. Riprova tra poco o contatta il supporto.`;
                }

                toast.error(detail, { autoClose: 8000 });
                setErrors((prev) => ({ ...prev, _form: detail }));
            }
        } finally {
            clearTimeout(hintTimer);
            setLoadingHint('');
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div style={{ padding: '12px 16px' }}>
                <BackButton />
            </div>
            <div className={styles.card}>
                <div className={styles.logoContainer}>
                    <Link to="/" className={styles.logoLink}>
                        <Logo />
                    </Link>
                </div>
                <h2 className={styles.title}>{t('auth.createAccount')}</h2>
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
                <Form onSubmit={handleSubmit} noValidate>
                    <Form.Group className="mb-3">
                        <Form.Label className={styles.formLabel}>{t('auth.name')}</Form.Label>
                        <Form.Control className={styles.formInput} type="text" name="name" value={formData.name} onChange={handleChange} isInvalid={!!errors.name} autoComplete="given-name" required />
                        <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className={styles.formLabel}>{t('auth.surname')}</Form.Label>
                        <Form.Control className={styles.formInput} type="text" name="surname" value={formData.surname} onChange={handleChange} isInvalid={!!errors.surname} autoComplete="family-name" required />
                        <Form.Control.Feedback type="invalid">{errors.surname}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className={styles.formLabel}>Email</Form.Label>
                        <Form.Control className={styles.formInput} type="email" name="email" value={formData.email} onChange={handleChange} isInvalid={!!errors.email} autoComplete="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
                        <Form.Control.Feedback type="invalid">
                            {errors.email}
                            {errors.email && (errors.email.includes('esiste già') || errors.email.includes('already exists')) && (
                                <div style={{ marginTop: '8px' }}>
                                    <Link to="/login" style={{ color: '#dc3545', textDecoration: 'underline', fontSize: '0.875rem' }}>
                                        Vai alla pagina di login →
                                    </Link>
                                </div>
                            )}
                        </Form.Control.Feedback>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                        <Form.Label className={styles.formLabel}>{t('auth.dateOfBirth')}</Form.Label>
                            <Form.Control 
                            className={styles.formInput} 
                            type="date" 
                            name="dateOfBirth" 
                            value={formData.dateOfBirth} 
                            onChange={handleChange} 
                            isInvalid={!!errors.dateOfBirth} 
                             autoComplete="bday"
                            required 
                        />
                        <Form.Control.Feedback type="invalid">{errors.dateOfBirth}</Form.Control.Feedback>
                        <Form.Text className="text-muted">{t('auth.minAgeRequired')}</Form.Text>
                    </Form.Group>
    
                    <Form.Group className="mb-3">
                        <Form.Label className={styles.formLabel}>{t('auth.password')}</Form.Label>
                        <InputGroup hasValidation className={styles.inputGroup}>
                            <Form.Control className={styles.formInput} type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} isInvalid={!!errors.password} autoComplete="new-password" required />
                            <InputGroup.Text onClick={() => setShowPassword(!showPassword)} className={styles.passwordToggle}>{showPassword ? <FaEyeSlash /> : <FaEye />}</InputGroup.Text>
                            <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                        </InputGroup>
                    </Form.Group>
                    
                    <div className={styles.passwordRequirements}>
                        <ul><li>{t('auth.passwordRequirements', { defaultValue: 'Almeno 8 caratteri, con maiuscole, minuscole e numeri.' })}</li></ul>
                    </div>
                    
                    <Form.Group>
                        <Form.Label className={styles.formLabel}>{t('auth.confirmPassword')}</Form.Label>
                        <Form.Control className={styles.formInput} type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} isInvalid={!!errors.confirmPassword} autoComplete="new-password" required />
                        <Form.Control.Feedback type="invalid">{errors.confirmPassword}</Form.Control.Feedback>
                    </Form.Group>
    
                    <Form.Group className={styles.termsContainer}>
                        <FormCheck 
                            id="terms-checkbox"
                            name="terms"
                            checked={formData.terms}
                            onChange={handleChange}
                            isInvalid={!!errors.terms}
                            feedback={errors.terms}
                            feedbackType="invalid"
                        />
                        <div className={styles.termsLabel}>
                        {t('auth.termsText')} 
                            <Link to="/termini-e-condizioni"> {t('auth.termsOfService')}</Link> {t('auth.and')} 
                            <Link to="/privacy"> {t('auth.privacyPolicy')}</Link>.
                            </div>
                            </Form.Group>

                    <Button type="submit" className={styles.submitButton} disabled={isLoading || !formData.terms}>
                        {isLoading ? t('auth.registering') : t('auth.register')}
                    </Button>
                    {loadingHint && (
                        <div role="status" aria-live="polite" style={{
                            marginTop: '10px',
                            fontSize: '0.85rem',
                            color: '#5b4a00',
                            background: '#fff7e0',
                            border: '1px solid #ffe28a',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            textAlign: 'center',
                        }}>
                            ⏳ {loadingHint}
                        </div>
                    )}
    
                    <div className={styles.bottomLink}>
                        {t('auth.alreadyHaveAccount')} <Link to="/login">{t('auth.login')}</Link>
                    </div>
                </Form>
            </div>
        </div>
    );
};

export default RegisterPage;