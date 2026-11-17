const request = require('supertest');
const express = require('express');

const ME = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const HOST = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const OTHER = 'cccccccccccccccccccccccc';

jest.mock('../models/User', () => ({
  findById: jest.fn(() => ({ select: () => Promise.resolve({ blockedUsers: [] }) })),
  find: jest.fn(() => ({ select: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }), then: (r) => Promise.resolve([]).then(r) }) })),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('../models/Meal', () => ({ find: jest.fn(), countDocuments: jest.fn().mockResolvedValue(2) }));
jest.mock('../models/Chat', () => ({}));
jest.mock('../services/mealCreationService', () => ({}));
jest.mock('../services/notificationService', () => ({}));
jest.mock('../services/mealStatusService', () => ({}));

const Meal = require('../models/Meal');
const User = require('../models/User');
const mealController = require('../controllers/mealController');
const userController = require('../controllers/userController');

// pasto 1: io partecipo; pasto 2: non partecipo
const meals = () => ([
  { _id: 'm1', title: 'mio', date: new Date(Date.now() + 3600e3), status: 'upcoming', host: { _id: HOST }, participants: [HOST, ME], chatId: 'chat1' },
  { _id: 'm2', title: 'altro', date: new Date(Date.now() + 3600e3), status: 'upcoming', host: { _id: OTHER }, participants: [OTHER], chatId: 'chat2' },
]);

function listChain(result) {
  const c = { sort: () => c, skip: () => c, limit: () => c, populate: () => c, lean: () => Promise.resolve(result), then: (r) => Promise.resolve(result).then(r) };
  return c;
}

function app(user, route, handler) {
  const a = express();
  a.get(route, (req, res, next) => { if (user) req.user = user; next(); }, handler);
  return a;
}

describe('Residuo SEC-06: chatId nelle liste solo per host e partecipanti', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/meals anonimo: nessun chatId', async () => {
    Meal.find.mockReturnValue(listChain(meals()));
    const res = await request(app(null, '/api/meals', mealController.getMeals)).get('/api/meals');
    expect(res.status).toBe(200);
    for (const m of res.body.data) expect(m).not.toHaveProperty('chatId');
  });

  it('GET /api/meals autenticato: chatId solo dove è partecipante o host', async () => {
    Meal.find.mockReturnValue(listChain(meals()));
    const res = await request(app({ id: ME }, '/api/meals', mealController.getMeals)).get('/api/meals');
    const byId = Object.fromEntries(res.body.data.map((m) => [m._id, m]));
    expect(byId.m1.chatId).toBe('chat1');
    expect(byId.m2).not.toHaveProperty('chatId');

    Meal.find.mockReturnValue(listChain(meals()));
    const asHost = await request(app({ id: OTHER }, '/api/meals', mealController.getMeals)).get('/api/meals');
    const byId2 = Object.fromEntries(asHost.body.data.map((m) => [m._id, m]));
    expect(byId2.m2.chatId).toBe('chat2');
    expect(byId2.m1).not.toHaveProperty('chatId');
  });

  it('ricerca: chatId rimosso per i non membri (documenti Mongoose serializzati)', async () => {
    const docs = meals().map((m) => ({ ...m, toJSON: () => ({ ...m }) }));
    Meal.find.mockReturnValue(listChain(docs));
    const res = await request(app({ id: ME }, '/api/meals/search', mealController.searchMeals)).get('/api/meals/search?q=cena');
    expect(res.status).toBe(200);
    const byId = Object.fromEntries(res.body.data.map((m) => [m._id, m]));
    expect(byId.m1.chatId).toBe('chat1');
    expect(byId.m2).not.toHaveProperty('chatId');

    Meal.find.mockReturnValue(listChain(docs));
    const anon = await request(app(null, '/api/meals/search', mealController.searchMeals)).get('/api/meals/search?q=cena');
    for (const m of anon.body.data) expect(m).not.toHaveProperty('chatId');
  });

  it('mappa: la proiezione non include chatId', async () => {
    let selected = '';
    const chain = { select: (f) => { selected = f; return chain; }, populate: () => chain, lean: () => chain, exec: () => Promise.resolve([]) };
    Meal.find.mockReturnValue(chain);
    await request(app(null, '/api/meals/map', mealController.getMealsForMap)).get('/api/meals/map?lat=41.9&lng=12.5&radius=10');
    expect(selected).not.toMatch(/chatId/);
  });
});

describe('Admin: non può cambiare il proprio stato o ruolo', () => {
  const adminApp = express();
  adminApp.use(express.json());
  adminApp.use((req, res, next) => { req.user = { id: ME, role: 'admin' }; next(); });
  adminApp.put('/users/:id/status', userController.changeUserStatus);
  adminApp.put('/users/:id/role', userController.changeUserRole);

  beforeEach(() => {
    jest.clearAllMocks();
    User.findByIdAndUpdate.mockReturnValue({ select: () => Promise.resolve({ id: OTHER }) });
  });

  it('auto-ban: 400 e nessuna scrittura', async () => {
    const res = await request(adminApp).put(`/users/${ME}/status`).send({ status: 'banned' });
    expect(res.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('auto-cambio di ruolo: 400 e nessuna scrittura', async () => {
    const res = await request(adminApp).put(`/users/${ME}/role`).send({ role: 'user' });
    expect(res.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('su un altro utente: consentito', async () => {
    expect((await request(adminApp).put(`/users/${OTHER}/status`).send({ status: 'banned' })).status).toBe(200);
    expect((await request(adminApp).put(`/users/${OTHER}/role`).send({ role: 'admin' })).status).toBe(200);
  });
});
