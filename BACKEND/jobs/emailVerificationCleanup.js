// File: BACKEND/jobs/emailVerificationCleanup.js
// 🧹 JOB PER PULIZIA AUTOMATICA TOKEN VERIFICA EMAIL
// 
// Questo job esegue periodicamente la pulizia dei token di verifica email scaduti
// per mantenere il database pulito e ottimizzare le performance

const cron = require('node-cron');
const emailVerificationService = require('../services/emailVerificationService');

class EmailVerificationCleanupJob {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.lastCleanupCount = 0;
    this.totalCleanups = 0;
    this.errors = [];
    
    // Configurazione job
    this.schedule = process.env.EMAIL_VERIFICATION_CLEANUP_SCHEDULE || '0 2 * * *'; // Ogni giorno alle 2:00
    this.enabled = process.env.EMAIL_VERIFICATION_CLEANUP_ENABLED !== 'false'; // Abilitato di default
  }

  /**
   * 🚀 Avvia il job di pulizia
   */
  start() {
    if (!this.enabled) {
      console.log('🔄 [EmailVerificationCleanup] Job disabilitato tramite variabile d\'ambiente');
      return;
    }

    console.log(`🚀 [EmailVerificationCleanup] Avvio job con schedule: ${this.schedule}`);
    
    // Esegui immediatamente una pulizia all'avvio
    this.runCleanup();
    
    // Programma l'esecuzione periodica
    this.cronJob = cron.schedule(this.schedule, () => {
      this.runCleanup();
    }, {
      scheduled: true,
      timezone: 'Europe/Rome'
    });

    console.log('✅ [EmailVerificationCleanup] Job avviato con successo');
  }

  /**
   * 🛑 Ferma il job di pulizia
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('🛑 [EmailVerificationCleanup] Job fermato');
    }
  }

  /**
   * 🧹 Esegue la pulizia dei token scaduti
   */
  async runCleanup() {
    if (this.isRunning) {
      console.log('⚠️ [EmailVerificationCleanup] Job già in esecuzione, skip...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('🧹 [EmailVerificationCleanup] Inizio pulizia token scaduti...');
      
      const result = await emailVerificationService.cleanupExpiredTokens();
      
      if (result.success) {
        this.lastCleanupCount = result.cleanedCount;
        this.totalCleanups += result.cleanedCount;
        this.lastRun = new Date();
        
        const duration = Date.now() - startTime;
        
        console.log(`✅ [EmailVerificationCleanup] Pulizia completata in ${duration}ms`);
        console.log(`📊 [EmailVerificationCleanup] Token puliti: ${result.cleanedCount}`);
        console.log(`📈 [EmailVerificationCleanup] Totale token puliti: ${this.totalCleanups}`);
        
        // Log dettagliato se ci sono stati token puliti
        if (result.cleanedCount > 0) {
          console.log(`🎯 [EmailVerificationCleanup] Pulizia significativa: ${result.cleanedCount} token rimossi`);
        } else {
          console.log(`✨ [EmailVerificationCleanup] Database già pulito, nessun token da rimuovere`);
        }
        
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorInfo = {
        timestamp: new Date().toISOString(),
        error: error.message,
        duration: duration,
        stack: error.stack
      };
      
      this.errors.push(errorInfo);
      
      console.error(`❌ [EmailVerificationCleanup] Errore durante la pulizia:`, error);
      console.error(`⏱️ [EmailVerificationCleanup] Durata: ${duration}ms`);
      
      // Mantieni solo gli ultimi 10 errori
      if (this.errors.length > 10) {
        this.errors = this.errors.slice(-10);
      }
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 📊 Ottiene statistiche del job
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      enabled: this.enabled,
      schedule: this.schedule,
      lastRun: this.lastRun,
      lastCleanupCount: this.lastCleanupCount,
      totalCleanups: this.totalCleanups,
      errors: this.errors,
      uptime: this.lastRun ? Date.now() - this.lastRun.getTime() : null
    };
  }

  /**
   * 🔧 Esegue una pulizia manuale
   */
  async manualCleanup() {
    console.log('🔧 [EmailVerificationCleanup] Esecuzione pulizia manuale...');
    return await this.runCleanup();
  }

  /**
   * 🔍 Controlla lo stato del job
   */
  getStatus() {
    const stats = this.getStats();
    
    if (!this.enabled) {
      return 'DISABLED';
    }
    
    if (this.isRunning) {
      return 'RUNNING';
    }
    
    if (!this.lastRun) {
      return 'NOT_STARTED';
    }
    
    // Controlla se il job è "sano" (eseguito negli ultimi 2 giorni)
    const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
    if (this.lastRun.getTime() < twoDaysAgo) {
      return 'STALE';
    }
    
    return 'HEALTHY';
  }

  /**
   * ⚙️ Aggiorna la configurazione del job
   */
  updateConfig(newConfig) {
    if (newConfig.schedule) {
      this.schedule = newConfig.schedule;
      console.log(`⚙️ [EmailVerificationCleanup] Schedule aggiornato: ${this.schedule}`);
    }
    
    if (newConfig.enabled !== undefined) {
      this.enabled = newConfig.enabled;
      console.log(`⚙️ [EmailVerificationCleanup] Job ${this.enabled ? 'abilitato' : 'disabilitato'}`);
    }
    
    // Riavvia il job se necessario
    if (this.cronJob) {
      this.stop();
      this.start();
    }
  }
}

// Crea un'istanza singleton
const emailVerificationCleanupJob = new EmailVerificationCleanupJob();

// Gestisci la chiusura graceful
process.on('SIGTERM', () => {
  console.log('🔄 [EmailVerificationCleanup] Ricevuto SIGTERM, fermando job...');
  emailVerificationCleanupJob.stop();
});

process.on('SIGINT', () => {
  console.log('🔄 [EmailVerificationCleanup] Ricevuto SIGINT, fermando job...');
  emailVerificationCleanupJob.stop();
});

module.exports = emailVerificationCleanupJob;
