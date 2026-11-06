const request = require('supertest');
const express = require('express');

const SENDER = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const RECIPIENT = 'bbbbbbbbbbbbbbbbbbbbbbbb';

jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    req.user = {
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      nickname: 'mittente',
      blockedUsers: global.__blockedBySender || [],
    };
    next();
  },
}));
jest.mock('../models/User', () => ({ findById: jest.fn() }));
jest.mock('../models/Invitation', () => ({ create: jest.fn(), find: jest.fn(), findById: jest.fn() }));
jest.mock('../models/Chat', () => ({ create: jest.fn() }));
jest.mock('../services/notificationService', () => ({ sendNotification: jest.fn() }));
jest.mock('../utils/sendEmail', () => ({ sendInvitationEmail: jest.fn().mockResolvedValue({}) }));

const User = require('../models/User');
const Invitation = require('../models/Invitation');
const errorHandler = require('../middleware/error');
const { describeError } = require('../bootstrap/processHandlers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/invitations', require('../routes/invitations'));
  app.use(errorHandler);
  return app;
}

describe('SEC-01 POST /api/invitations', () => {
  let errorSpy;
  beforeEach(() => {
    jest.clearAllMocks();
    global.__blockedBySender = [];
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it('body vuoto: risponde 400 senza interrompere il processo', async () => {
    const onUnhandled = jest.fn();
    process.on('unhandledRejection', onUnhandled);
    const res = await request(buildApp()).post('/api/invitations').send({});
    await new Promise((r) => setImmediate(r));
    process.removeListener('unhandledRejection', onUnhandled);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Invitation.create).not.toHaveBeenCalled();
    expect(onUnhandled).not.toHaveBeenCalled();
  });

  it('destinatario non ObjectId: 400', async () => {
    const res = await request(buildApp()).post('/api/invitations').send({ toUser: 'abc' });
    expect(res.status).toBe(400);
  });

  it('invito a sé stessi: 400', async () => {
    const res = await request(buildApp()).post('/api/invitations').send({ toUser: SENDER });
    expect(res.status).toBe(400);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('destinatario inesistente: 404', async () => {
    User.findById.mockResolvedValue(null);
    const res = await request(buildApp()).post('/api/invitations').send({ toUser: RECIPIENT });
    expect(res.status).toBe(404);
  });

  it('utente bloccato dal mittente o che ha bloccato il mittente: 404', async () => {
    global.__blockedBySender = [RECIPIENT];
    User.findById.mockResolvedValue({ isActive: true, blockedUsers: [] });
    let res = await request(buildApp()).post('/api/invitations').send({ toUser: RECIPIENT });
    expect(res.status).toBe(404);

    global.__blockedBySender = [];
    User.findById.mockResolvedValue({ isActive: true, blockedUsers: [SENDER] });
    res = await request(buildApp()).post('/api/invitations').send({ toUser: RECIPIENT });
    expect(res.status).toBe(404);
    expect(Invitation.create).not.toHaveBeenCalled();
  });

  it('caso valido: usa i campi del modello (fromUser/toUser) e risponde 201', async () => {
    User.findById.mockResolvedValue({ isActive: true, blockedUsers: [], email: 'x@example.test', settings: {} });
    Invitation.create.mockResolvedValue({ _id: 'inv1' });
    const res = await request(buildApp()).post('/api/invitations').send({ toUser: RECIPIENT, message: 'ciao' });
    expect(res.status).toBe(201);
    expect(Invitation.create).toHaveBeenCalledWith({ fromUser: SENDER, toUser: RECIPIENT, message: 'ciao' });
  });

  it('errore del database: passa dal gestore errori (500), nessuna unhandledRejection', async () => {
    const onUnhandled = jest.fn();
    process.on('unhandledRejection', onUnhandled);
    User.findById.mockResolvedValue({ isActive: true, blockedUsers: [], settings: {} });
    Invitation.create.mockRejectedValue(new Error('boom'));
    const res = await request(buildApp()).post('/api/invitations').send({ toUser: RECIPIENT });
    await new Promise((r) => setImmediate(r));
    process.removeListener('unhandledRejection', onUnhandled);
    expect(res.status).toBe(500);
    expect(onUnhandled).not.toHaveBeenCalled();
  });
});

describe('SEC-01 gestore globale: log senza dati personali', () => {
  it('per errori Mongo non registra il messaggio', () => {
    const err = new Error('E11000 duplicate key { email: "mario@example.test" }');
    err.name = 'MongoServerError';
    err.code = 11000;
    const info = describeError(err);
    expect(JSON.stringify(info)).not.toContain('mario@example.test');
    expect(info.code).toBe('11000');
  });
});
