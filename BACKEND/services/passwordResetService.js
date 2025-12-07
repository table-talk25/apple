// File: BACKEND/services/passwordResetService.js
// 🔑 SERVIZIO PER RESET PASSWORD
// 
// Questo servizio gestisce l'intero processo di reset password:
// - Generazione token sicuri
// - Invio email di reset
// - Validazione token
// - Gestione scadenze e sicurezza

const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const path = require('path');
const fs = require('fs').promises;

class PasswordResetService {
  constructor() {
    this.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.TOKEN_EXPIRY_HOURS = 1; // 1 ora per sicurezza
    this.MAX_RESET_ATTEMPTS = 3;
    this.RESET_COOLDOWN_MINUTES = 15;
  }

  /**
   * 🔑 Genera e invia email di reset password
   * @param {string} email - Email dell'utente
   * @returns {Object} Risultato dell'operazione
   */
  async sendPasswordResetEmail(email) {
    try {
      console.log(`🔑 [PasswordReset] Richiesta reset password per: ${email}`);

      // Trova l'utente
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        // Per sicurezza, non riveliamo se l'utente esiste
        console.log(`🔒 [PasswordReset] Email non trovata: ${email} (non rivelato all'utente)`);
        return {
          success: true,
          message: 'Se l\'email è registrata, riceverai un link per il reset della password.',
          email: email
        };
      }

      // Verifica se l'utente ha troppi tentativi recenti
      if (user.resetPasswordToken && user.resetPasswordExpires) {
        const timeSinceLastReset = Date.now() - user.resetPasswordExpires.getTime() + (this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
        const cooldownMs = this.RESET_COOLDOWN_MINUTES * 60 * 1000;
        
        if (timeSinceLastReset < cooldownMs) {
          const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastReset) / (60 * 1000));
          console.log(`⏳ [PasswordReset] Cooldown attivo per ${email}: ${remainingMinutes} minuti rimanenti`);
          
          return {
            success: false,
            message: `Devi aspettare ${remainingMinutes} minuti prima di richiedere un nuovo reset`,
            code: 'COOLDOWN_ACTIVE',
            remainingMinutes: remainingMinutes
          };
        }
      }

      // Genera token di reset
      const resetToken = user.generatePasswordResetToken();
      
      // Salva l'utente con il token
      await user.save();
      
      // Costruisci l'URL di reset
      const resetUrl = `${this.FRONTEND_URL}/reset-password/${resetToken}`;
      
      // Prepara i dati per il template
      const emailData = {
        name: user.name,
        surname: user.surname,
        email: user.email,
        resetUrl: resetUrl,
        currentYear: new Date().getFullYear()
      };

      // Invia l'email
      const emailResult = await this.sendPasswordResetEmailTemplate(user.email, emailData);
      
