const cron = require('node-cron');
const geolocationNotificationService = require('../services/geolocationNotificationService');

/**
 * Job per le notifiche geolocalizzate
 * Processa periodicamente i pasti recenti e invia notifiche agli utenti nelle vicinanze
 */
class GeolocationNotificationJob {
    constructor() {
        this.isRunning = false;
        this.lastRun = null;
        this.nextRun = null;
        this.schedule = null;
        this.stats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            totalNotificationsSent: 0,
            lastRunDuration: 0
        };
    }

    /**
     * Avvia il job schedulato
     * @param {string} cronExpression - Espressione cron per la schedulazione (default: ogni 30 minuti)
     */
    start(cronExpression = '*/30 * * * *') {
        if (this.isRunning) {
            console.log('⚠️ [GeolocationNotificationJob] Job già in esecuzione');
            return;
        }

        try {
            // Valida l'espressione cron
            if (!cron.validate(cronExpression)) {
                throw new Error(`Espressione cron non valida: ${cronExpression}`);
            }

            this.schedule = cron.schedule(cronExpression, async () => {
                await this.executeJob();
            }, {
                scheduled: true,
                timezone: 'Europe/Rome'
            });

            this.isRunning = true;
            this.nextRun = this.getNextRunTime(cronExpression);

            console.log(`✅ [GeolocationNotificationJob] Job avviato con successo`);
            console.log(`📅 [GeolocationNotificationJob] Prossima esecuzione: ${this.nextRun}`);
            console.log(`⏰ [GeolocationNotificationJob] Frequenza: ${this.getFrequencyDescription(cronExpression)}`);

        } catch (error) {
            console.error('❌ [GeolocationNotificationJob] Errore nell\'avvio del job:', error);
            this.isRunning = false;
        }
    }

    /**
     * Ferma il job schedulato
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ [GeolocationNotificationJob] Job non in esecuzione');
            return;
        }

        try {
            if (this.schedule) {
                this.schedule.stop();
                this.schedule = null;
            }

            this.isRunning = false;
            this.nextRun = null;

            console.log('✅ [GeolocationNotificationJob] Job fermato con successo');

        } catch (error) {
            console.error('❌ [GeolocationNotificationJob] Errore nell\'arresto del job:', error);
        }
    }

    /**
     * Esegue il job di notifiche geolocalizzate
     */
    async executeJob() {
        if (this.isRunning) {
            console.log('⚠️ [GeolocationNotificationJob] Job già in esecuzione, salto questa iterazione');
            return;
        }

        const startTime = Date.now();
        this.isRunning = true;
        this.lastRun = new Date();

        console.log(`🚀 [GeolocationNotificationJob] Inizio esecuzione job - ${this.lastRun.toISOString()}`);

        try {
            // Processa pasti delle ultime 2 ore (per coprire il gap tra le esecuzioni)
            const result = await geolocationNotificationService.processRecentMeals(2);

            if (result.success) {
                this.stats.successfulRuns++;
                this.stats.totalNotificationsSent += result.totalNotifications || 0;
                
                console.log(`✅ [GeolocationNotificationJob] Job completato con successo`);
                console.log(`📊 [GeolocationNotificationJob] Statistiche: ${JSON.stringify(result)}`);
            } else {
                this.stats.failedRuns++;
                console.log(`❌ [GeolocationNotificationJob] Job fallito: ${result.message}`);
            }

        } catch (error) {
            this.stats.failedRuns++;
            console.error('❌ [GeolocationNotificationJob] Errore durante l\'esecuzione del job:', error);
        } finally {
            this.stats.totalRuns++;
            this.stats.lastRunDuration = Date.now() - startTime;
            this.isRunning = false;

            // Aggiorna la prossima esecuzione
            if (this.schedule) {
                this.nextRun = this.getNextRunTime(this.schedule.cronTime.source);
            }

            console.log(`⏱️ [GeolocationNotificationJob] Durata esecuzione: ${this.stats.lastRunDuration}ms`);
            console.log(`📅 [GeolocationNotificationJob] Prossima esecuzione: ${this.nextRun}`);
        }
    }

    /**
     * Esegue manualmente il job
     * @param {number} hoursBack - Ore indietro da controllare (default: 24)
     */
    async executeManual(hoursBack = 24) {
        if (this.isRunning) {
            console.log('⚠️ [GeolocationNotificationJob] Job già in esecuzione, attendere il completamento');
            return { success: false, message: 'Job già in esecuzione' };
        }

        console.log(`🔧 [GeolocationNotificationJob] Esecuzione manuale per ultime ${hoursBack} ore`);

        try {
            const result = await geolocationNotificationService.processRecentMeals(hoursBack);
            
            if (result.success) {
                console.log(`✅ [GeolocationNotificationJob] Esecuzione manuale completata: ${JSON.stringify(result)}`);
            } else {
                console.log(`❌ [GeolocationNotificationJob] Esecuzione manuale fallita: ${result.message}`);
            }

            return result;

        } catch (error) {
            console.error('❌ [GeolocationNotificationJob] Errore durante l\'esecuzione manuale:', error);
            return { success: false, message: 'Errore durante l\'esecuzione', error: error.message };
        }
    }

    /**
     * Ottiene lo stato del job
     * @returns {Object} Stato del job
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            nextRun: this.nextRun,
            stats: { ...this.stats },
            serviceStatus: 'active'
        };
    }

    /**
     * Aggiorna la configurazione del job
     * @param {string} newCronExpression - Nuova espressione cron
     */
    updateConfig(newCronExpression) {
        if (!cron.validate(newCronExpression)) {
            throw new Error(`Espressione cron non valida: ${newCronExpression}`);
        }

        console.log(`⚙️ [GeolocationNotificationJob] Aggiornamento configurazione da ${this.schedule?.cronTime.source} a ${newCronExpression}`);

        // Ferma il job corrente
        this.stop();

        // Riavvia con la nuova configurazione
        this.start(newCronExpression);
    }

    /**
     * Ottiene la prossima esecuzione programmata
     * @param {string} cronExpression - Espressione cron
     * @returns {Date} Prossima esecuzione
     */
    getNextRunTime(cronExpression) {
        try {
            const now = new Date();
            const nextRun = cron.getNextDate(cronExpression, now);
            return nextRun;
        } catch (error) {
            console.error('❌ [GeolocationNotificationJob] Errore nel calcolo prossima esecuzione:', error);
            return null;
        }
    }

    /**
     * Ottiene la descrizione della frequenza
     * @param {string} cronExpression - Espressione cron
     * @returns {string} Descrizione della frequenza
     */
    getFrequencyDescription(cronExpression) {
        const descriptions = {
            '*/5 * * * *': 'ogni 5 minuti',
            '*/10 * * * *': 'ogni 10 minuti',
            '*/15 * * * *': 'ogni 15 minuti',
            '*/30 * * * *': 'ogni 30 minuti',
            '0 * * * *': 'ogni ora',
            '0 */2 * * *': 'ogni 2 ore',
            '0 */6 * * *': 'ogni 6 ore',
            '0 0 * * *': 'ogni giorno a mezzanotte'
        };

        return descriptions[cronExpression] || `personalizzata: ${cronExpression}`;
    }

    /**
     * Resetta le statistiche del job
     */
    resetStats() {
        this.stats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            totalNotificationsSent: 0,
            lastRunDuration: 0
        };

        console.log('🔄 [GeolocationNotificationJob] Statistiche resettate');
    }

    /**
     * Ottiene statistiche dettagliate del servizio
     * @returns {Promise<Object>} Statistiche del servizio
     */
    async getServiceStats() {
        try {
            const serviceStats = await geolocationNotificationService.getServiceStats();
            
            return {
                ...this.getStatus(),
                serviceStats: serviceStats.stats || {}
            };

        } catch (error) {
            console.error('❌ [GeolocationNotificationJob] Errore nel recupero statistiche servizio:', error);
            return this.getStatus();
        }
    }

    /**
     * Testa la connessione ai servizi
     * @returns {Promise<Object>} Risultato del test
     */
    async testConnection() {
        try {
            const serviceStats = await geolocationNotificationService.getServiceStats();
            
            return {
                success: true,
                message: 'Connessione ai servizi verificata',
                serviceStatus: serviceStats.success ? 'connected' : 'disconnected',
                timestamp: new Date()
            };

        } catch (error) {
            return {
                success: false,
                message: 'Errore nella connessione ai servizi',
                error: error.message,
                timestamp: new Date()
            };
        }
    }
}

// Crea e esporta un'istanza singleton del job
const geolocationNotificationJob = new GeolocationNotificationJob();

module.exports = geolocationNotificationJob;
