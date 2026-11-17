const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

const Report = require('../models/Report');
const User = require('../models/User');
const reportNotificationService = require('../services/reportNotificationService');
const reportController = require('../controllers/reportController');
const errorHandler = require('../middleware/error');

const REPORTER = new mongoose.Types.ObjectId().toString();
const REPORTED = new mongoose.Types.ObjectId().toString();
const FRONTEND_CODES = ['inappropriate', 'spam', 'fakeProfile', 'other'];
const LEGACY = ['Comportamento Inappropriato', 'Spam', 'Profilo Falso', 'Altro'];

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('MOD-01 schema Report', () => {
  const base = { reporter: REPORTER, reportedUser: REPORTED, context: 'profile' };
  it.each(FRONTEND_CODES)('codice del frontend "%s" valido', (reason) => {
    expect(new Report({ ...base, reason }).validateSync()).toBeUndefined();
  });
  it.each(LEGACY)('valore storico "%s" ancora valido', (reason) => {
    expect(new Report({ ...base, reason }).validateSync()).toBeUndefined();
  });
  it('valore sconosciuto rifiutato', () => {
    expect(new Report({ ...base, reason: 'boh' }).validateSync().errors.reason).toBeDefined();
  });
});

describe('MOD-01 POST /api/reports con il payload reale del frontend', () => {
  const app = express();
  app.use(express.json());
  app.post('/api/reports', (req, res, next) => { req.user = { id: REPORTER }; next(); }, reportController.createReport);
  app.use(errorHandler);

  beforeEach(() => {
    jest.spyOn(User, 'findById').mockResolvedValue({ _id: REPORTED });
    jest.spyOn(Report, 'findOne').mockResolvedValue(null);
    jest.spyOn(Report, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(reportNotificationService, 'sendNewReportNotification').mockResolvedValue({});
    // create con la validazione vera dello schema, senza database
    jest.spyOn(Report, 'create').mockImplementation(async (data) => {
      const doc = new Report(data);
      await doc.validate();
      doc.populate = jest.fn().mockResolvedValue(doc);
      return doc;
    });
  });

  it.each(FRONTEND_CODES)('reason "%s": 201', async (reason) => {
    // stessi campi di components/common/ReportModal (BlockUserMenu passa context="profile")
    const res = await request(app).post('/api/reports').send({
      reportedUserId: REPORTED, reason, details: 'Testo libero', context: 'profile',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.reason).toBe(reason);
  });

  it('reason sconosciuto: 400', async () => {
    const res = await request(app).post('/api/reports').send({ reportedUserId: REPORTED, reason: 'boh', context: 'profile' });
    expect(res.status).toBe(400);
  });
});

describe('MOD-01 email agli admin con etichette leggibili', () => {
  it('nuova segnalazione: motivo e oggetto leggibili', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue({ _id: REPORTED });
    jest.spyOn(Report, 'countDocuments').mockResolvedValue(1);
    const send = jest.spyOn(reportNotificationService.emailService, 'sendEmail').mockResolvedValue({});
    const report = {
      _id: 'r1', reason: 'fakeProfile', context: 'profile', createdAt: new Date(),
      reporter: { nickname: 'a' }, reportedUser: { _id: REPORTED, nickname: 'b' },
      populated: () => true,
    };
    await reportNotificationService.sendNewReportNotification(report);
    const args = send.mock.calls[0][0];
    expect(args.context.reason).toBe('Profilo Falso');
    expect(args.context.context).toBe('Profilo Utente');
    expect(args.subject).toContain('Profilo Falso');
    expect(args.subject).not.toContain('fakeProfile');
  });

  it('riepilogo giornaliero: oggetti semplici con motivo leggibile (anche valori storici)', async () => {
    const docs = [
      new Report({ reporter: REPORTER, reportedUser: REPORTED, reason: 'inappropriate' }),
      new Report({ reporter: REPORTER, reportedUser: REPORTED, reason: 'Spam' }),
    ];
    jest.spyOn(Report, 'countDocuments').mockResolvedValue(2);
    const chain = { populate: () => chain, sort: () => chain, limit: () => Promise.resolve(docs) };
    jest.spyOn(Report, 'find').mockReturnValue(chain);
    const send = jest.spyOn(reportNotificationService.emailService, 'sendEmail').mockResolvedValue({});
    await reportNotificationService.sendDailyReportSummary(new Date());
    const recent = send.mock.calls[0][0].context.recentReports;
    expect(recent.map((r) => r.reason)).toEqual(['Comportamento Inappropriato', 'Spam']);
    expect(typeof recent[0].toObject).toBe('undefined');
  });
});
