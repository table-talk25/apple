const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/User');
const userController = require('../controllers/userController');

const SENSITIVE = [
  'password',
  'verificationToken',
  'verificationTokenExpires',
  'resetPasswordToken',
  'resetPasswordExpires',
  'fcmTokens',
  'registrationIp',
];

function buildUser(overrides = {}) {
  return new User({
    _id: new mongoose.Types.ObjectId(),
    name: 'Mario',
    surname: 'Rossi',
    email: 'mario@example.test',
    password: 'hash-segreto',
    nickname: 'mario',
    bio: 'Mi piace cucinare per gli altri',
    phone: '+390000000000',
    residence: 'Milano',
    dateOfBirth: new Date('1990-01-01'),
    location: { type: 'Point', coordinates: [9.19, 45.46], address: 'Milano, Italia' },
    verificationToken: 'hash-verifica',
    verificationTokenExpires: new Date(),
    resetPasswordToken: 'hash-reset',
    resetPasswordExpires: new Date(),
    fcmTokens: ['token-push-1'],
    registrationIp: '203.0.113.7',
    ...overrides,
  });
}

describe('SEC-02 serializzazione del modello User', () => {
  it('toJSON non contiene i campi sensibili', () => {
    const json = buildUser().toJSON();
    for (const field of SENSITIVE) expect(json).not.toHaveProperty(field);
    expect(json.nickname).toBe('mario');
  });

  it('toObject (come in GET /api/auth/me) non contiene i campi sensibili', () => {
    const obj = buildUser().toObject({ virtuals: true });
    for (const field of SENSITIVE) expect(obj).not.toHaveProperty(field);
    expect(obj.age).toBeGreaterThan(18);
  });

  it('il documento in memoria conserva i campi (i servizi interni continuano a leggerli)', () => {
    const user = buildUser();
    expect(user.fcmTokens).toEqual(['token-push-1']);
    expect(user.registrationIp).toBe('203.0.113.7');
  });
});

describe('SEC-02 GET /api/users/:id', () => {
  const target = buildUser();
  const app = (reqUser) => {
    const a = express();
    a.get('/api/users/:id', (req, res, next) => { req.user = reqUser; next(); }, userController.getUserById);
    return a;
  };

  beforeEach(() => {
    jest.spyOn(User, 'findById').mockResolvedValue(target);
  });
  afterEach(() => jest.restoreAllMocks());

  it('altro utente: solo proiezione pubblica', async () => {
    const res = await request(app({ id: 'ffffffffffffffffffffffff', role: 'user' })).get(`/api/users/${target.id}`);
    expect(res.status).toBe(200);
    for (const field of [...SENSITIVE, 'email', 'phone', 'dateOfBirth', 'location', 'residence', 'settings', 'blockedUsers', 'surname']) {
      expect(res.body).not.toHaveProperty(field);
    }
    expect(res.body.nickname).toBe('mario');
    expect(res.body.bio).toBeDefined();
  });

  it('se showAge è disattivato non espone l\'età', async () => {
    const hidden = buildUser({ settings: { privacy: { showAge: false } } });
    jest.spyOn(User, 'findById').mockResolvedValue(hidden);
    const res = await request(app({ id: 'ffffffffffffffffffffffff', role: 'user' })).get(`/api/users/${hidden.id}`);
    expect(res.body.age).toBeNull();
  });

  it('se stesso: vista completa ma senza hash, fcmTokens e registrationIp', async () => {
    const res = await request(app({ id: target.id, role: 'user' })).get(`/api/users/${target.id}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('mario@example.test');
    for (const field of SENSITIVE) expect(res.body).not.toHaveProperty(field);
  });

  it('admin: vista completa ma senza campi sensibili', async () => {
    const res = await request(app({ id: 'ffffffffffffffffffffffff', role: 'admin' })).get(`/api/users/${target.id}`);
    expect(res.body.email).toBe('mario@example.test');
    for (const field of SENSITIVE) expect(res.body).not.toHaveProperty(field);
  });

  it('utente inesistente: 404', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue(null);
    const res = await request(app({ id: 'ffffffffffffffffffffffff', role: 'user' })).get(`/api/users/${target.id}`);
    expect(res.status).toBe(404);
  });
});
