const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const ADMIN = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const TARGET = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const mockSelectable = (value) => ({ select: () => Promise.resolve(value), then: (res, rej) => Promise.resolve(value).then(res, rej) });

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('../services/emailVerificationService', () => ({}));
jest.mock('../services/passwordResetService', () => ({}));
jest.mock('../utils/sendEmail', () => ({}));
jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('socket.io', () => {
  const instance = { use: jest.fn(), on: jest.fn(), adapter: jest.fn() };
  const factory = jest.fn(() => instance);
  factory.__instance = instance;
  return factory;
});
jest.mock('../models/Meal', () => ({}));
jest.mock('../models/Chat', () => ({}));

const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const errorHandler = require('../middleware/error');
const { accountStatusDenial, isStatusActive } = require('../utils/accountStatus');

const token = (id = TARGET) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
const account = (extra = {}) => ({ id: TARGET, _id: TARGET, isActive: true, ...extra });

describe('FUN-02 helper di stato', () => {
  it('senza campo status l\'account è attivo', () => {
    expect(isStatusActive({})).toBe(true);
    expect(accountStatusDenial({})).toBeNull();
    expect(accountStatusDenial({ status: 'active' })).toBeNull();
  });
  it('suspended e banned hanno messaggio e codice distinti', () => {
    expect(accountStatusDenial({ status: 'banned' }).code).toBe('ACCOUNT_BANNED');
    expect(accountStatusDenial({ status: 'suspended' }).code).toBe('ACCOUNT_SUSPENDED');
    expect(accountStatusDenial({ status: 'banned' }).message).toMatch(/bannito/);
  });
});

describe('FUN-02 protect e optionalAuth', () => {
  const callProtect = async (user) => {
    User.findById.mockReturnValue(mockSelectable(user));
    const req = { headers: { authorization: `Bearer ${token()}` } };
    const next = jest.fn();
    await protect(req, {}, next);
    return { req, err: next.mock.calls[0][0] };
  };
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => console.error.mockRestore());

  it('utente con status banned: 403 con messaggio chiaro', async () => {
    const { err } = await callProtect(account({ status: 'banned' }));
    expect(err.statusCode).toBe(403);
    expect(err.message).toMatch(/bannito/);
  });

  it('utente sospeso: 403', async () => {
    const { err } = await callProtect(account({ status: 'suspended', isActive: false }));
    expect(err.statusCode).toBe(403);
    expect(err.message).toMatch(/sospeso/);
  });

  it('utente attivo e documento senza status: passa', async () => {
    let r = await callProtect(account({ status: 'active' }));
    expect(r.err).toBeUndefined();
    expect(r.req.user.id).toBe(TARGET);
    r = await callProtect(account());
    expect(r.err).toBeUndefined();
  });

  it('optionalAuth: utente bannito = anonimo', async () => {
    User.findById.mockReturnValue(mockSelectable(account({ status: 'banned' })));
    const req = { headers: { authorization: `Bearer ${token()}` } };
    const next = jest.fn();
    await optionalAuth(req, {}, next);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });
});

describe('FUN-02 login', () => {
  const app = express();
  app.use(express.json());
  app.post('/login', authController.login);
  app.use(errorHandler);

  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => console.error.mockRestore());

  it('account bannito con password corretta: 403 e nessun token', async () => {
    User.findOne.mockReturnValue(mockSelectable({
      isLocked: () => false, comparePassword: async () => true, status: 'banned',
      resetLoginAttempts: jest.fn(), generateAuthToken: jest.fn(),
    }));
    const res = await request(app).post('/login').send({ email: 'a@example.test', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.token).toBeUndefined();
  });
});

describe('FUN-02 PUT /api/users/:id/status e /role', () => {
  const app = express();
  app.use(express.json());
  app.put('/users/:id/status', userController.changeUserStatus);
  app.put('/users/:id/role', userController.changeUserRole);

  beforeEach(() => {
    jest.clearAllMocks();
    User.findByIdAndUpdate.mockReturnValue(mockSelectable({ id: TARGET, status: 'banned' }));
  });

  it('banned: scrive status, motivo, data e isActive=false con runValidators', async () => {
    const res = await request(app).put(`/users/${TARGET}/status`).send({ status: 'banned', reason: 'spam' });
    expect(res.status).toBe(200);
    const [id, update, options] = User.findByIdAndUpdate.mock.calls[0];
    expect(id).toBe(TARGET);
    expect(update).toMatchObject({ status: 'banned', statusReason: 'spam', isActive: false });
    expect(update.statusChangedAt).toBeInstanceOf(Date);
    expect(options).toMatchObject({ runValidators: true, new: true });
  });

  it('active: riattiva (isActive=true) e azzera il motivo', async () => {
    await request(app).put(`/users/${TARGET}/status`).send({ status: 'active', reason: 'ignorato' });
    expect(User.findByIdAndUpdate.mock.calls[0][1]).toMatchObject({ status: 'active', statusReason: '', isActive: true });
  });

  it.each([
    ['status inesistente', { status: 'deleted' }],
    ['status come oggetto', { status: { $ne: 'x' } }],
    ['status assente', {}],
    ['motivo oltre 500 caratteri', { status: 'banned', reason: 'a'.repeat(501) }],
    ['motivo non testuale', { status: 'banned', reason: { x: 1 } }],
  ])('%s: 400 senza scrivere', async (_label, body) => {
    const res = await request(app).put(`/users/${TARGET}/status`).send(body);
    expect(res.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('ruolo moderator: 400; user/admin: ok con runValidators', async () => {
    let res = await request(app).put(`/users/${TARGET}/role`).send({ role: 'moderator' });
    expect(res.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    res = await request(app).put(`/users/${TARGET}/role`).send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(User.findByIdAndUpdate.mock.calls[0][2]).toMatchObject({ runValidators: true });
  });
});

describe('FUN-02 connessione socket', () => {
  const socketIO = require('socket.io');
  let middleware;
  beforeAll(async () => {
    const { initializeSocket } = require('../socket');
    await initializeSocket({});
    middleware = socketIO.__instance.use.mock.calls[0][0];
  });
  const connect = async (user) => {
    User.findById.mockReturnValue(mockSelectable(user));
    const next = jest.fn();
    await middleware({ handshake: { auth: { token: token() } } }, next);
    return next.mock.calls[0][0];
  };

  it('utente bannito, sospeso o disattivato: connessione rifiutata', async () => {
    expect((await connect(account({ status: 'banned' }))).message).toMatch(/non attivo/);
    expect((await connect(account({ status: 'suspended' }))).message).toMatch(/non attivo/);
    expect((await connect(account({ isActive: false }))).message).toMatch(/non attivo/);
  });

  it('utente attivo: accettata', async () => {
    expect(await connect(account({ status: 'active' }))).toBeUndefined();
    expect(await connect(account())).toBeUndefined();
  });
});

describe('FUN-02 schema User', () => {
  it('default active e valori ammessi', () => {
    jest.isolateModules(() => {
      jest.unmock('../models/User');
      const RealUser = require('../models/User');
      expect(new RealUser({}).status).toBe('active');
      const invalid = new RealUser({ status: 'deleted' }).validateSync();
      expect(invalid.errors.status).toBeDefined();
    });
  });
});