      if (emailResult.success) {
        console.log(`✅ [PasswordReset] Email reset inviata con successo a: ${email}`);
        
        return {
          success: true,
          message: 'Email di reset inviata. Controlla la tua casella di posta.',
          email: email,
          tokenExpires: user.resetPasswordExpires,
          resetUrl: resetUrl
        };
      } else {
        throw new Error(`Errore nell'invio email: ${emailResult.message}`);
      }

    } catch (error) {
      console.error(`❌ [PasswordReset] Errore nell'invio email reset:`, error);
      
      // Rimuovi il token in caso di errore
      if (user && user.resetPasswordToken) {
        user.clearPasswordResetToken();
        await user.save();
      }
      
      return {
        success: false,
        message: 'Errore nell\'invio email di reset. Riprova più tardi.',
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
  async sendPasswordResetEmailTemplate(email, data) {
    try {
      // Leggi il template HTML
      const templatePath = path.join(__dirname, '../templates/email/password-reset.hbs');
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      // Prepara i dati per l'email
      const emailOptions = {
        to: email,
        subject: '🔑 Reset Password - TableTalk',
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
      console.error(`❌ [PasswordReset] Errore template email:`, error);
      return {
        success: false,
        message: 'Errore nella preparazione template email',
        error: error.message
      };
    }
  }

  /**
   * ✅ Verifica un token di reset password
   * @param {string} token - Token da verificare
   * @returns {Object} Risultato della verifica
   */
  async verifyResetToken(token) {
    try {
      console.log(`🔍 [PasswordReset] Verifica token: ${token.substring(0, 8)}...`);

      // Trova l'utente con questo token
      const user = await User.findOne({
        resetPasswordToken: { $exists: true },
        resetPasswordExpires: { $gt: new Date() }
      });

      if (!user) {
        console.log(`❌ [PasswordReset] Token non valido o scaduto`);
        return {
          success: false,
          message: 'Token di reset non valido o scaduto',
          code: 'INVALID_TOKEN'
        };
      }

      // Verifica che il token sia ancora valido
      if (!user.isPasswordResetTokenValid(token)) {
        console.log(`❌ [PasswordReset] Token non valido per utente: ${user._id}`);
        return {
          success: false,
          message: 'Token di reset non valido',
          code: 'INVALID_TOKEN'
        };
      }

      console.log(`✅ [PasswordReset] Token valido per utente: ${user._id}`);

      return {
        success: true,
        message: 'Token di reset valido',
        userId: user._id,
        email: user.email,
        user: {
          _id: user._id,
          name: user.name,
          surname: user.surname,
          email: user.email
        }
      };

    } catch (error) {
      console.error(`❌ [PasswordReset] Errore nella verifica token:`, error);
      return {
        success: false,
        message: 'Errore nella verifica del token',
        error: error.message,
        code: 'VERIFICATION_ERROR'
      };
    }
  }

  /**
   * 🔄 Resetta la password usando un token valido
   * @param {string} token - Token di reset
   * @param {string} newPassword - Nuova password
   * @returns {Object} Risultato dell'operazione
   */
  async resetPassword(token, newPassword) {
    try {
      console.log(`🔄 [PasswordReset] Reset password richiesto per token: ${token.substring(0, 8)}...`);

      // Verifica il token
      const tokenVerification = await this.verifyResetToken(token);
      
      if (!tokenVerification.success) {
        return tokenVerification;
      }

      // Trova l'utente
      const user = await User.findById(tokenVerification.userId);
      
      if (!user) {
        return {
          success: false,
          message: 'Utente non trovato',
          code: 'USER_NOT_FOUND'
        };
      }

      // Verifica che il token sia ancora valido
      if (!user.isPasswordResetTokenValid(token)) {
        return {
          success: false,
          message: 'Token di reset non valido o scaduto',
          code: 'INVALID_TOKEN'
        };
      }

      // Aggiorna la password
      user.password = newPassword;
      
      // Pulisci i token di reset
      user.clearPasswordResetToken();
      
      // Salva l'utente
      await user.save();

      console.log(`✅ [PasswordReset] Password resettata con successo per utente: ${user._id}`);

      return {
        success: true,
        message: 'Password resettata con successo. Ora puoi accedere con la nuova password.',
        userId: user._id,
        email: user.email
      };

    } catch (error) {
      console.error(`❌ [PasswordReset] Errore nel reset password:`, error);
      return {
        success: false,
        message: 'Errore nel reset della password',
        error: error.message,
        code: 'RESET_ERROR'
      };
    }
  }

  /**
   * 🧹 Pulisce token di reset scaduti
   * @returns {Object} Risultato della pulizia
   */
  async cleanupExpiredTokens() {
    try {
      console.log(`🧹 [PasswordReset] Pulizia token scaduti...`);

      const result = await User.updateMany(
        {
          resetPasswordExpires: { $lt: new Date() }
        },
        {
          $unset: {
            resetPasswordToken: 1,
            resetPasswordExpires: 1
          }
        }
      );

      console.log(`✅ [PasswordReset] Puliti ${result.modifiedCount} token scaduti`);
      
      return {
        success: true,
        message: `Puliti ${result.modifiedCount} token scaduti`,
        cleanedCount: result.modifiedCount
      };

    } catch (error) {
      console.error(`❌ [PasswordReset] Errore nella pulizia token:`, error);
      return {
        success: false,
        message: 'Errore nella pulizia token scaduti',
        error: error.message
      };
    }
  }

  /**
   * 📊 Ottiene statistiche sui reset password
   * @returns {Object} Statistiche
   */
  async getResetStats() {
    try {
      const totalUsers = await User.countDocuments();
      const usersWithResetTokens = await User.countDocuments({
        resetPasswordToken: { $exists: true },
        resetPasswordExpires: { $gt: new Date() }
      });
      const expiredResetTokens = await User.countDocuments({
        resetPasswordExpires: { $lt: new Date() }
      });

      return {
        success: true,
        stats: {
          totalUsers,
          activeResetTokens: usersWithResetTokens,
          expiredResetTokens,
          resetTokenRate: totalUsers > 0 ? (usersWithResetTokens / totalUsers * 100).toFixed(2) : 0
        }
      };

    } catch (error) {
      console.error(`❌ [PasswordReset] Errore nel recupero statistiche:`, error);
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
    
    if (this.TOKEN_EXPIRY_HOURS < 0.5) {
      issues.push('TOKEN_EXPIRY_HOURS deve essere almeno 0.5 ore');
    }
    
    if (this.MAX_RESET_ATTEMPTS < 1) {
      issues.push('MAX_RESET_ATTEMPTS deve essere almeno 1');
    }
    
    if (this.RESET_COOLDOWN_MINUTES < 1) {
      issues.push('RESET_COOLDOWN_MINUTES deve essere almeno 1');
    }

    return {
      valid: issues.length === 0,
      issues: issues,
      config: {
        FRONTEND_URL: this.FRONTEND_URL,
        TOKEN_EXPIRY_HOURS: this.TOKEN_EXPIRY_HOURS,
        MAX_RESET_ATTEMPTS: this.MAX_RESET_ATTEMPTS,
        RESET_COOLDOWN_MINUTES: this.RESET_COOLDOWN_MINUTES
      }
    };
  }
}

// Esporta un'istanza singleton
const passwordResetService = new PasswordResetService();

// Log della configurazione all'avvio
const configValidation = passwordResetService.validateConfiguration();
if (!configValidation.valid) {
  console.warn(`⚠️ [PasswordReset] Problemi di configurazione:`, configValidation.issues);
} else {
  console.log(`✅ [PasswordReset] Servizio configurato correttamente:`, configValidation.config);
}

module.exports = passwordResetService;
