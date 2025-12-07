// File: BACKEND/services/reportNotificationService.js

const emailService = require('../utils/sendEmail');
const User = require('../models/User');

/**
 * Servizio per l'invio di notifiche email per le segnalazioni
 */
class ReportNotificationService {
    constructor() {
        this.emailService = emailService;
        this.adminEmail = process.env.ADMIN_EMAIL || 'infotabletalk.app@gmail.com';
        this.adminDashboardUrl = process.env.ADMIN_DASHBOARD_URL || 'https://tabletalk.app/admin/reports';
    }

    /**
     * Determina la priorità di una segnalazione basandosi su vari fattori
     * @param {Object} report - Oggetto segnalazione
     * @param {Object} reportedUser - Utente segnalato
     * @returns {Object} Oggetto con priorità e testo
     */
    determinePriority(report, reportedUser) {
        let priority = 'low';
        let priorityText = 'Bassa';
        let score = 0;

        // Fattori che aumentano la priorità
        if (report.context === 'harassment' || report.context === 'inappropriate') {
            score += 3;
        }
        if (report.context === 'spam' || report.context === 'fake_profile') {
            score += 2;
        }
        if (report.context === 'meal' || report.context === 'chat' || report.context === 'video_call') {
            score += 1;
        }

        // Se l'utente ha già altre segnalazioni, aumenta la priorità
        if (reportedUser.reportCount && reportedUser.reportCount > 0) {
            score += Math.min(reportedUser.reportCount, 3);
        }

        // Determina la priorità finale
        if (score >= 5) {
            priority = 'high';
            priorityText = 'Alta';
        } else if (score >= 3) {
            priority = 'medium';
            priorityText = 'Media';
        }

        return { priority, priorityText };
    }

