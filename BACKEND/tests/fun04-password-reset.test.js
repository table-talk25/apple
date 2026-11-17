const crypto = require('crypto');
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');

jest.mock('../services/emailVerificationService', () => ({}));

const User = require('../models/User');
const passwordResetService = require('../services/passwordResetService');
const authController = require('../controllers/authController');
const { resetPasswordValidation } = require('../middleware/validators/authValidator');
const errorHandler = require('../middleware/error');

const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

function makeUser(email) {
  const u = new User({
    _id: new mongoose.Types.ObjectId(), name: 'N', surname: 'S', email,
    dateOfBirth: new Date('1990-01-01'),
  });
  u.save = jest.fn().mockResolvedValue(u);
  return u;
}

// "Database" in memoria: findOne applica davvero il filtro su hash e scadenza
function installFakeDb(users) {
  jest.spyOn(User, 'findOne').mockImplementation(async (filter) => {
    if (filter.email) return users.find((u) => u.email === filter.email) || null;
    return users.find((u) => u.resetPasswordToken === filter.resetPasswordToken
      && u.resetPasswordExpires > filter.resetPasswordExpires.$gt) || null;
  });
  jest.spyOn(User, 'findById').mockImplementation(async (id) => users.find((u) => String(u._id) === String(id)) || null);
}

