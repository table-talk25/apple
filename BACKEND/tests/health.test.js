const request = require('supertest');
const { createApp } = require('../app');

describe('GET /health', () => {
  it('restituisce stato ok', async () => {
    const { app } = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body.environment).toBe('test');
  });
});
