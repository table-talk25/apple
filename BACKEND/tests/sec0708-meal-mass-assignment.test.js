const request = require('supertest');
const express = require('express');

const HOST = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const BUCKET = 'bucket-di-prova.firebasestorage.app';

const mockDelete = jest.fn().mockResolvedValue();
const mockFile = jest.fn(() => ({ delete: mockDelete }));
jest.mock('firebase-admin', () => ({
  apps: [{ name: '[DEFAULT]' }],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn(() => ({})) },
  messaging: jest.fn(() => ({ send: jest.fn(), sendEachForMulticast: jest.fn() })),
  storage: () => ({ bucket: () => ({ name: 'bucket-di-prova.firebasestorage.app', file: (...a) => mockFile(...a) }) }),
}));

jest.mock('../models/Meal', () => ({ findById: jest.fn(), findByIdAndUpdate: jest.fn(), create: jest.fn() }));
jest.mock('../models/User', () => ({ findByIdAndUpdate: jest.fn() }));
jest.mock('../models/Chat', () => ({ create: jest.fn() }));
jest.mock('../services/geolocationNotificationService', () => ({ sendNearbyMealNotifications: jest.fn() }));
jest.mock('../services/notificationService', () => ({ sendPushNotification: jest.fn() }));
jest.mock('../services/mealStatusService', () => ({}));

const Meal = require('../models/Meal');
const Chat = require('../models/Chat');
const mealCreationService = require('../services/mealCreationService');
const mealController = require('../controllers/mealController');
const { parseMealInput } = require('../utils/mealInput');
const { deleteImage, extractManagedObjectPath } = require('../services/firebaseStorageService');
const errorHandler = require('../middleware/error');

const FORBIDDEN = {
  status: 'completed', imageUrl: 'https://storage.googleapis.com/altro/meal-images/1234567890_x.jpg',
  participantsCount: 9, participants: ['x'], host: 'altro-host', chatId: 'c', twilioRoomSid: 'S1',
  ratings: [{ score: 5 }], notifications: [{ message: 'x' }], reminderSent: true,
  videoCallStatus: 'ended', videoCallLink: 'http://x', videoStatus: 'active',
};
const VALID = {
  title: 'Cena', description: 'Una cena tra amici', date: '2030-05-01T18:00:00.000Z', duration: '90',
  maxParticipants: '4', language: 'Italiano', topics: 'cucina', mealType: 'virtual', type: 'dinner', isPublic: 'false',
  estimatedCost: '',
};

describe('SEC-08 parseMealInput', () => {
  it('ignora tutti i campi riservati al server', () => {
    const { data, errors } = parseMealInput({ ...VALID, ...FORBIDDEN });
    expect(errors).toEqual([]);
    for (const key of Object.keys(FORBIDDEN)) expect(data).not.toHaveProperty(key);
  });

  it('converte i tipi (stringhe multipart)', () => {
    const { data } = parseMealInput(VALID);
    expect(data).toMatchObject({ duration: 90, maxParticipants: 4, isPublic: false, topics: ['cucina'], mealType: 'virtual' });
    expect(data.date).toBeInstanceOf(Date);
    expect(data).not.toHaveProperty('estimatedCost');
  });

  it('topics: massimo 10 elementi, 50 caratteri, solo testi, sanificati', () => {
    expect(parseMealInput({ topics: Array(11).fill('ok') }).errors.length).toBe(1);
    expect(parseMealInput({ topics: ['a'.repeat(51)] }).errors.length).toBe(1);
    expect(parseMealInput({ topics: [1] }).errors.length).toBe(1);
    expect(parseMealInput({ topics: { $ne: 1 } }).errors.length).toBe(1);
    const { data, errors } = parseMealInput({ topics: ['<script>alert(1)</script>musica', '  vino  ', ''] });
    expect(errors).toEqual([]);
    expect(data.topics).toHaveLength(2);
    expect(data.topics[0]).not.toMatch(/[<>]/); // tag rimossi dal sanificatore esistente
    expect(data.topics[1]).toBe('vino');
    expect(parseMealInput({ topics: Array(10).fill('ok') }).errors).toEqual([]);
  });

  it.each([
    ['title non testo', { title: { $gt: '' } }],
    ['date non valida', { date: 'ieri' }],
    ['duration non intera', { duration: '1.5' }],
    ['maxParticipants non numerico', { maxParticipants: 'molti' }],
    ['isPublic non booleano', { isPublic: 'forse' }],
    ['coordinate fuori range', { location: { address: 'Via Roma 1, Roma', coordinates: [200, 10] } }],
    ['location come array', { location: ['x'] }],
    ['estimatedCost negativo', { estimatedCost: '-5' }],
  ])('%s -> errore', (_label, body) => {
    expect(parseMealInput(body).errors.length).toBeGreaterThan(0);
  });

  it('location: JSON stringa, indirizzo sanificato, coordinate valide', () => {
    const { data, errors } = parseMealInput({ location: JSON.stringify({ address: 'Via <b>Roma</b> 1, Roma', coordinates: [12.5, 41.9] }) });
    expect(errors).toEqual([]);
    expect(data.location).toEqual({ address: 'Via Roma 1, Roma', coordinates: [12.5, 41.9] });
  });
});

