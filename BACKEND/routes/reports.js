const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    createReport,
    getReports,
    getMyReports,
    getMyReportStats,
    getReport,
    updateReportStatus,
    deleteReport,
    getReportStats
} = require('../controllers/reportController');

// Routes per utenti autenticati
router.post('/', protect, createReport);
router.get('/my-reports', protect, getMyReports);
router.get('/my-stats', protect, getMyReportStats);

// Routes per admin
router.get('/', protect, authorize('admin'), getReports);
router.get('/stats', protect, authorize('admin'), getReportStats);
router.get('/:id', protect, authorize('admin'), getReport);
router.put('/:id/status', protect, authorize('admin'), updateReportStatus);
router.delete('/:id', protect, authorize('admin'), deleteReport);

module.exports = router; 