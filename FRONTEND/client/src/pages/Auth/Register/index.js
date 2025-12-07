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
    const [showPassword, setShowPassword] = useState(false);

    // Se già autenticato, evita la pagina e vai ai pasti
    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/meals', { replace: true });
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
        setErrors({});

        // Validazione frontend per l'età
        const ageError = validateAge(formData.dateOfBirth);
        if (ageError) {
            setErrors(prev => ({ ...prev, dateOfBirth: ageError }));
            setIsLoading(false);
            toast.error(t('common.pleaseCorrectErrors'));
            return;
        }

        try {
            await register({ ...formData });
            toast.success(t('auth.registerSuccess'));
            navigate('/meals', { replace: true });
        } catch (err) {
            if (err.errors && err.errors.length > 0) {
                const backendErrors = {};
                err.errors.forEach(error => {
                    if(error.path) { backendErrors[error.path] = error.msg; }
                });
                setErrors(backendErrors);
                toast.error(t('common.pleaseCorrectErrors'));
            } else {
                toast.error(err.message || t('auth.registerError'));
            }
        } finally {
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
                        <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
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
                        <ul><li>{t('auth.passwordRequirements')}</li></ul>
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
    
                    <div className={styles.bottomLink}>
                        {t('auth.alreadyHaveAccount')} <Link to="/login">{t('auth.login')}</Link>
                    </div>
                </Form>
            </div>
        </div>
    );
};

export default RegisterPage;