describe('SEC-08 POST /api/meals (createMeal)', () => {
  let app;
  let createSpy;
  beforeEach(() => {
    jest.clearAllMocks();
    createSpy = jest.spyOn(mealCreationService, 'createFullMeal').mockResolvedValue({ _id: 'm1' });
    Meal.findById.mockReturnValue({ populate: () => Promise.resolve({ _id: 'm1' }) });
    app = express();
    app.use(express.json());
    app.post('/api/meals', (req, res, next) => { req.user = { id: HOST, nickname: 'h' }; next(); }, mealController.createMeal);
    app.use(errorHandler);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('body con status, imageUrl e altri campi riservati: ignorati', async () => {
    const res = await request(app).post('/api/meals').send({ ...VALID, ...FORBIDDEN });
    expect(res.status).toBe(201);
    const passed = createSpy.mock.calls[0][0];
    for (const key of Object.keys(FORBIDDEN)) expect(passed).not.toHaveProperty(key);
    expect(passed.title).toBe('Cena');
  });

  it('tipi non validi: 400 senza creare', async () => {
    const res = await request(app).post('/api/meals').send({ ...VALID, topics: Array(11).fill('x') });
    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });
});

describe('SEC-08 mealCreationService: lista bianca anche nel servizio', () => {
  it('Meal.create non riceve i campi riservati', async () => {
    const meal = { _id: 'm1', title: 't', mealType: 'virtual', save: jest.fn().mockResolvedValue(), isPublic: false };
    Meal.create.mockResolvedValue(meal);
    Chat.create.mockResolvedValue({ _id: 'c1', addMessage: jest.fn().mockResolvedValue() });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await mealCreationService.createFullMeal({ ...VALID, ...FORBIDDEN }, { id: HOST, nickname: 'h' }, null);
    const created = Meal.create.mock.calls[0][0];
    for (const key of ['status', 'imageUrl', 'participantsCount', 'twilioRoomSid', 'ratings', 'notifications', 'reminderSent', 'videoCallStatus', 'chatId']) {
      if (key === 'chatId') expect(created.chatId).toBeNull();
      else expect(created).not.toHaveProperty(key);
    }
    expect(created.host).toBe(HOST);
    expect(created.participants).toEqual([HOST]);
    jest.restoreAllMocks();
  });
});

describe('SEC-08 PATCH /api/meals/:id (updateMeal)', () => {
  let app;
  beforeEach(() => {
    jest.clearAllMocks();
    Meal.findById.mockResolvedValue({ host: { toString: () => HOST }, participants: ['a', 'b', 'c'], imageUrl: null });
    Meal.findByIdAndUpdate.mockReturnValue({ populate: () => Promise.resolve({ toObject: () => ({ _id: 'm1' }) }) });
    app = express();
    app.use(express.json());
    app.patch('/api/meals/:id', (req, res, next) => { req.user = { id: HOST }; next(); }, mealController.updateMeal);
    app.use(errorHandler);
  });

  it('maxParticipants sotto gli iscritti: 400', async () => {
    const res = await request(app).patch('/api/meals/m1').send({ maxParticipants: 2 });
    expect(res.status).toBe(400);
    expect(Meal.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('maxParticipants pari agli iscritti: consentito', async () => {
    const res = await request(app).patch('/api/meals/m1').send({ maxParticipants: 3 });
    expect(res.status).toBe(200);
  });

  it('status, imageUrl e altri campi riservati non arrivano all\'aggiornamento', async () => {
    const res = await request(app).patch('/api/meals/m1').send({ title: 'Nuovo titolo', ...FORBIDDEN });
    expect(res.status).toBe(200);
    const update = Meal.findByIdAndUpdate.mock.calls[0][1];
    expect(update).toEqual({ title: 'Nuovo titolo' });
    expect(Meal.findByIdAndUpdate.mock.calls[0][2]).toMatchObject({ runValidators: true });
  });
});

describe('SEC-07 deleteImage', () => {
  const ok = `https://storage.googleapis.com/${BUCKET}/meal-images/1700000000000_foto.jpg`;
  beforeEach(() => { mockDelete.mockClear(); mockFile.mockClear(); jest.spyOn(console, 'warn').mockImplementation(() => {}); jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  it('elimina un oggetto generato dal server (meal-images e profile-images)', async () => {
    expect(await deleteImage(ok)).toBe(true);
    expect(mockFile).toHaveBeenCalledWith('meal-images/1700000000000_foto.jpg');
    expect(await deleteImage(`https://storage.googleapis.com/${BUCKET}/profile-images/1700000000000_avatar_u_1_ab.jpg`)).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['altro bucket', 'https://storage.googleapis.com/altro-bucket/meal-images/1700000000000_foto.jpg'],
    ['altra cartella', `https://storage.googleapis.com/${BUCKET}/documenti/1700000000000_foto.jpg`],
    ['percorso nidificato', `https://storage.googleapis.com/${BUCKET}/meal-images/altro/1700000000000_foto.jpg`],
    ['traversal', `https://storage.googleapis.com/${BUCKET}/meal-images/../documenti/1700000000000_x.jpg`],
    ['traversal codificato', `https://storage.googleapis.com/${BUCKET}/meal-images/%2e%2e/1700000000000_x.jpg`],
    ['avatar di default', `https://storage.googleapis.com/${BUCKET}/profile-images/default-avatar.jpg`],
    ['nome senza timestamp', `https://storage.googleapis.com/${BUCKET}/meal-images/foto.jpg`],
    ['host diverso con il nome del bucket nel percorso', `https://evil.example/${BUCKET}/meal-images/1700000000000_foto.jpg`],
    ['host con il bucket come sottodominio', `https://storage.googleapis.com.evil.example/${BUCKET}/meal-images/1700000000000_foto.jpg`],
    ['http', `http://storage.googleapis.com/${BUCKET}/meal-images/1700000000000_foto.jpg`],
    ['query string', `${ok}?x=1`],
    ['non URL', 'meal-images/1700000000000_foto.jpg'],
    ['vuoto', ''],
    ['null', null],
  ])('rifiuta %s', async (_label, url) => {
    expect(await deleteImage(url)).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(extractManagedObjectPath(url, BUCKET)).toBeNull();
  });

  it('registra un avviso quando rifiuta', async () => {
    await deleteImage('https://storage.googleapis.com/altro-bucket/meal-images/1700000000000_foto.jpg');
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
