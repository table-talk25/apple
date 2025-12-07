const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Chi segnala
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Chi è stato segnalato
    reason: { type: String, required: true, enum: ['Comportamento Inappropriato', 'Spam', 'Profilo Falso', 'Altro'] },
    details: { type: String }, // Testo libero
    context: { type: String, enum: ['chat', 'profile', 'meal', 'video_call', 'general'], default: 'general' }, // Contesto della segnalazione
    meal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal' }, // Riferimento al pasto (opzionale)
    status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'dismissed'], default: 'pending' }, // Stato della segnalazione
    adminNotes: { type: String }, // Note dell'amministratore
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin che ha risolto
    resolvedAt: { type: Date }, // Data di risoluzione
}, { timestamps: true });

// Indici per ottimizzare le query
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ reportedUser: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ context: 1, createdAt: -1 });

// Metodi statici per query comuni
reportSchema.statics.findByReporter = function(reporterId) {
    return this.find({ reporter: reporterId })
        .populate('reportedUser', 'nickname profileImage')
        .sort({ createdAt: -1 });
};

reportSchema.statics.findByReportedUser = function(reportedUserId) {
    return this.find({ reportedUser: reportedUserId })
        .populate('reporter', 'nickname profileImage')
        .sort({ createdAt: -1 });
};

reportSchema.statics.findPending = function() {
    return this.find({ status: 'pending' })
        .populate('reporter', 'nickname profileImage')
        .populate('reportedUser', 'nickname profileImage')
        .sort({ createdAt: -1 });
};

reportSchema.statics.findByStatus = function(status) {
    return this.find({ status })
        .populate('reporter', 'nickname profileImage')
        .populate('reportedUser', 'nickname profileImage')
        .sort({ createdAt: -1 });
};

// Metodi di istanza
reportSchema.methods.markAsReviewed = function(adminId, notes) {
    this.status = 'reviewed';
    this.adminNotes = notes;
    this.resolvedBy = adminId;
    this.resolvedAt = new Date();
    return this.save();
};

reportSchema.methods.markAsResolved = function(adminId, notes) {
    this.status = 'resolved';
    this.adminNotes = notes;
    this.resolvedBy = adminId;
    this.resolvedAt = new Date();
    return this.save();
};

reportSchema.methods.markAsDismissed = function(adminId, notes) {
    this.status = 'dismissed';
    this.adminNotes = notes;
    this.resolvedBy = adminId;
    this.resolvedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Report', reportSchema); 