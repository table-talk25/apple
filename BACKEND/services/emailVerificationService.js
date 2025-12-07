// File: BACKEND/services/emailVerificationService.js
// 🔐 SERVIZIO PER VERIFICA EMAIL
// 
// Questo servizio gestisce l'intero processo di verifica email:
// - Generazione token sicuri
// - Invio email di verifica
// - Validazione token
// - Gestione scadenze e riinvii

const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const path = require('path');
const fs = require('fs').promises;

class EmailVerificationService {
  constructor() {
    this.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.TOKEN_EXPIRY_HOURS = 24;
    this.MAX_RESEND_ATTEMPTS = 3;
    this.RESEND_COOLDOWN_MINUTES = 15;
  }

  /**
   * 🔐 Genera e invia email di verifica per un nuovo utente
   * @param {Object} user - Utente da verificare
   * @returns {Object} Risultato dell'operazione
   */
  async sendVerificationEmail(user) {
    try {
      console.log(`🔐 [EmailVerification] Invio email verifica per utente: ${user._id}`);

      // Genera token di verifica
      const verificationToken = user.generateEmailVerificationToken();
      
      // Salva l'utente con il token
      await user.save();
      
      // Costruisci l'URL di verifica
      const verificationUrl = `${this.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      
      // Prepara i dati per il template
      const emailData = {
        name: user.name,
        surname: user.surname,
        email: user.email,
        verificationUrl: verificationUrl,
        currentYear: new Date().getFullYear()
      };

      // Invia l'email
      const emailResult = await this.sendVerificationEmailTemplate(user.email, emailData);
      
      if (emailResult.success) {
        console.log(`✅ [EmailVerification] Email verifica inviata con successo a: ${user.email}`);
        
        return {
          success: true,
          message: 'Email di verifica inviata con successo',
          userId: user._id,
          email: user.email,
          tokenExpires: user.verificationTokenExpires,
          verificationUrl: verificationUrl
        };
      } else {
        throw new Error(`Errore nell'invio email: ${emailResult.message}`);
      }

    } catch (error) {
      console.error(`❌ [EmailVerification] Errore nell'invio email verifica:`, error);
      
      // Rimuovi il token in caso di errore
      if (user.verificationToken) {
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();
      }
      
      return {
        success: false,
        message: 'Errore nell\'invio email di verifica',
        error: error.message
      };
    }
  }

  /**
   * 📧 Invia email utilizzando il template Handlebars
   * @param {string} email - Indirizzo email destinatario
   * @param {Object} data - Dati per il template
   * @returns {Object} Risultato dell'invio
   */
  async sendVerificationEmailTemplate(email, data) {
    try {
      // Leggi il template HTML
      const templatePath = path.join(__dirname, '../templates/email/email-verification.hbs');
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      // Prepara i dati per l'email
      const emailOptions = {
        to: email,
        subject: '🍽️ Verifica la tua Email - TableTalk',
        html: templateContent,
        templateData: data
      };

      // Invia l'email
      const result = await sendEmail(emailOptions);
      
      return {
        success: true,
        message: 'Email inviata con successo',
        result: result
      };

    } catch (error) {
      console.error(`❌ [EmailVerification] Errore template email:`, error);
      return {
        success: false,
        message: 'Errore nella preparazione template email',
        error: error.message
      };
    }
  }

  /**
   * ✅ Verifica un token di verifica email
   * @param {string} token - Token da verificare
   * @returns {Object} Risultato della verifica
   */
  async verifyEmailToken(token) {
    try {
      console.log(`🔍 [EmailVerification] Verifica token: ${token.substring(0, 8)}...`);

      // Trova l'utente con questo token
      const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: new Date() }
      });

      if (!user) {
        console.log(`❌ [EmailVerification] Token non valido o scaduto`);
        return {
          success: false,
          message: 'Token di verifica non valido o scaduto',
          code: 'INVALID_TOKEN'
        };
      }

      // Verifica che il token sia ancora valido
      if (!user.isEmailVerificationTokenValid(token)) {
        console.log(`❌ [EmailVerification] Token non valido per utente: ${user._id}`);
        return {
          success: false,
          message: 'Token di verifica non valido',
          code: 'INVALID_TOKEN'
        };
      }

      // Marca l'email come verificata
      user.verifyEmail();
      await user.save();

      console.log(`✅ [EmailVerification] Email verificata con successo per utente: ${user._id}`);

      return {
        success: true,
        message: 'Email verificata con successo',
        userId: user._id,
        email: user.email,
        user: {
          _id: user._id,
          name: user.name,
          surname: user.surname,
          email: user.email,
          isEmailVerified: user.isEmailVerified
        }
      };

    } catch (error) {
      console.error(`❌ [EmailVerification] Errore nella verifica token:`, error);
      return {
        success: false,
        message: 'Errore nella verifica del token',
        error: error.message,
        code: 'VERIFICATION_ERROR'
      };
    }
  }

  /**
   * 🔄 Reinvia email di verifica
   * @param {string} email - Email dell'utente
   * @returns {Object} Risultato dell'operazione
   */
  async resendVerificationEmail(email) {
    try {
      console.log(`🔄 [EmailVerification] Richiesta riinvio verifica per: ${email}`);

      // Trova l'utente
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        return {
          success: false,
          message: 'Utente non trovato',
          code: 'USER_NOT_FOUND'
        };
      }

      // Verifica se l'email è già verificata
      if (user.isEmailVerified) {
        return {
          success: false,
          message: 'Email già verificata',
          code: 'ALREADY_VERIFIED'
        };
      }

      // Controlla se è troppo presto per reinviare
      if (user.verificationTokenExpires) {
        const timeSinceLastEmail = Date.now() - user.verificationTokenExpires.getTime() + (this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
        const cooldownMs = this.RESEND_COOLDOWN_MINUTES * 60 * 1000;
        
        if (timeSinceLastEmail < cooldownMs) {
          const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastEmail) / (60 * 1000));
          return {
            success: false,
            message: `Devi aspettare ${remainingMinutes} minuti prima di richiedere un nuovo link`,
            code: 'COOLDOWN_ACTIVE',
            remainingMinutes: remainingMinutes
          };
        }
      }

      // Genera nuovo token e invia email
      const result = await this.sendVerificationEmail(user);
      
      if (result.success) {
        console.log(`✅ [EmailVerification] Email verifica reinviata a: ${email}`);
        return {
          success: true,
          message: 'Email di verifica reinviata con successo',
          email: email,
          tokenExpires: result.tokenExpires
        };
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error(`❌ [EmailVerification] Errore nel riinvio email:`, error);
      return {
        success: false,
        message: 'Errore nel riinvio email di verifica',
        error: error.message
      };
    }
  }

  /**
   * 🧹 Pulisce token di verifica scaduti
   * @returns {Object} Risultato della pulizia
   */
  async cleanupExpiredTokens() {
    try {
      console.log(`🧹 [EmailVerification] Pulizia token scaduti...`);

      const result = await User.updateMany(
        {
          verificationTokenExpires: { $lt: new Date() }
        },
        {
          $unset: {
            verificationToken: 1,
            verificationTokenExpires: 1
          }
        }
      );

      console.log(`✅ [EmailVerification] Puliti ${result.modifiedCount} token scaduti`);
      
      return {
        success: true,
        message: `Puliti ${result.modifiedCount} token scaduti`,
        cleanedCount: result.modifiedCount
      };

    } catch (error) {
      console.error(`❌ [EmailVerification] Errore nella pulizia token:`, error);
      return {
        success: false,
        message: 'Errore nella pulizia token scaduti',
        error: error.message
      };
    }
  }

  /**
   * 📊 Ottiene statistiche sulla verifica email
   * @returns {Object} Statistiche
   */
  async getVerificationStats() {
    try {
      const totalUsers = await User.countDocuments();
      const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
      const pendingVerification = await User.countDocuments({
        verificationToken: { $exists: true },
        verificationTokenExpires: { $gt: new Date() }
      });
      const expiredTokens = await User.countDocuments({
        verificationTokenExpires: { $lt: new Date() }
      });

      return {
        success: true,
        stats: {
          totalUsers,
          verifiedUsers,
          pendingVerification,
          expiredTokens,
          verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0
        }
      };

    } catch (error) {
      console.error(`❌ [EmailVerification] Errore nel recupero statistiche:`, error);
      return {
        success: false,
        message: 'Errore nel recupero statistiche',
        error: error.message
      };
    }
  }

  /**
   * 🔍 Valida configurazione del servizio
   * @returns {Object} Risultato validazione
   */
  validateConfiguration() {
    const issues = [];
    
    if (!this.FRONTEND_URL) {
      issues.push('FRONTEND_URL non configurato');
    }
    
    if (this.TOKEN_EXPIRY_HOURS < 1) {
      issues.push('TOKEN_EXPIRY_HOURS deve essere almeno 1');
    }
    
    if (this.MAX_RESEND_ATTEMPTS < 1) {
      issues.push('MAX_RESEND_ATTEMPTS deve essere almeno 1');
    }
    
    if (this.RESEND_COOLDOWN_MINUTES < 1) {
      issues.push('RESEND_COOLDOWN_MINUTES deve essere almeno 1');
    }

    return {
      valid: issues.length === 0,
      issues: issues,
      config: {
        FRONTEND_URL: this.FRONTEND_URL,
        TOKEN_EXPIRY_HOURS: this.TOKEN_EXPIRY_HOURS,
        MAX_RESEND_ATTEMPTS: this.MAX_RESEND_ATTEMPTS,
        RESEND_COOLDOWN_MINUTES: this.RESEND_COOLDOWN_MINUTES
      }
    };
  }
}

// Esporta un'istanza singleton
const emailVerificationService = new EmailVerificationService();

// Log della configurazione all'avvio
const configValidation = emailVerificationService.validateConfiguration();
if (!configValidation.valid) {
  console.warn(`⚠️ [EmailVerification] Problemi di configurazione:`, configValidation.issues);
} else {
  console.log(`✅ [EmailVerification] Servizio configurato correttamente:`, configValidation.config);
}

module.exports = emailVerificationService;
