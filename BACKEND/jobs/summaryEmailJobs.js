// File: BACKEND/jobs/summaryEmailJobs.js
// 📧 JOB PER EMAIL DI RIEPILOGO AUTOMATICHE
// 
// Questo job gestisce l'invio automatico di email di riepilogo:
// - Riepilogo settimanale ogni lunedì alle 9:00
// - Riepilogo mensile il primo del mese alle 10:00
// - Gestione intelligente degli utenti attivi

const cron = require('node-cron');
const summaryEmailService = require('../services/summaryEmailService');
const User = require('../models/User');

class SummaryEmailJobs {
  constructor() {
    this.isRunning = false;
    this.lastWeeklyRun = null;
    this.lastMonthlyRun = null;
    this.weeklyStats = {
      totalUsers: 0,
      emailsSent: 0,
      emailsFailed: 0,
      errors: []
    };
    this.monthlyStats = {
      totalUsers: 0,
      emailsSent: 0,
      emailsFailed: 0,
      errors: []
    };
    
    // Configurazione job
    this.weeklySchedule = process.env.WEEKLY_SUMMARY_SCHEDULE || '0 9 * * 1'; // Ogni lunedì alle 9:00
    this.monthlySchedule = process.env.MONTHLY_SUMMARY_SCHEDULE || '0 10 1 * *'; // Primo del mese alle 10:00
    this.enableWeekly = process.env.ENABLE_WEEKLY_SUMMARY !== 'false';
    this.enableMonthly = process.env.ENABLE_MONTHLY_SUMMARY !== 'false';
    this.maxEmailsPerBatch = parseInt(process.env.SUMMARY_EMAILS_BATCH_SIZE) || 50;
    this.batchDelay = parseInt(process.env.SUMMARY_EMAILS_BATCH_DELAY) || 1000; // 1 secondo
  }

  /**
   * 🚀 Avvia tutti i job di riepilogo email
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ [SummaryEmailJobs] Job già in esecuzione');
      return;
    }

    this.isRunning = true;

    // Avvia job settimanale
    if (this.enableWeekly) {
      this.startWeeklyJob();
      console.log('✅ [SummaryEmailJobs] Job riepilogo settimanale avviato');
    }

    // Avvia job mensile
    if (this.enableMonthly) {
      this.startMonthlyJob();
      console.log('✅ [SummaryEmailJobs] Job riepilogo mensile avviato');
    }

    console.log('✅ [SummaryEmailJobs] Tutti i job avviati con successo');
  }

  /**
   * 🛑 Ferma tutti i job di riepilogo email
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ [SummaryEmailJobs] Nessun job in esecuzione');
      return;
    }

    this.isRunning = false;
    
    if (this.weeklyJob) {
      this.weeklyJob.stop();
      console.log('🛑 [SummaryEmailJobs] Job settimanale fermato');
    }
    
    if (this.monthlyJob) {
      this.monthlyJob.stop();
      console.log('🛑 [SummaryEmailJobs] Job mensile fermato');
    }

    console.log('🛑 [SummaryEmailJobs] Tutti i job fermati');
  }

  /**
   * 📅 Avvia il job per il riepilogo settimanale
   */
  startWeeklyJob() {
    this.weeklyJob = cron.schedule(this.weeklySchedule, async () => {
      console.log('📧 [SummaryEmailJobs] Avvio job riepilogo settimanale...');
      await this.runWeeklySummary();
    }, {
      scheduled: true,
      timezone: 'Europe/Rome'
    });
  }

  /**
   * 📅 Avvia il job per il riepilogo mensile
   */
  startMonthlyJob() {
    this.monthlyJob = cron.schedule(this.monthlySchedule, async () => {
      console.log('📧 [SummaryEmailJobs] Avvio job riepilogo mensile...');
      await this.runMonthlySummary();
    }, {
      scheduled: true,
      timezone: 'Europe/Rome'
    });
  }

  /**
   * 🔄 Esegue il riepilogo settimanale per tutti gli utenti
   */
  async runWeeklySummary() {
    try {
      console.log('📊 [SummaryEmailJobs] Inizio riepilogo settimanale...');
      
      const startTime = Date.now();
      this.lastWeeklyRun = new Date();
      
      // Calcola inizio e fine settimana
      const weekStart = this.getWeekStart();
      const weekEnd = this.getWeekEnd();
      
      console.log(`📅 [SummaryEmailJobs] Periodo: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`);
      
      // Ottieni utenti attivi
      const activeUsers = await this.getActiveUsers();
      console.log(`👥 [SummaryEmailJobs] ${activeUsers.length} utenti attivi trovati`);
      
      // Reset statistiche
      this.weeklyStats = {
        totalUsers: activeUsers.length,
        emailsSent: 0,
        emailsFailed: 0,
        errors: []
      };
      
      // Invia email in batch
      await this.sendBatchEmails(activeUsers, 'weekly', weekStart, weekEnd);
      
      const duration = Date.now() - startTime;
      console.log(`✅ [SummaryEmailJobs] Riepilogo settimanale completato in ${duration}ms`);
      console.log(`📊 [SummaryEmailJobs] Statistiche: ${this.weeklyStats.emailsSent} inviate, ${this.weeklyStats.emailsFailed} fallite`);
      
    } catch (error) {
      console.error('❌ [SummaryEmailJobs] Errore nel riepilogo settimanale:', error);
      this.weeklyStats.errors.push(error.message);
    }
  }

