const { check } = require('express-validator');const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../../utils/errorResponse');
const User = require('../../models/User');
/**
 * Validazioni per la registrazione
 */
exports.registerValidation = [
    check('name', 'Il nome è obbligatorio')
        .not()
        .isEmpty()
        .trim()
        .matches(/^[a-zA-Z\s]*$/)
        .withMessage('Il nome può contenere solo lettere e spazi'),
    
    check('surname', 'Il cognome è obbligatorio')
        .not()
        .isEmpty()
        .trim()
        .matches(/^[a-zA-Z\s]*$/)
        .withMessage('Il cognome può contenere solo lettere e spazi'),
    
    check('email', 'Inserisci un indirizzo email valido')
        .isEmail()
        .normalizeEmail(),
    
    check('password')
        .isLength({ min: 8 }).withMessage('La password deve avere almeno 8 caratteri')
        .matches(/[a-z]/).withMessage('La password deve contenere almeno una lettera minuscola')
        .matches(/[A-Z]/).withMessage('La password deve contenere almeno una lettera maiuscola')
        .matches(/\d/).withMessage('La password deve contenere almeno un numero'),

    check('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Le password non coincidono');
            }
            return true;
        }),

    check('dateOfBirth', 'Data di nascita obbligatoria')
        .notEmpty()
        .isISO8601().withMessage('Data di nascita non valida')
        .custom((value) => {
            const ms = Date.now() - new Date(value).getTime();
            const ageYears = ms / (365.25 * 24 * 60 * 60 * 1000);
            if (ageYears < 18) {
                throw new Error('Devi avere almeno 18 anni per registrarti');
            }
            if (ageYears > 120) {
                throw new Error('Data di nascita non valida');
            }
            return true;
        }),

    check('terms')
        .custom((value) => {
            // Accetta sia booleano true che stringa "true" (axios manda boolean,
            // ma alcuni form encoder potrebbero serializzarlo come stringa).
            if (value === true || value === 'true' || value === 1 || value === '1') {
                return true;
            }
            throw new Error('Devi accettare termini e privacy per registrarti');
        }),
];

/**
 * Validazioni per il login
 */
exports.loginValidation = [
    check('email', 'Inserisci un indirizzo email valido')
        .isEmail()
        .normalizeEmail(),
    
    check('password', 'La password è obbligatoria')
        .not()
        .isEmpty()
];

/**
 * Validazioni per il reset della password
 */
exports.resetPasswordValidation = [
    check('password')
        .isLength({ min: 8 }).withMessage('La password deve avere almeno 8 caratteri')
        .matches(/[a-z]/).withMessage('La password deve contenere almeno una lettera minuscola')
        .matches(/[A-Z]/).withMessage('La password deve contenere almeno una lettera maiuscola')
        .matches(/\d/).withMessage('La password deve contenere almeno un numero'),

    check('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Le password non coincidono');
            }
            return true;
        }),
];

/**
 * Validazioni per la richiesta di reset password
 */
exports.forgotPasswordValidation = [
    check('email', 'Inserisci un indirizzo email valido')
        .isEmail()
        .normalizeEmail()
];

/**
 * Validazioni per la verifica email
 */
exports.verifyEmailValidation = [
    check('email', 'Inserisci un indirizzo email valido')
        .isEmail()
        .normalizeEmail()
];

/**
 * Validazioni per il cambio password
 */
exports.changePasswordValidation = [
    check('currentPassword', 'La password attuale è obbligatoria')
        .not()
        .isEmpty(),
    
    check('newPassword')
        .isLength({ min: 8 }).withMessage('La password deve avere almeno 8 caratteri')
        .matches(/[a-z]/).withMessage('La password deve contenere almeno una lettera minuscola')
        .matches(/[A-Z]/).withMessage('La password deve contenere almeno una lettera maiuscola')
        .matches(/\d/).withMessage('La password deve contenere almeno un numero'),

    check('confirmNewPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Le password non coincidono');
            }
            return true;
        }),
];
