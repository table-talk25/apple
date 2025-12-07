const nodemailer = require('nodemailer');
const ErrorResponse = require('./errorResponse');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

/**
 * Classe per la gestione delle email
 */
class EmailService {
  /**
   * @param {Object} config - Configurazione del servizio email
   */
  constructor(config = {}) {
    this.config = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
      },
      ...config
    };

    this.transporter = null;
    this.templates = new Map();
  }

  /**
   * Inizializza il trasportatore SMTP
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.transporter = nodemailer.createTransport(this.config);
      await this.transporter.verify();
      console.log('Server SMTP connesso con successo');
    } catch (error) {
      throw new ErrorResponse(
        'Errore nella connessione al server SMTP',
        500,
        'SMTP_CONNECTION_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Carica un template HTML
   * @param {string} templateName - Nome del template
   * @returns {Promise<void>}
   */
  async loadTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '../templates/email', `${templateName}.hbs`);
      const template = await fs.readFile(templatePath, 'utf-8');
      this.templates.set(templateName, handlebars.compile(template));
    } catch (error) {
      throw new ErrorResponse(
        `Template ${templateName} non trovato`,
        500,
        'TEMPLATE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Invia un'email
   * @param {Object} options - Opzioni email
   * @param {string} options.to - Destinatario
   * @param {string} options.subject - Oggetto
   * @param {string} [options.template] - Nome del template
   * @param {Object} [options.context] - Contesto per il template
   * @param {string} [options.text] - Testo alternativo
   * @param {string} [options.html] - HTML alternativo
   * @param {Array} [options.attachments] - Allegati
   * @returns {Promise<Object>} Risultato dell'invio
   */
  async sendEmail(options) {
    if (!this.transporter) {
      await this.initialize();
    }

    try {
      // Prepara il contenuto HTML
      let html = options.html;
      if (options.template) {
        if (!this.templates.has(options.template)) {
          await this.loadTemplate(options.template);
        }
        html = this.templates.get(options.template)(options.context || {});
      }

      // Prepara le opzioni dell'email
   const mailOptions = {
        from: {
          name: 'TableTalk',
          address: process.env.EMAIL_FROM
        },
        to: options.to,
    subject: options.subject,
        text: options.text || 'Per visualizzare questo messaggio, usa un client email che supporta HTML.',
        html: html,
        attachments: options.attachments || []
  };

  // Invia l'email
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email inviata:', info.messageId);
      return info;
    } catch (error) {
      throw new ErrorResponse(
        'Errore nell\'invio dell\'email',
        500,
        'EMAIL_SEND_ERROR',
        {
          originalError: error.message,
          recipient: options.to,
          subject: options.subject
        }
      );
    }
  }

  /**
   * Invia email di verifica
   * @param {string} email - Email del destinatario
   * @param {string} token - Token di verifica
   * @returns {Promise<Object>}
   */
  async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    return this.sendEmail({
      to: email,
      subject: 'Verifica il tuo account TableTalk',
      template: 'verification',
      context: {
        verificationUrl,
        supportEmail: process.env.SUPPORT_EMAIL
      }
    });
  }

  /**
   * Invia email di reset password
   * @param {string} email - Email del destinatario
   * @param {string} token - Token di reset
   * @returns {Promise<Object>}
   */
  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    return this.sendEmail({
      to: email,
      subject: 'Reset della password TableTalk',
      template: 'password-reset',
      context: {
        resetUrl,
        supportEmail: process.env.SUPPORT_EMAIL
      }
    });
  }

  /**
   * Invia email di benvenuto
   * @param {string} email - Email del destinatario
   * @param {string} name - Nome dell'utente
   * @returns {Promise<Object>}
   */
  async sendWelcomeEmail(email, name) {
    return this.sendEmail({
      to: email,
      subject: 'Benvenuto su TableTalk!',
      template: 'welcome',
      context: {
        name,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
        supportEmail: process.env.SUPPORT_EMAIL
      }
    });
  }

  /**
   * Invia email di notifica pasto
   * @param {string} email - Email del destinatario
   * @param {Object} meal - Dati del pasto
   * @returns {Promise<Object>}
   */
  async sendMealNotificationEmail(email, meal) {
    return this.sendEmail({
      to: email,
      subject: `Nuovo TableTalk®: ${meal.title}`,
      template: 'meal-notification',
      context: {
        meal,
        mealUrl: `${process.env.FRONTEND_URL}/meals/${meal._id}`,
        supportEmail: process.env.SUPPORT_EMAIL
      }
    });
  }

  /**
   * Invia email di invito da mappa
   * @param {string} email - Email del destinatario
   * @param {string} recipientName - Nickname destinatario
   * @param {string} senderName - Nickname mittente
   * @param {string} message - Messaggio invito
   */
  async sendInvitationEmail(email, recipientName, senderName, message) {
    return this.sendEmail({
      to: email,
      subject: `${senderName} ti ha invitato su TableTalk!`,
      template: 'invitation',
      context: {
        recipientName,
        senderName,
        message
      }
    });
  }

  /**
   * Invia email di conferma registrazione a un pasto
   * @param {string} email
   * @param {string} name - Nickname destinatario
   * @param {Object} meal - Oggetto pasto (title, date, host)
   */
  async sendMealRegistrationEmail(email, name, meal) {
    return this.sendEmail({
      to: email,
      subject: `Registrazione confermata: ${meal.title}`,
      template: 'meal-registration',
      context: {
        name,
        mealTitle: meal.title,
        mealDate: meal.date,
        hostName: meal.hostName
      }
    });
  }

  /**
   * Invia email promemoria 10 minuti prima del pasto
   * @param {string} email
   * @param {string} name - Nickname destinatario
   * @param {Object} meal - Oggetto pasto (title, date, host)
   */
  async sendMealReminderEmail(email, name, meal) {
    const mealId = meal.mealId || meal._id || meal.id;
    const mealUrl = mealId ? `${process.env.FRONTEND_URL}/meals/${mealId}` : `${process.env.FRONTEND_URL}/meals`;
    return this.sendEmail({
      to: email,
      subject: `Il tuo TableTalk® sta per iniziare!`,
      template: 'meal-reminder',
      context: {
        name,
        mealTitle: meal.title,
        mealDate: meal.date,
        hostName: meal.hostName,
        mealUrl
      }
    });
  }

  /**
   * Invia email promemoria all'host 10 minuti prima del pasto
   * @param {string} email
   * @param {string} hostName
   * @param {Object} meal - { title, date, participantCount, participantNicknames }
   */
  async sendHostMealReminderEmail(email, hostName, meal) {
    const mealId = meal.mealId || meal._id || meal.id;
    const mealUrl = mealId ? `${process.env.FRONTEND_URL}/meals/${mealId}` : `${process.env.FRONTEND_URL}/meals`;
    return this.sendEmail({
      to: email,
      subject: `Il tuo TableTalk® sta per iniziare!`,
      template: 'meal-host-reminder',
      context: {
        hostName,
        mealTitle: meal.title,
        mealDate: meal.date,
        participantCount: meal.participantCount,
        participantNicknames: meal.participantNicknames,
        mealUrl
      }
    });
  }
}

// Crea un'istanza singleton del servizio
const emailService = new EmailService();

module.exports = emailService;