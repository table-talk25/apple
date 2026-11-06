const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const HOST = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const MEMBER = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const STRANGER = 'cccccccccccccccccccccccc';
const BLOCKED = 'dddddddddddddddddddddddd';

const mockSelectable = (value) => ({ select: () => Promise.resolve(value), then: (res, rej) => Promise.resolve(value).then(res, rej) });

jest.mock('../models/User', () => ({
  findById: jest.fn((id) => mockSelectable(global.__users[id] || null)),
  find: jest.fn(() => ({ select: () => Promise.resolve(global.__blockedMe || []) })),
}));
jest.mock('../models/Meal', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0),
}));
jest.mock('../models/Chat', () => ({}));
jest.mock('../services/mealCreationService', () => ({}));
jest.mock('../services/notificationService', () => ({}));
jest.mock('../services/mealStatusService', () => ({}));

const Meal = require('../models/Meal');
const { optionalAuth } = require('../middleware/auth');
const errorHandler = require('../middleware/error');

const token = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
const user = (id, extra = {}) => ({ id, _id: id, isActive: true, blockedUsers: [], ...extra });

beforeEach(() => {
  jest.clearAllMocks();
  global.__users = {
    [HOST]: user(HOST),
    [MEMBER]: user(MEMBER, { blockedUsers: [BLOCKED] }),
    [STRANGER]: user(STRANGER),
    off: user('off', { isActive: false }),
  };
  global.__blockedMe = [];
});

describe('FUN-01 optionalAuth', () => {
  const run = async (headers) => {
    const req = { headers };
    const next = jest.fn();
    await optionalAuth(req, {}, next);
    return { req, next };
  };

  it('senza token: anonimo, nessun errore', async () => {
    const { req, next } = await run({});
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('token non valido o scaduto: anonimo, nessun errore', async () => {
    let r = await run({ authorization: 'Bearer abc.def.ghi' });
    expect(r.req.user).toBeUndefined();
    expect(r.next).toHaveBeenCalledWith();
    const expired = jwt.sign({ id: HOST }, process.env.JWT_SECRET, { expiresIn: -10 });
    r = await run({ authorization: `Bearer ${expired}` });
    expect(r.req.user).toBeUndefined();
    expect(r.next).toHaveBeenCalledWith();
  });

  it('token valido e utente attivo: popola req.user', async () => {
    const { req, next } = await run({ authorization: `Bearer ${token(HOST)}` });
    expect(req.user.id).toBe(HOST);
    expect(next).toHaveBeenCalledWith();
  });

  it('utente disattivato o inesistente: anonimo', async () => {
    let r = await run({ authorization: `Bearer ${token('off')}` });
    expect(r.req.user).toBeUndefined();
    r = await run({ authorization: `Bearer ${token('nessuno')}` });
    expect(r.req.user).toBeUndefined();
  });
});

describe('FUN-01 rotte GET dei pasti con utente opzionale', () => {
  const app = express();
  app.use('/api/meals', require('../routes/meal'));
  app.use(errorHandler);

  const privateMeal = () => {
    const plain = {
      _id: 'm1', isPublic: false, title: 'privato',
      host: { _id: HOST }, participants: [{ _id: HOST }, { _id: MEMBER }], chatId: { _id: 'chat1' },
    };
    return { ...plain, toObject: () => ({ ...plain }) };
  };
  beforeEach(() => {
    Meal.findById.mockReturnValue({ populate: () => ({ populate: () => Promise.resolve(privateMeal()) }) });
  });

  it('pasto privato: anonimo 404, sconosciuto 404, host e partecipante 200', async () => {
    expect((await request(app).get('/api/meals/m1')).status).toBe(404);
    expect((await request(app).get('/api/meals/m1').set('Authorization', `Bearer ${token(STRANGER)}`)).status).toBe(404);
    expect((await request(app).get('/api/meals/m1').set('Authorization', `Bearer ${token(HOST)}`)).status).toBe(200);
    expect((await request(app).get('/api/meals/m1').set('Authorization', `Bearer ${token(MEMBER)}`)).status).toBe(200);
  });

  it('token non valido sul dettaglio: trattato come anonimo (404 sul privato, non 401)', async () => {
    const res = await request(app).get('/api/meals/m1').set('Authorization', 'Bearer rotto');
    expect(res.status).toBe(404);
  });

  const listChain = () => {
    const chain = { sort: () => chain, skip: () => chain, limit: () => chain, populate: () => chain, select: () => chain, lean: () => chain, exec: () => Promise.resolve([]), then: (r) => Promise.resolve([]).then(r) };
    return chain;
  };

  it('lista anonima: solo pasti pubblici', async () => {
    Meal.find.mockImplementation(() => listChain());
    const res = await request(app).get('/api/meals');
    expect(res.status).toBe(200);
    const query = Meal.find.mock.calls[0][0];
    expect(query.isPublic).toBe(true);
    expect(query.$or).toBeUndefined();
  });

  it('lista autenticata: pubblici + propri/partecipati e utenti bloccati esclusi (in entrambe le direzioni)', async () => {
    global.__blockedMe = [{ _id: 'eeeeeeeeeeeeeeeeeeeeeeee' }];
    Meal.find.mockImplementation(() => listChain());
    const res = await request(app).get('/api/meals').set('Authorization', `Bearer ${token(MEMBER)}`);
    expect(res.status).toBe(200);
    const query = Meal.find.mock.calls[0][0];
    expect(query.$or).toEqual([{ isPublic: true }, { host: MEMBER }, { participants: MEMBER }]);
    expect(query.host.$nin.map(String)).toEqual([BLOCKED, 'eeeeeeeeeeeeeeeeeeeeeeee']);
  });

  it('mappa autenticata: stessa visibilità e blocchi; anonima: solo pubblici', async () => {
    Meal.find.mockImplementation(() => listChain());
    await request(app).get('/api/meals/map?lat=41.9&lng=12.5&radius=10').set('Authorization', `Bearer ${token(MEMBER)}`);
    let query = Meal.find.mock.calls[0][0];
    expect(query.$or).toEqual([{ isPublic: true }, { host: MEMBER }, { participants: MEMBER }]);
    expect(query.host.$nin.map(String)).toEqual([BLOCKED]);
    expect(query.isPublic).toBeUndefined();

    Meal.find.mockClear();
    await request(app).get('/api/meals/map?lat=41.9&lng=12.5&radius=10');
    query = Meal.find.mock.calls[0][0];
    expect(query.isPublic).toBe(true);
    expect(query.$or).toBeUndefined();
  });

  it('ricerca autenticata: filtro di visibilità e blocchi applicato', async () => {
    Meal.find.mockImplementation(() => listChain());
    const res = await request(app).get('/api/meals/search?q=pasta').set('Authorization', `Bearer ${token(MEMBER)}`);
    expect(res.status).toBe(200);
    const and = Meal.find.mock.calls.find((c) => c[0] && c[0].$and)[0].$and;
    expect(and).toContainEqual({ $or: [{ isPublic: true }, { host: MEMBER }, { participants: MEMBER }] });
    expect(JSON.stringify(and)).toContain(BLOCKED);
  });
});
