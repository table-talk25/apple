const request = require('supertest');
const express = require('express');

jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => { req.user = { id: 'u1', role: global.__role || 'user' }; next(); },
  authorize: (...roles) => (req, res, next) =>
    (roles.includes(req.user.role) ? next() : res.status(403).json({ success: false })),
}));
jest.mock('../services/pushNotificationService', () => ({
  sendPushNotification: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  sendChatNotification: jest.fn().mockResolvedValue({}),
  sendInvitationNotification: jest.fn().mockResolvedValue({}),
  sendInvitationAcceptedNotification: jest.fn(),
  sendMealReminderNotification: jest.fn().mockResolvedValue({}),
  sendMealUpdateNotification: jest.fn(),
  getFirebaseStatus: jest.fn().mockReturnValue({ configured: true }),
}));
jest.mock('../controllers/notificationsController', () => ({
  getMyNotifications: jest.fn(), markNotificationsAsRead: jest.fn(),
}));

const push = require('../services/pushNotificationService');

const app = express();
app.use(express.json());
app.use('/api/notifications', require('../routes/notifications'));

const BODIES = {
  '/api/notifications/send-chat': { tokens: ['t'], senderName: 'x', message: 'm', chatId: 'c' },
  '/api/notifications/send-invitation': { tokens: ['t'], inviterName: 'x', mealTitle: 'm' },
  '/api/notifications/send-meal-reminder': { tokens: ['t'], mealTitle: 'm', mealTime: '1h' },
};

describe('SEC-05 rotte di invio notifiche riservate agli admin', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(Object.keys(BODIES))('utente normale su %s: 403 e nessun invio', async (url) => {
    global.__role = 'user';
    const res = await request(app).post(url).send(BODIES[url]);
    expect(res.status).toBe(403);
    expect(push.sendChatNotification).not.toHaveBeenCalled();
    expect(push.sendInvitationNotification).not.toHaveBeenCalled();
    expect(push.sendMealReminderNotification).not.toHaveBeenCalled();
  });

  it.each(Object.keys(BODIES))('admin su %s: 200', async (url) => {
    global.__role = 'admin';
    const res = await request(app).post(url).send(BODIES[url]);
    expect(res.status).toBe(200);
  });
});
