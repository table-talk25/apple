const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

const { resolveInside, safeUnlinkInside } = require('../utils/safeFile');
const User = require('../models/User');
const userController = require('../controllers/userController');

describe('SEC-04 utils/safeFile', () => {
  let base;
  let outside;
  beforeEach(() => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sec04-'));
    base = path.join(root, 'uploads', 'profile-images');
    fs.mkdirSync(base, { recursive: true });
    outside = path.join(root, 'server.js');
    fs.writeFileSync(outside, 'non cancellare');
    fs.writeFileSync(path.join(base, 'avatar.jpg'), 'ok');
  });

  it.each([
    '../../server.js',
    '../server.js',
    '..',
    '.',
    'a/../../server.js',
    '/etc/passwd',
    'sub/avatar.jpg',
    '..\\..\\server.js',
    'avatar.jpg\0.png',
    '',
    null,
    undefined,
    { toString: () => 'avatar.jpg' },
  ])('rifiuta %p', (name) => {
    expect(resolveInside(base, name)).toBeNull();
  });

  it('non tratta come file locali gli URL', () => {
    const warn = jest.fn();
    expect(resolveInside(base, 'https://storage.googleapis.com/b/profile-images/x.jpg')).toBeNull();
    expect(safeUnlinkInside(base, 'https://storage.googleapis.com/b/profile-images/x.jpg', warn)).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('un percorso con ../ non cancella nulla e registra un avviso', () => {
    const warn = jest.fn();
    expect(safeUnlinkInside(base, '../../server.js', warn)).toBe(false);
    expect(fs.existsSync(outside)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('un nome semplice dentro la cartella viene cancellato', () => {
    expect(safeUnlinkInside(base, 'avatar.jpg')).toBe(true);
    expect(fs.existsSync(path.join(base, 'avatar.jpg'))).toBe(false);
  });

  it('file inesistente: false senza errori', () => {
    expect(safeUnlinkInside(base, 'non-esiste.jpg', jest.fn())).toBe(false);
  });

  it('non segue un link simbolico verso fuori cartella', () => {
    const link = path.join(base, 'link.jpg');
    try { fs.symlinkSync(outside, link); } catch (_) { return; } // symlink non disponibile: salta
    expect(safeUnlinkInside(base, 'link.jpg', jest.fn())).toBe(false);
    expect(fs.existsSync(outside)).toBe(true);
  });
});

describe('SEC-04 profileImage non modificabile dal client', () => {
  it('User.updateProfile ignora profileImage ma accetta gli altri campi', async () => {
    const user = new User({
      _id: new mongoose.Types.ObjectId(), name: 'A', surname: 'B', email: 'a@example.test',
      dateOfBirth: new Date('1990-01-01'),
    });
    const original = user.profileImage;
    user.save = jest.fn().mockResolvedValue(user);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await user.updateProfile({ profileImage: '../../server.js', bio: 'Nuova biografia lunga' });
    console.log.mockRestore();
    expect(user.profileImage).toBe(original);
    expect(user.bio).toBe('Nuova biografia lunga');
  });
});

describe('SEC-04 PUT /api/users/me/avatar con profileImage malevolo già salvato', () => {
  afterEach(() => jest.restoreAllMocks());

  it('non elimina nessun file fuori da uploads/profile-images', async () => {
    const evil = new User({
      _id: new mongoose.Types.ObjectId(), name: 'A', surname: 'B', email: 'e@example.test',
      dateOfBirth: new Date('1990-01-01'), profileImage: '../../server.js',
    });
    evil.save = jest.fn().mockResolvedValue(evil);
    jest.spyOn(User, 'findById').mockResolvedValue(evil);
    const unlink = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const app = express();
    app.put('/api/users/me/avatar', (req, res, next) => {
      req.user = { id: evil.id };
      req.file = { filename: 'profilePicture-nuovo.jpg' };
      next();
    }, userController.updateAvatar);

    const res = await request(app).put('/api/users/me/avatar');
    expect(res.status).toBe(200);
    expect(unlink).not.toHaveBeenCalled();
    expect(evil.profileImage).toBe('profilePicture-nuovo.jpg');
  });
});
