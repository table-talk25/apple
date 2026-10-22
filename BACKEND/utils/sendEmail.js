const nodemailer = require('nodemailer');
const ErrorResponse = require('./errorResponse');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const { buildMealReminder } = require('./mealReminderContent');

class EmailService {
  constructor(config = {}) {
    this.config = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      ...config
    };
    this.transporter = null;
    this.templates = new Map();
  }
  async initialize() {
    try {
      this.transporter = nodemailer.createTransport(this.config);
      await this.transporter.verify();
      console.log('Server SMTP connesso con successo');
    } catch { throw new ErrorResponse('Errore nella connessione al server SMTP', 500); }
  }
  async loadTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '../templates/email', `${templateName}.hbs`);
      const template = await fs.readFile(templatePath, 'utf-8');
      this.templates.set(templateName, handlebars.compile(template));
    } catch { console.warn(`Template ${templateName} non trovato.`); }
  }
  async sendEmail(options) {
    if (!this.transporter) await this.initialize();
    try {
      let html = options.html;
      if (options.template) {
        if (!this.templates.has(options.template)) await this.loadTemplate(options.template);
        if (this.templates.has(options.template)) html = this.templates.get(options.template)(options.context || {});
      }
      const info = await this.transporter.sendMail({
        from: { name: 'TableTalk', address: process.env.EMAIL_FROM },
        to: options.to, subject: options.subject,
        text: options.text || 'Email visualizzabile in formato HTML.',
        html, attachments: options.attachments || []
      });
      console.log('Email accettata dal servizio SMTP');
      return info;
    } catch {
      console.error('Errore invio email (dettagli SMTP omessi)');
      throw new ErrorResponse('Errore invio email', 500);
    }
  }
  async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    return this.sendEmail({ to: email, subject: 'Verifica il tuo account TableTalk', template: 'verification', context: { verificationUrl, supportEmail: process.env.SUPPORT_EMAIL } });
  }
  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    return this.sendEmail({ to: email, subject: 'Reset della password TableTalk', template: 'password-reset', context: { resetUrl, supportEmail: process.env.SUPPORT_EMAIL } });
  }
  async sendWelcomeEmail(email, name) {
    return this.sendEmail({ to: email, subject: 'Benvenuto su TableTalk!', template: 'welcome', context: { name, loginUrl: `${process.env.FRONTEND_URL}/login` } });
  }
  async sendMealNotificationEmail(email, meal) {
    return this.sendEmail({ to: email, subject: `Nuovo TableTalk®: ${meal.title}`, template: 'meal-notification', context: { meal, mealUrl: `${process.env.FRONTEND_URL}/meals/${meal._id}` } });
  }
  async sendInvitationEmail(email, recipientName, senderName, message) {
    return this.sendEmail({ to: email, subject: `${senderName} ti ha invitato su TableTalk!`, template: 'invitation', context: { recipientName, senderName, message } });
  }
  async sendMealRegistrationEmail(email, name, meal) {
    return this.sendEmail({ to: email, subject: `Registrazione confermata: ${meal.title}`, template: 'meal-registration', context: { name, mealTitle: meal.title, mealDate: meal.date, hostName: meal.hostName } });
  }
  async sendMealCancellationEmail(email, name, meal) {
    return this.sendEmail({
      to: email, subject: `❌ TableTalk Cancellato: ${meal.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Ciao ${name},</h2>
          <p>Ci dispiace informarti che il TableTalk <strong>"${meal.title}"</strong> previsto per il <strong>${new Date(meal.date).toLocaleString('it-IT')}</strong> è stato cancellato dall'host.</p>
          <p>Non preoccuparti, puoi cercare subito un altro tavolo!</p>
          <a href="${process.env.FRONTEND_URL}/meals" style="background: #FF6B35; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Cerca altri TableTalk</a>
        </div>
      `
    });
  }
  async sendMealReminderEmail(email, name, meal) {
    return this.sendEmail({ to: email, ...buildMealReminder(name, meal, false) });
  }
  async sendHostMealReminderEmail(email, name, meal) {
    return this.sendEmail({ to: email, ...buildMealReminder(name, meal, true) });
  }
}

module.exports = new EmailService();