let logSpy;
let errSpy;
beforeEach(() => {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('FUN-04 servizio: ricerca per hash del token', () => {
  it('con due reset attivi ognuno funziona solo col proprio token', async () => {
    const a = makeUser('a@example.test');
    const b = makeUser('b@example.test');
    const tokenA = a.generatePasswordResetToken();
    const tokenB = b.generatePasswordResetToken();
    installFakeDb([a, b]);

    expect(User.findOne).not.toHaveBeenCalled();
    const resB = await passwordResetService.resetPassword(tokenB, 'NuovaPass1');
    expect(resB.success).toBe(true);
    expect(String(resB.userId)).toBe(String(b._id));
    expect(b.password).toBe('NuovaPass1');
    expect(b.resetPasswordToken).toBeUndefined();
    expect(a.password).toBeUndefined();

    // il filtro usa l'hash, non { $exists: true }
    const filter = User.findOne.mock.calls[0][0];
    expect(filter.resetPasswordToken).toBe(sha(tokenB));

    // il token di B non è riutilizzabile; quello di A funziona ancora
    expect((await passwordResetService.resetPassword(tokenB, 'AltraPass1')).success).toBe(false);
    expect((await passwordResetService.resetPassword(tokenA, 'NuovaPassA1')).success).toBe(true);
    expect(a.password).toBe('NuovaPassA1');
  });

  it('token di un altro utente o inventato: rifiutato', async () => {
    const a = makeUser('a@example.test');
    a.generatePasswordResetToken();
    installFakeDb([a]);
    const forged = crypto.randomBytes(32).toString('hex');
    const res = await passwordResetService.resetPassword(forged, 'NuovaPass1');
    expect(res).toMatchObject({ success: false, code: 'INVALID_TOKEN' });
    expect(a.save).not.toHaveBeenCalled();
  });

  it('token scaduto: rifiutato', async () => {
    const a = makeUser('a@example.test');
    const token = a.generatePasswordResetToken();
    a.resetPasswordExpires = new Date(Date.now() - 1000);
    installFakeDb([a]);
    expect((await passwordResetService.resetPassword(token, 'NuovaPass1')).success).toBe(false);
  });

  it('token con formato non valido: rifiutato senza interrogare il database', async () => {
    installFakeDb([]);
    for (const t of ['abc', '', null, { $ne: '' }, 'z'.repeat(64)]) {
      expect((await passwordResetService.verifyResetToken(t)).code).toBe('INVALID_TOKEN');
    }
    expect(User.findOne).not.toHaveBeenCalled();
  });
});

describe('FUN-04 forgot-password: invio non riuscito', () => {
  it('pulisce il token, risponde col messaggio generico e non registra dati personali', async () => {
    const a = makeUser('mario.rossi@example.test');
    installFakeDb([a]);
    jest.spyOn(passwordResetService, 'sendPasswordResetEmailTemplate').mockResolvedValue({ success: false, message: 'smtp giù' });
    const res = await passwordResetService.sendPasswordResetEmail('mario.rossi@example.test');
    expect(res.success).toBe(true);
    expect(res.message).toBe(passwordResetService.GENERIC_RESET_MESSAGE);
    expect(a.resetPasswordToken).toBeUndefined();
    expect(a.resetPasswordExpires).toBeUndefined();
    const logged = JSON.stringify([...errSpy.mock.calls, ...logSpy.mock.calls]);
    expect(logged).not.toContain('mario.rossi');
  });

  it('utente inesistente: stesso messaggio', async () => {
    installFakeDb([]);
    const res = await passwordResetService.sendPasswordResetEmail('nessuno@example.test');
    expect(res).toMatchObject({ success: true, message: passwordResetService.GENERIC_RESET_MESSAGE });
  });

  it('rotta: invio fallito -> 200 con il messaggio generico (non 500)', async () => {
    jest.spyOn(passwordResetService, 'sendPasswordResetEmail').mockRejectedValue(new Error('boom'));
    const app = express();
    app.use(express.json());
    app.post('/forgot', authController.forgotPassword);
    app.use(errorHandler);
    const res = await request(app).post('/forgot').send({ email: 'x@example.test' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(passwordResetService.GENERIC_RESET_MESSAGE);
  });
});

describe('FUN-04 POST /reset-password: validazione del body { token, newPassword }', () => {
  const app = express();
  app.use(express.json());
  app.post('/reset-password', resetPasswordValidation, authController.resetPassword);
  app.use(errorHandler);
  const TOKEN = 'a'.repeat(64);

  it('vecchio body { password, confirmPassword }: 400 con errore su newPassword', async () => {
    const spy = jest.spyOn(passwordResetService, 'resetPassword');
    const res = await request(app).post('/reset-password').send({ token: TOKEN, password: 'Valida123', confirmPassword: 'Valida123' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.path)).toContain('newPassword');
    expect(spy).not.toHaveBeenCalled();
  });

  it.each([['corta', 'Ab1'], ['senza maiuscola', 'password1'], ['senza minuscola', 'PASSWORD1'], ['senza numero', 'Password']])(
    'password %s: 400 (stessa policy della registrazione)', async (_l, pwd) => {
      const res = await request(app).post('/reset-password').send({ token: TOKEN, newPassword: pwd });
      expect(res.status).toBe(400);
    });

  it('confirmPassword diversa: 400', async () => {
    const res = await request(app).post('/reset-password').send({ token: TOKEN, newPassword: 'Valida123', confirmPassword: 'Altra123' });
    expect(res.status).toBe(400);
  });

  it('token non valido nel servizio: 400 con code INVALID_TOKEN', async () => {
    jest.spyOn(passwordResetService, 'resetPassword').mockResolvedValue({ success: false, message: 'Token di reset non valido o scaduto', code: 'INVALID_TOKEN' });
    const res = await request(app).post('/reset-password').send({ token: TOKEN, newPassword: 'Valida123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/non valido/);
  });

  it('body valido: 200 e servizio chiamato con token e newPassword', async () => {
    const spy = jest.spyOn(passwordResetService, 'resetPassword').mockResolvedValue({ success: true, message: 'ok', userId: 'u1' });
    const res = await request(app).post('/reset-password').send({ token: TOKEN, newPassword: 'Valida123' });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(TOKEN, 'Valida123');
  });
});

describe('FUN-04 rotte admin: nomi dei metodi allineati', () => {
  const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
  it('getPasswordResetStats usa getResetStats', async () => {
    const spy = jest.spyOn(passwordResetService, 'getResetStats').mockResolvedValue({ success: true, stats: { totalUsers: 1 } });
    const r = res();
    await authController.getPasswordResetStats({}, r, jest.fn());
    expect(spy).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
  });
  it('cleanupExpiredResetTokens usa cleanupExpiredTokens', async () => {
    const spy = jest.spyOn(passwordResetService, 'cleanupExpiredTokens').mockResolvedValue({ success: true, message: 'ok', cleanedCount: 0 });
    const r = res();
    await authController.cleanupExpiredResetTokens({}, r, jest.fn());
    expect(spy).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
  });
});