  /**
   * 🔄 Esegue il riepilogo mensile per tutti gli utenti
   */
  async runMonthlySummary() {
    try {
      console.log('📊 [SummaryEmailJobs] Inizio riepilogo mensile...');
      
      const startTime = Date.now();
      this.lastMonthlyRun = new Date();
      
      // Calcola inizio e fine mese
      const monthStart = this.getMonthStart();
      const monthEnd = this.getMonthEnd();
      
      console.log(`📅 [SummaryEmailJobs] Periodo: ${monthStart.toLocaleDateString()} - ${monthEnd.toLocaleDateString()}`);
      
      // Ottieni utenti attivi
      const activeUsers = await this.getActiveUsers();
      console.log(`👥 [SummaryEmailJobs] ${activeUsers.length} utenti attivi trovati`);
      
      // Reset statistiche
      this.monthlyStats = {
        totalUsers: activeUsers.length,
        emailsSent: 0,
        emailsFailed: 0,
        errors: []
      };
      
      // Invia email in batch
      await this.sendBatchEmails(activeUsers, 'monthly', monthStart, monthEnd);
      
      const duration = Date.now() - startTime;
      console.log(`✅ [SummaryEmailJobs] Riepilogo mensile completato in ${duration}ms`);
      console.log(`📊 [SummaryEmailJobs] Statistiche: ${this.monthlyStats.emailsSent} inviate, ${this.monthlyStats.emailsFailed} fallite`);
      
    } catch (error) {
      console.error('❌ [SummaryEmailJobs] Errore nel riepilogo mensile:', error);
      this.monthlyStats.errors.push(error.message);
    }
  }

