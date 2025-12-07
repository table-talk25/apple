const Report = require('../models/Report');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');
const REPORT_LIMITS = require('../config/reportLimits');
const reportNotificationService = require('../services/reportNotificationService');

// @desc    Crea una nuova segnalazione
// @route   POST /api/reports
// @access  Private
exports.createReport = asyncHandler(async (req, res, next) => {
    const { reportedUserId, reason, details, context } = req.body;
    const reporterId = req.user.id;

    // Verifica che l'utente non stia segnalando se stesso
    if (reporterId === reportedUserId) {
        return next(new ErrorResponse('Non puoi segnalare te stesso', 400));
    }

    // Verifica che l'utente segnalato esista
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
        return next(new ErrorResponse('Utente segnalato non trovato', 404));
    }

    // 🛡️ CONTROLLO ANTI-SPAM: Verifica segnalazioni duplicate e recenti
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - REPORT_LIMITS.INTERVALS.DAY);
    const oneWeekAgo = new Date(now.getTime() - REPORT_LIMITS.INTERVALS.WEEK);

    // 1. Controlla se esiste già una segnalazione PENDENTE dello stesso utente
    const existingPendingReport = await Report.findOne({
        reporter: reporterId,
        reportedUser: reportedUserId,
        status: 'pending'
    });

    if (existingPendingReport) {
        if (REPORT_LIMITS.LOGGING.ENABLED) {
            console.log(`${REPORT_LIMITS.LOGGING.LEVELS.BLOCKED} [ReportController] Tentativo di spam segnalazione: ${reporterId} -> ${reportedUserId} (già pendente)`);
        }
        return next(new ErrorResponse(
            REPORT_LIMITS.MESSAGES.ALREADY_REPORTED_PENDING,
            400
        ));
    }

    // 2. Controlla se esiste una segnalazione RECENTE (ultime 24 ore) dello stesso utente
    const recentReport = await Report.findOne({
        reporter: reporterId,
        reportedUser: reportedUserId,
        createdAt: { $gte: oneDayAgo }
    });

    if (recentReport) {
        if (REPORT_LIMITS.LOGGING.ENABLED) {
            console.log(`${REPORT_LIMITS.LOGGING.LEVELS.WARNING} [ReportController] Tentativo di segnalazione troppo frequente: ${reporterId} -> ${reportedUserId} (ultime 24h)`);
        }
        return next(new ErrorResponse(
            REPORT_LIMITS.MESSAGES.ALREADY_REPORTED_RECENT,
            429
        ));
    }

    // 3. Controlla il numero totale di segnalazioni dell'utente nelle ultime 24 ore
    const userDailyReports = await Report.countDocuments({
        reporter: reporterId,
        createdAt: { $gte: oneDayAgo }
    });

    if (userDailyReports >= REPORT_LIMITS.DAILY_LIMIT) {
        if (REPORT_LIMITS.LOGGING.ENABLED) {
            console.log(`${REPORT_LIMITS.LOGGING.LEVELS.ERROR} [ReportController] Limite giornaliero segnalazioni superato: ${reporterId} (${userDailyReports} segnalazioni)`);
        }
        return next(new ErrorResponse(
            REPORT_LIMITS.MESSAGES.DAILY_LIMIT_EXCEEDED.replace('{{limit}}', REPORT_LIMITS.DAILY_LIMIT),
            429
        ));
    }

    // 4. Controlla il numero totale di segnalazioni dell'utente nelle ultime 2 settimane
    const userWeeklyReports = await Report.countDocuments({
        reporter: reporterId,
        createdAt: { $gte: oneWeekAgo }
    });

    if (userWeeklyReports >= REPORT_LIMITS.WEEKLY_LIMIT) {
        if (REPORT_LIMITS.LOGGING.ENABLED) {
            console.log(`${REPORT_LIMITS.LOGGING.LEVELS.ERROR} [ReportController] Limite settimanale segnalazioni superato: ${reporterId} (${userWeeklyReports} segnalazioni)`);
        }
        return next(new ErrorResponse(
            REPORT_LIMITS.MESSAGES.WEEKLY_LIMIT_EXCEEDED.replace('{{limit}}', REPORT_LIMITS.WEEKLY_LIMIT),
            429
        ));
    }

    // 5. Controlla se l'utente segnalato ha già troppe segnalazioni pendenti
    const pendingReportsForUser = await Report.countDocuments({
        reportedUser: reportedUserId,
        status: 'pending'
    });

    if (pendingReportsForUser >= REPORT_LIMITS.MAX_PENDING_PER_USER) {
        if (REPORT_LIMITS.LOGGING.ENABLED) {
            console.log(`${REPORT_LIMITS.LOGGING.LEVELS.WARNING} [ReportController] Utente con troppe segnalazioni pendenti: ${reportedUserId} (${pendingReportsForUser} segnalazioni)`);
        }
        // Non blocchiamo la segnalazione, ma la logghiamo per attenzione
    }

    // ✅ TUTTI I CONTROLLI SUPERATI: Crea la segnalazione
    const reportData = {
        reporter: reporterId,
        reportedUser: reportedUserId,
        reason,
        details,
        context: context || 'general'
    };

    // Aggiungi meal se fornito
    if (req.body.meal) {
        reportData.meal = req.body.meal;
    }

    const report = await Report.create(reportData);

    // Log della segnalazione creata
    if (REPORT_LIMITS.LOGGING.ENABLED) {
        console.log(`${REPORT_LIMITS.LOGGING.LEVELS.INFO} [ReportController] Segnalazione creata: ${reporterId} -> ${reportedUserId} (${reason})`);
    }

    // 📧 INVIA NOTIFICA EMAIL AGLI AMMINISTRATORI
    try {
        await reportNotificationService.sendNewReportNotification(report);
        if (REPORT_LIMITS.LOGGING.ENABLED) {
            console.log(`${REPORT_LIMITS.LOGGING.LEVELS.INFO} [ReportController] Notifica email inviata per segnalazione ${report._id}`);
        }
    } catch (emailError) {
        // Non blocchiamo la creazione della segnalazione se l'email fallisce
        console.error(`❌ [ReportController] Errore invio notifica email per segnalazione ${report._id}:`, emailError);
    }

    // Popola i dati degli utenti per la risposta
    await report.populate('reporter', 'nickname profileImage');
    await report.populate('reportedUser', 'nickname profileImage');

    res.status(201).json({
        success: true,
        data: report,
        message: REPORT_LIMITS.MESSAGES.SUCCESS
    });
});

