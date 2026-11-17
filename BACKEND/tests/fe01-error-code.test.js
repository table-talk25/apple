const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../models/User', () => ({ findById: jest.fn() }));

const User = require('../models/User');
const { protect } = require('../middleware/auth');
const ErrorResponse = require('../utils/errorResponse');
const errorHandler = require('../middleware/error');

const selectable = (v) => ({ select: () => Promise.resolve(v) });
const token = jwt.sign({ id: 'u1' }, process.env.JWT_SECRET, { expiresIn: '1h' });

function appWith(handler) {
  const app = express();
  app.use(express.json());
  app.get('/x', handler);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('FE-01 il gestore errori espone `code`', () => {
  it.each([['banned', 'ACCOUNT_BANNED'], ['suspended', 'ACCOUNT_SUSPENDED']])(
    'account %s: 403 con code %s e formato invariato', async (status, code) => {
      User.findById.mockReturnValue(selectable({ id: 'u1', isActive: true, status }));
      const app = appWith([protect, (req, res) => res.json({ ok: true })]);
      const res = await request(app).get('/x').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ success: false, message: expect.any(String), errors: [], code });
    });

  it('403 senza code di account (es. non autorizzato su una risorsa): code diverso dai codici di blocco', async () => {
    const app = appWith((req, res, next) => next(new ErrorResponse('Non autorizzato', 403)));
    const res = await request(app).get('/x');
    expect(res.status).toBe(403);
    expect(['ACCOUNT_BANNED', 'ACCOUNT_SUSPENDED']).not.toContain(res.body.code);
    expect(res.body).toMatchObject({ success: false, message: 'Non autorizzato', errors: [] });
  });

  it('errori di validazione: `errors` resta l\'array dei dettagli', async () => {
    const details = [{ path: 'newPassword', msg: 'x' }];
    const app = appWith((req, res, next) => next(new ErrorResponse('Campi non validi', 400, details)));
    const res = await request(app).get('/x');
    expect(res.body).toMatchObject({ success: false, message: 'Campi non validi', errors: details, code: 'VALIDATION_ERROR' });
  });

  it('401 per token non valido: invariato', async () => {
    const app = appWith([protect, (req, res) => res.json({ ok: true })]);
    const res = await request(app).get('/x').set('Authorization', 'Bearer rotto');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