    /**
     * Formatta la data per l'email
     * @param {Date} date - Data da formattare
     * @returns {string} Data formattata
     */
    formatDate(date) {
        return new Intl.DateTimeFormat('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    /**
     * Invia notifica email per una nuova segnalazione
     * @param {Object} report - Oggetto segnalazione
     * @returns {Promise<Object>} Risultato dell'invio
     */
    async sendNewReportNotification(report) {
        try {
            // Popola i dati degli utenti se non già fatto
            if (!report.populated('reporter') || !report.populated('reportedUser')) {
                await report.populate('reporter', 'nickname profileImage');
                await report.populate('reportedUser', 'nickname profileImage');
            }

            // Ottieni il conteggio delle segnalazioni per l'utente segnalato
            const reportedUser = await User.findById(report.reportedUser._id);
            const reportCount = await require('../models/Report').countDocuments({
                reportedUser: report.reportedUser._id,
                status: { $in: ['pending', 'investigating'] }
            });

            // Determina la priorità
            const { priority, priorityText } = this.determinePriority(report, { reportCount });

            // Prepara il contesto per il template
            const emailContext = {
                reportId: report._id,
                createdAt: this.formatDate(report.createdAt),
                reporterNickname: report.reporter.nickname || 'Utente Sconosciuto',
                reportedUserNickname: report.reportedUser.nickname || 'Utente Sconosciuto',
                reason: report.reason,
                details: report.details || 'Nessun dettaglio fornito',
                context: this.getContextDisplayName(report.context),
                priority: priority,
                priorityText: priorityText,
                adminDashboardUrl: this.adminDashboardUrl,
                reportCount: reportCount,
                totalReports: await require('../models/Report').countDocuments({
                    reportedUser: report.reportedUser._id
                })
            };

            // Invia l'email
            const result = await this.emailService.sendEmail({
                to: this.adminEmail,
                subject: `🚨 Nuova Segnalazione TableTalk - Priorità ${priorityText} - ${report.reason}`,
                template: 'new-report-notification',
                context: emailContext
            });

            console.log(`📧 [ReportNotification] Email inviata per segnalazione ${report._id} a ${this.adminEmail}`);
            return result;

        } catch (error) {
            console.error(`❌ [ReportNotification] Errore invio email segnalazione ${report._id}:`, error);
            throw error;
        }
    }

    /**
     * Invia notifica email per aggiornamenti di stato delle segnalazioni
     * @param {Object} report - Oggetto segnalazione aggiornato
     * @param {string} oldStatus - Stato precedente
     * @param {string} newStatus - Nuovo stato
     * @returns {Promise<Object>} Risultato dell'invio
     */
    async sendStatusUpdateNotification(report, oldStatus, newStatus) {
        try {
            // Popola i dati degli utenti se non già fatto
            if (!report.populated('reporter') || !report.populated('reportedUser')) {
                await report.populate('reporter', 'nickname profileImage');
                await report.populate('reportedUser', 'nickname profileImage');
            }

            const statusDisplayNames = {
                'pending': 'In Attesa',
                'investigating': 'In Investigazione',
                'resolved': 'Risolta',
                'dismissed': 'Archiviata',
                'escalated': 'Escalata'
            };

            const emailContext = {
                reportId: report._id,
                oldStatus: statusDisplayNames[oldStatus] || oldStatus,
                newStatus: statusDisplayNames[newStatus] || newStatus,
                reporterNickname: report.reporter.nickname || 'Utente Sconosciuto',
                reportedUserNickname: report.reportedUser.nickname || 'Utente Sconosciuto',
                reason: report.reason,
                adminDashboardUrl: this.adminDashboardUrl,
                updatedAt: this.formatDate(new Date())
            };

            // Invia l'email di aggiornamento
            const result = await this.emailService.sendEmail({
                to: this.adminEmail,
                subject: `📋 Aggiornamento Segnalazione TableTalk #${report._id} - ${statusDisplayNames[newStatus] || newStatus}`,
                template: 'report-status-update',
                context: emailContext
            });

            console.log(`📧 [ReportNotification] Email aggiornamento stato inviata per segnalazione ${report._id}`);
            return result;

        } catch (error) {
            console.error(`❌ [ReportNotification] Errore invio email aggiornamento stato ${report._id}:`, error);
            throw error;
        }
    }

    /**
     * Invia notifica email per segnalazioni urgenti (es. multiple segnalazioni per lo stesso utente)
     * @param {Object} reportedUser - Utente segnalato
     * @param {Array} recentReports - Segnalazioni recenti
     * @returns {Promise<Object>} Risultato dell'invio
     */
    async sendUrgentReportNotification(reportedUser, recentReports) {
        try {
            const emailContext = {
                reportedUserNickname: reportedUser.nickname || 'Utente Sconosciuto',
                reportedUserId: reportedUser._id,
                reportCount: recentReports.length,
                recentReports: recentReports.slice(0, 5), // Ultime 5 segnalazioni
                adminDashboardUrl: this.adminDashboardUrl,
                createdAt: this.formatDate(new Date())
            };

            const result = await this.emailService.sendEmail({
                to: this.adminEmail,
                subject: `🚨 URGENTE: Multiple Segnalazioni per ${reportedUser.nickname} - ${recentReports.length} segnalazioni`,
                template: 'urgent-reports-notification',
                context: emailContext
            });

            console.log(`📧 [ReportNotification] Email urgente inviata per utente ${reportedUser._id}`);
            return result;

        } catch (error) {
            console.error(`❌ [ReportNotification] Errore invio email urgente per utente ${reportedUser._id}:`, error);
            throw error;
        }
    }

    /**
     * Converte il contesto della segnalazione in un nome visualizzabile
     * @param {string} context - Contesto della segnalazione
     * @returns {string} Nome visualizzabile
     */
    getContextDisplayName(context) {
        const contextNames = {
            'general': 'Generale',
            'harassment': 'Molestie',
            'inappropriate': 'Contenuto Inappropriato',
            'spam': 'Spam',
            'fake_profile': 'Profilo Falso',
            'meal': 'Problema Pasto',
            'chat': 'Problema Chat',
            'video_call': 'Problema in Videochiamata',
            'other': 'Altro'
        };

        return contextNames[context] || context;
    }

    /**
     * Invia riepilogo giornaliero delle segnalazioni
     * @param {Date} date - Data per il riepilogo
     * @returns {Promise<Object>} Risultato dell'invio
     */
    async sendDailyReportSummary(date = new Date()) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const Report = require('../models/Report');
            
            // Ottieni statistiche giornaliere
            const [totalReports, pendingReports, resolvedReports, dismissedReports] = await Promise.all([
                Report.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
                Report.countDocuments({ 
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                    status: 'pending'
                }),
                Report.countDocuments({ 
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                    status: 'resolved'
                }),
                Report.countDocuments({ 
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                    status: 'dismissed'
                })
            ]);

            // Ottieni le segnalazioni più recenti
            const recentReports = await Report.find({ 
                createdAt: { $gte: startOfDay, $lte: endOfDay } 
            })
            .populate('reporter', 'nickname')
            .populate('reportedUser', 'nickname')
            .sort({ createdAt: -1 })
            .limit(10);

            const emailContext = {
                date: this.formatDate(date),
                totalReports,
                pendingReports,
                resolvedReports,
                dismissedReports,
                recentReports,
                adminDashboardUrl: this.adminDashboardUrl
            };

            const result = await this.emailService.sendEmail({
                to: this.adminEmail,
                subject: `📊 Riepilogo Giornaliero Segnalazioni TableTalk - ${this.formatDate(date)}`,
                template: 'daily-report-summary',
                context: emailContext
            });

            console.log(`📧 [ReportNotification] Riepilogo giornaliero inviato per ${this.formatDate(date)}`);
            return result;

        } catch (error) {
            console.error(`❌ [ReportNotification] Errore invio riepilogo giornaliero:`, error);
            throw error;
        }
    }
}

module.exports = new ReportNotificationService();