// @desc    Ottieni tutte le segnalazioni (solo admin)
// @route   GET /api/reports
// @access  Private/Admin
exports.getReports = asyncHandler(async (req, res, next) => {
    const { status, context, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (status) {
        query.status = status;
    }
    
    if (context) {
        query.context = context;
    }

    const skip = (page - 1) * limit;

    const reports = await Report.find(query)
        .populate('reporter', 'nickname profileImage')
        .populate('reportedUser', 'nickname profileImage')
        .populate('resolvedBy', 'nickname')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Report.countDocuments(query);

    res.status(200).json({
        success: true,
        count: reports.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: reports
    });
});

// @desc    Ottieni le segnalazioni dell'utente corrente
// @route   GET /api/reports/my-reports
// @access  Private
exports.getMyReports = asyncHandler(async (req, res, next) => {
    const reports = await Report.findByReporter(req.user.id);

    res.status(200).json({
        success: true,
        count: reports.length,
        data: reports
    });
});

// @desc    Ottieni le statistiche personali delle segnalazioni dell'utente corrente
// @route   GET /api/reports/my-stats
// @access  Private
exports.getMyReportStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - REPORT_LIMITS.INTERVALS.DAY);
    const oneWeekAgo = new Date(now.getTime() - REPORT_LIMITS.INTERVALS.WEEK);

    // Conta le segnalazioni per periodo
    const [dailyCount, weeklyCount, totalCount] = await Promise.all([
        Report.countDocuments({
            reporter: userId,
            createdAt: { $gte: oneDayAgo }
        }),
        Report.countDocuments({
            reporter: userId,
            createdAt: { $gte: oneWeekAgo }
        }),
        Report.countDocuments({ reporter: userId })
    ]);

    // Limiti configurati
    const limits = {
        daily: REPORT_LIMITS.DAILY_LIMIT,
        weekly: REPORT_LIMITS.WEEKLY_LIMIT
    };

    // Calcola i limiti rimanenti
    const remaining = {
        daily: Math.max(0, limits.daily - dailyCount),
        weekly: Math.max(0, limits.weekly - weeklyCount)
    };

    // Determina se l'utente può fare nuove segnalazioni
    const canReport = {
        daily: dailyCount < limits.daily,
        weekly: weeklyCount < limits.weekly
    };

    res.status(200).json({
        success: true,
        data: {
            counts: {
                daily: dailyCount,
                weekly: weeklyCount,
                total: totalCount
            },
            limits,
            remaining,
            canReport,
            nextReset: {
                daily: new Date(now.getTime() + REPORT_LIMITS.INTERVALS.DAY), // Domani
                weekly: new Date(now.getTime() + REPORT_LIMITS.INTERVALS.WEEK) // Prossima settimana
            }
        }
    });
});

