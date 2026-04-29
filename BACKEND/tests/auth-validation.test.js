const request = require('supertest');
const { createApp } = require('../app');

describe('POST /api/auth/login', () => {
  it('rifiuta email non valida con 400', async () => {
    const { app } = createApp();
    const res = await request(app).post('/api/auth/login').send({
      email: 'non-una-email',
      password: 'qualcosa',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});