  /**
   * 📧 Invia email in batch per evitare sovraccarico
   * @param {Array} users - Lista utenti
   * @param {string} type - Tipo riepilogo (weekly/monthly)
   * @param {Date} periodStart - Inizio periodo
   * @param {Date} periodEnd - Fine periodo
   */
  async sendBatchEmails(users, type, periodStart, periodEnd) {
    const batches = this.chunkArray(users, this.maxEmailsPerBatch);
    console.log(`📦 [SummaryEmailJobs] Invio in ${batches.length} batch di ${this.maxEmailsPerBatch} utenti`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📤 [SummaryEmailJobs] Invio batch ${i + 1}/${batches.length} (${batch.length} utenti)`);
      
      // Processa batch corrente
      const batchPromises = batch.map(user => this.sendSummaryEmail(user, type, periodStart, periodEnd));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Aggiorna statistiche
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          if (type === 'weekly') {
            this.weeklyStats.emailsSent++;
          } else {
            this.monthlyStats.emailsSent++;
          }
        } else {
          if (type === 'weekly') {
            this.weeklyStats.emailsFailed++;
            this.weeklyStats.errors.push(result.reason?.message || 'Errore sconosciuto');
          } else {
            this.monthlyStats.emailsFailed++;
            this.monthlyStats.errors.push(result.reason?.message || 'Errore sconosciuto');
          }
        }
      });
      
      // Pausa tra batch per evitare sovraccarico
      if (i < batches.length - 1) {
        console.log(`⏳ [SummaryEmailJobs] Pausa di ${this.batchDelay}ms tra batch...`);
        await this.delay(this.batchDelay);
      }
    }
  }

  /**
   * 📧 Invia email di riepilogo per un singolo utente
   * @param {Object} user - Utente
   * @param {string} type - Tipo riepilogo
   * @param {Date} periodStart - Inizio periodo
   * @param {Date} periodEnd - Fine periodo
   * @returns {Object} Risultato invio
   */
  async sendSummaryEmail(user, type, periodStart, periodEnd) {
    try {
      if (type === 'weekly') {
        return await summaryEmailService.sendWeeklySummary(user._id, periodStart, periodEnd);
      } else if (type === 'monthly') {
        return await summaryEmailService.sendMonthlySummary(user._id, periodStart, periodEnd);
      }
    } catch (error) {
      console.error(`❌ [SummaryEmailJobs] Errore invio email per utente ${user._id}:`, error);
      throw error;
    }
  }

  /**
   * 👥 Ottiene utenti attivi per i riepiloghi
   * @returns {Array} Lista utenti attivi
   */
  async getActiveUsers() {
    try {
      // Criteri per utenti attivi
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const users = await User.find({
        // Utente verificato
        isEmailVerified: true,
        
        // Attivo negli ultimi 30 giorni
        $or: [
          { lastLogin: { $gte: thirtyDaysAgo } },
          { lastActivity: { $gte: thirtyDaysAgo } },
          { 'settings.notifications.email.summaryEmails': { $ne: false } }
        ],
        
        // Non ha disabilitato esplicitamente i riepiloghi
        'settings.notifications.email.summaryEmails': { $ne: false }
      })
      .select('_id name surname email settings lastLogin lastActivity')
      .lean();
      
      console.log(`👥 [SummaryEmailJobs] ${users.length} utenti attivi trovati`);
      return users;
      
    } catch (error) {
      console.error('❌ [SummaryEmailJobs] Errore nel recupero utenti attivi:', error);
      return [];
    }
  }

  /**
   * 📅 Calcola l'inizio della settimana corrente
   * @returns {Date} Data inizio settimana
   */
  getWeekStart() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lunedì = 1, Domenica = 0
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);
    
    return weekStart;
  }

  /**
   * 📅 Calcola la fine della settimana corrente
   * @returns {Date} Data fine settimana
   */
  getWeekEnd() {
    const weekStart = this.getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return weekEnd;
  }

  /**
   * 📅 Calcola l'inizio del mese corrente
   * @returns {Date} Data inizio mese
   */
  getMonthStart() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    
    return monthStart;
  }

  /**
   * 📅 Calcola la fine del mese corrente
   * @returns {Date} Data fine mese
   */
  getMonthEnd() {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    return monthEnd;
  }

  /**
   * 🔧 Esegue manualmente un riepilogo settimanale
   * @returns {Object} Risultato dell'operazione
   */
  async manualWeeklySummary() {
    console.log('🔧 [SummaryEmailJobs] Esecuzione manuale riepilogo settimanale...');
    await this.runWeeklySummary();
    return {
      success: true,
      message: 'Riepilogo settimanale eseguito manualmente',
      stats: this.weeklyStats
    };
  }

  /**
   * 🔧 Esegue manualmente un riepilogo mensile
   * @returns {Object} Risultato dell'operazione
   */
  async manualMonthlySummary() {
    console.log('🔧 [SummaryEmailJobs] Esecuzione manuale riepilogo mensile...');
    await this.runMonthlySummary();
    return {
      success: true,
      message: 'Riepilogo mensile eseguito manualmente',
      stats: this.monthlyStats
    };
  }

  /**
   * 📊 Ottiene statistiche dei job
   * @returns {Object} Statistiche
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      lastWeeklyRun: this.lastWeeklyRun,
      lastMonthlyRun: this.lastMonthlyRun,
      weeklyStats: this.weeklyStats,
      monthlyStats: this.monthlyStats,
      config: {
        weeklySchedule: this.weeklySchedule,
        monthlySchedule: this.monthlySchedule,
        enableWeekly: this.enableWeekly,
        enableMonthly: this.enableMonthly,
        maxEmailsPerBatch: this.maxEmailsPerBatch,
        batchDelay: this.batchDelay
      }
    };
  }

  /**
   * 🔍 Ottiene lo stato dei job
   * @returns {Object} Stato
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      weeklyJob: this.weeklyJob ? 'Running' : 'Stopped',
      monthlyJob: this.monthlyJob ? 'Running' : 'Stopped',
      nextWeeklyRun: this.getNextWeeklyRun(),
      nextMonthlyRun: this.getNextMonthlyRun()
    };
  }

  /**
   * ⚙️ Aggiorna la configurazione dei job
   * @param {Object} newConfig - Nuova configurazione
   */
  updateConfig(newConfig) {
    if (newConfig.weeklySchedule) {
      this.weeklySchedule = newConfig.weeklySchedule;
    }
    if (newConfig.monthlySchedule) {
      this.monthlySchedule = newConfig.monthlySchedule;
    }
    if (newConfig.maxEmailsPerBatch) {
      this.maxEmailsPerBatch = newConfig.maxEmailsPerBatch;
    }
    if (newConfig.batchDelay) {
      this.batchDelay = newConfig.batchDelay;
    }
    
    console.log('⚙️ [SummaryEmailJobs] Configurazione aggiornata:', newConfig);
  }

  // Funzioni helper
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getNextWeeklyRun() {
    if (!this.weeklyJob) return null;
    
    const now = new Date();
    const nextMonday = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7;
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);
    
    return nextMonday;
  }

  getNextMonthlyRun() {
    if (!this.monthlyJob) return null;
    
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextMonth.setHours(10, 0, 0, 0);
    
    return nextMonth;
  }
}

// Esporta un'istanza singleton
const summaryEmailJobs = new SummaryEmailJobs();

// Log della configurazione all'avvio
console.log(`✅ [SummaryEmailJobs] Job configurato:`);
console.log(`  - Settimanale: ${summaryEmailJobs.enableWeekly ? 'Abilitato' : 'Disabilitato'} (${summaryEmailJobs.weeklySchedule})`);
console.log(`  - Mensile: ${summaryEmailJobs.enableMonthly ? 'Abilitato' : 'Disabilitato'} (${summaryEmailJobs.monthlySchedule})`);
console.log(`  - Batch size: ${summaryEmailJobs.maxEmailsPerBatch}`);
console.log(`  - Batch delay: ${summaryEmailJobs.batchDelay}ms`);

module.exports = summaryEmailJobs;
