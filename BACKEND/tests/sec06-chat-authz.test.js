const request = require('supertest');
const express = require('express');

const ME = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const CHAT_ID = 'cccccccccccccccccccccccc';

jest.mock('../models/Chat', () => ({ findById: jest.fn() }));
jest.mock('../models/User', () => ({ findById: jest.fn() }));
jest.mock('../models/Meal', () => ({ findById: jest.fn() }));
jest.mock('../services/notificationService', () => ({ sendPushNotification: jest.fn() }));

const Chat = require('../models/Chat');
const Meal = require('../models/Meal');
const chatController = require('../controllers/chatController');
const mealController = require('../controllers/mealController');
const errorHandler = require('../middleware/error');

const objId = (id) => ({ _id: id, toString: () => id });

function chatApp(userId = ME) {
  const app = express();
  app.use(express.json());
  app.post('/api/chats/:id/messages', (req, res, next) => { req.user = { id: userId }; next(); }, chatController.sendMessage);
  app.use(errorHandler);
  return app;
}

function chatDoc(participants) {
  const doc = {
    participants,
    messages: [],
    addMessage: jest.fn().mockImplementation(async (sender, content) => { doc.messages.push({ sender, content }); }),
    populate: jest.fn().mockImplementation(async () => doc),
  };
  return doc;
}

describe('SEC-06 POST /api/chats/:id/messages', () => {
  let errSpy;
  beforeEach(() => {
    jest.clearAllMocks();
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errSpy.mockRestore());

  it('utente non partecipante: 403 e nessun messaggio salvato', async () => {
    const doc = chatDoc([objId(OTHER)]);
    Chat.findById.mockResolvedValue(doc);
    const res = await request(chatApp()).post(`/api/chats/${CHAT_ID}/messages`).send({ content: 'ciao' });
    expect(res.status).toBe(403);
    expect(doc.addMessage).not.toHaveBeenCalled();
  });

  it('partecipante: 201 e contenuto ripulito (trim)', async () => {
    const doc = chatDoc([objId(ME), objId(OTHER)]);
    Chat.findById.mockResolvedValue(doc);
    const res = await request(chatApp()).post(`/api/chats/${CHAT_ID}/messages`).send({ content: '  ciao  ' });
    expect(res.status).toBe(201);
    expect(doc.addMessage).toHaveBeenCalledWith(ME, 'ciao', [], null);
  });

  it.each([
    ['assente', {}],
    ['non stringa', { content: { $ne: 1 } }],
    ['numero', { content: 5 }],
    ['solo spazi', { content: '    ' }],
    ['501 caratteri', { content: 'a'.repeat(501) }],
  ])('contenuto %s: 400 senza leggere la chat', async (_label, body) => {
    const res = await request(chatApp()).post(`/api/chats/${CHAT_ID}/messages`).send(body);
    expect(res.status).toBe(400);
    expect(Chat.findById).not.toHaveBeenCalled();
  });

  it('500 caratteri esatti: accettato', async () => {
    const doc = chatDoc([objId(ME)]);
    Chat.findById.mockResolvedValue(doc);
    const res = await request(chatApp()).post(`/api/chats/${CHAT_ID}/messages`).send({ content: 'a'.repeat(500) });
    expect(res.status).toBe(201);
  });

  it('id chat non valido: 400', async () => {
    const res = await request(chatApp()).post('/api/chats/abc/messages').send({ content: 'x' });
    expect(res.status).toBe(400);
  });

  it('chat inesistente: 404', async () => {
    Chat.findById.mockResolvedValue(null);
    const res = await request(chatApp()).post(`/api/chats/${CHAT_ID}/messages`).send({ content: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('SEC-06 GET /api/meals/:id non rivela chatId a chi non è host o partecipante', () => {
  const HOST = 'dddddddddddddddddddddddd';
  function mealDoc() {
    const plain = {
      _id: 'm1', title: 't', isPublic: true,
      host: { _id: HOST, nickname: 'host' },
      participants: [{ _id: ME, nickname: 'io' }],
      chatId: { _id: CHAT_ID },
    };
    return { ...plain, toObject: () => ({ ...plain }) };
  }
  function mealApp(user) {
    const app = express();
    app.get('/api/meals/:id', (req, res, next) => { if (user) req.user = user; next(); }, mealController.getMeal);
    app.use(errorHandler);
    return app;
  }
  beforeEach(() => {
    Meal.findById.mockReturnValue({ populate: () => ({ populate: () => Promise.resolve(mealDoc()) }) });
  });

  it('anonimo: nessun chatId', async () => {
    const res = await request(mealApp(null)).get('/api/meals/m1');
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('chatId');
  });

  it('utente loggato non partecipante: nessun chatId', async () => {
    const res = await request(mealApp({ id: OTHER })).get('/api/meals/m1');
    expect(res.body.data).not.toHaveProperty('chatId');
  });

  it('partecipante: chatId presente', async () => {
    const res = await request(mealApp({ id: ME })).get('/api/meals/m1');
    expect(res.body.data.chatId).toBe(CHAT_ID);
  });

  it('host: chatId presente', async () => {
    const res = await request(mealApp({ id: HOST })).get('/api/meals/m1');
    expect(res.body.data.chatId).toBe(CHAT_ID);
  });
});
