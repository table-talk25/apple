// File: BACKEND/jobs/dailyReportSummary.js

const cron = require('node-cron');
const reportNotificationService = require('../services/reportNotificationService');
const REPORT_NOTIFICATION_CONFIG = require('../config/reportNotificationConfig');

/**
 * Job per l'invio automatico del riepilogo giornaliero delle segnalazioni
 */
class DailyReportSummaryJob {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;
    }

    /**
     * Avvia il job per il riepilogo giornaliero
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ [DailyReportSummary] Job già in esecuzione');
            return;
        }

        // Verifica che le notifiche giornaliere siano abilitate
        if (!REPORT_NOTIFICATION_CONFIG.TIMING.DAILY_SUMMARY) {
            console.log('ℹ️ [DailyReportSummary] Notifiche giornaliere disabilitate nella configurazione');
            return;
        }

        // Orario per l'invio (formato cron: minuto ora * * *)
        const [hour, minute] = REPORT_NOTIFICATION_CONFIG.TIMING.DAILY_SUMMARY_TIME.split(':');
        const cronExpression = `${minute} ${hour} * * *`;

        try {
            this.cronJob = cron.schedule(cronExpression, async () => {
                await this.executeDailySummary();
            }, {
                scheduled: true,
                timezone: REPORT_NOTIFICATION_CONFIG.TIMING.TIMEZONE
            });

            this.isRunning = true;
            console.log(`✅ [DailyReportSummary] Job avviato con successo. Esecuzione: ${REPORT_NOTIFICATION_CONFIG.TIMING.DAILY_SUMMARY_TIME} (${REPORT_NOTIFICATION_CONFIG.TIMING.TIMEZONE})`);

        } catch (error) {
            console.error('❌ [DailyReportSummary] Errore nell\'avvio del job:', error);
            this.isRunning = false;
        }
    }

    /**
     * Ferma il job
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }
        this.isRunning = false;
        console.log('🛑 [DailyReportSummary] Job fermato');
    }

    /**
     * Esegue il riepilogo giornaliero
     */
    async executeDailySummary() {
        if (!this.isRunning) {
            console.log('⚠️ [DailyReportSummary] Job non in esecuzione');
            return;
        }

        console.log('🕐 [DailyReportSummary] Inizio esecuzione riepilogo giornaliero...');

        try {
            // Esegui il riepilogo per la data odierna
            const result = await reportNotificationService.sendDailyReportSummary();
            
            if (REPORT_NOTIFICATION_CONFIG.LOGGING.ENABLED) {
                console.log(`${REPORT_NOTIFICATION_CONFIG.LOGGING.LEVELS.SUCCESS} [DailyReportSummary] Riepilogo giornaliero inviato con successo`);
            }

            // Log delle statistiche
            if (result && result.context) {
                const { totalReports, pendingReports, resolvedReports, dismissedReports } = result.context;
                console.log(`📊 [DailyReportSummary] Statistiche: ${totalReports} totali, ${pendingReports} in attesa, ${resolvedReports} risolte, ${dismissedReports} archiviate`);
            }

        } catch (error) {
            console.error('❌ [DailyReportSummary] Errore nell\'esecuzione del riepilogo giornaliero:', error);
            
            // Log dettagliato dell'errore
            if (REPORT_NOTIFICATION_CONFIG.LOGGING.ENABLED) {
                console.error(`${REPORT_NOTIFICATION_CONFIG.LOGGING.LEVELS.ERROR} [DailyReportSummary] Dettagli errore:`, {
                    message: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    /**
     * Esegue manualmente il riepilogo giornaliero (per test o esecuzione immediata)
     * @param {Date} date - Data per il riepilogo (opzionale, default: oggi)
     */
    async executeManualSummary(date = new Date()) {
        console.log(`🔧 [DailyReportSummary] Esecuzione manuale riepilogo per: ${date.toDateString()}`);

        try {
            const result = await reportNotificationService.sendDailyReportSummary(date);
            
            if (REPORT_NOTIFICATION_CONFIG.LOGGING.ENABLED) {
                console.log(`${REPORT_NOTIFICATION_CONFIG.LOGGING.LEVELS.SUCCESS} [DailyReportSummary] Riepilogo manuale inviato con successo`);
            }

            return result;

        } catch (error) {
            console.error('❌ [DailyReportSummary] Errore nell\'esecuzione manuale del riepilogo:', error);
            throw error;
        }
    }

    /**
     * Verifica lo stato del job
     * @returns {Object} Stato del job
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            nextExecution: this.cronJob ? this.cronJob.nextDate().toISOString() : null,
            cronExpression: this.cronJob ? this.cronJob.cronTime.source : null,
            timezone: REPORT_NOTIFICATION_CONFIG.TIMING.TIMEZONE,
            scheduledTime: REPORT_NOTIFICATION_CONFIG.TIMING.DAILY_SUMMARY_TIME
        };
    }

    /**
     * Aggiorna la configurazione del job
     * @param {Object} newConfig - Nuova configurazione
     */
    updateConfig(newConfig) {
        if (newConfig.time) {
            REPORT_NOTIFICATION_CONFIG.TIMING.DAILY_SUMMARY_TIME = newConfig.time;
        }
        
        if (newConfig.timezone) {
            REPORT_NOTIFICATION_CONFIG.TIMING.TIMEZONE = newConfig.timezone;
        }

        if (newConfig.enabled !== undefined) {
            REPORT_NOTIFICATION_CONFIG.TIMING.DAILY_SUMMARY = newConfig.enabled;
        }

        // Riavvia il job con la nuova configurazione
        if (this.isRunning) {
            this.stop();
            this.start();
        }

        console.log('⚙️ [DailyReportSummary] Configurazione aggiornata e job riavviato');
    }
}

// Crea un'istanza singleton del job
const dailyReportSummaryJob = new DailyReportSummaryJob();

module.exports = dailyReportSummaryJob;