// @desc    Ottieni una singola segnalazione
// @route   GET /api/reports/:id
// @access  Private/Admin
exports.getReport = asyncHandler(async (req, res, next) => {
    const report = await Report.findById(req.params.id)
        .populate('reporter', 'nickname profileImage email')
        .populate('reportedUser', 'nickname profileImage email')
        .populate('resolvedBy', 'nickname');

    if (!report) {
        return next(new ErrorResponse('Segnalazione non trovata', 404));
    }

    res.status(200).json({
        success: true,
        data: report
    });
});

// @desc    Aggiorna lo stato di una segnalazione (solo admin)
// @route   PUT /api/reports/:id/status
// @access  Private/Admin
exports.updateReportStatus = asyncHandler(async (req, res, next) => {
    const { status, adminNotes } = req.body;
    const adminId = req.user.id;

    const report = await Report.findById(req.params.id);
    if (!report) {
        return next(new ErrorResponse('Segnalazione non trovata', 404));
    }

    // Aggiorna lo stato in base al valore fornito
    switch (status) {
        case 'reviewed':
            await report.markAsReviewed(adminId, adminNotes);
            break;
        case 'resolved':
            await report.markAsResolved(adminId, adminNotes);
            break;
        case 'dismissed':
            await report.markAsDismissed(adminId, adminNotes);
            break;
        default:
            return next(new ErrorResponse('Stato non valido', 400));
    }

    // Popola i dati per la risposta
    await report.populate('reporter', 'nickname profileImage');
    await report.populate('reportedUser', 'nickname profileImage');
    await report.populate('resolvedBy', 'nickname');

    res.status(200).json({
        success: true,
        data: report
    });
});

// @desc    Elimina una segnalazione (solo admin)
// @route   DELETE /api/reports/:id
// @access  Private/Admin
exports.deleteReport = asyncHandler(async (req, res, next) => {
    const report = await Report.findById(req.params.id);

    if (!report) {
        return next(new ErrorResponse('Segnalazione non trovata', 404));
    }

    await report.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Segnalazione eliminata con successo'
    });
});

// @desc    Ottieni statistiche delle segnalazioni (solo admin)
// @route   GET /api/reports/stats
// @access  Private/Admin
exports.getReportStats = asyncHandler(async (req, res, next) => {
    const stats = await Report.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    const statsObject = {
        total: totalReports,
        pending: pendingReports,
        byStatus: {}
    };

    stats.forEach(stat => {
        statsObject.byStatus[stat._id] = stat.count;
    });

    res.status(200).json({
        success: true,
        data: statsObject
    });
}); 