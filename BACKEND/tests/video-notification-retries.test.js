jest.mock('../models/Meal', () => ({ findOne: jest.fn() }));
jest.mock('../models/VideoNotification', () => ({ Event: { create: jest.fn(), find: jest.fn() }, Delivery: { updateMany: jest.fn(), updateOne: jest.fn(), findOneAndUpdate: jest.fn() } }));
jest.mock('../models/User', () => ({ updateOne: jest.fn() }));
jest.mock('../services/pushNotificationService', () => ({ sendPushNotification: jest.fn() }));
const crypto = require('crypto');
const Meal = require('../models/Meal');
const User = require('../models/User');
const { Event, Delivery } = require('../models/VideoNotification');
const push = require('../services/pushNotificationService');
const service = require('../services/videoNotificationService');
const date = new Date('2027-01-01T12:00:00Z');
const event = { _id: 'event', meal: 'meal', scheduledAt: date, expiresAt: new Date('2027-01-01T13:00:00Z') };
const user = { _id: 'user', fcmTokens: ['token-a'], settings: { notifications: { push: true } } };
const meal = { _id: 'meal', title: 'Meal', host: user, participants: [user] };

describe('persistent video notification retries', () => {
  beforeEach(() => {
    jest.resetAllMocks(); jest.useFakeTimers().setSystemTime(date);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    Event.create.mockResolvedValue({}); Event.find.mockResolvedValue([event]);
    Delivery.updateMany.mockResolvedValue({}); Delivery.updateOne.mockResolvedValue({ matchedCount: 1 });
    Meal.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(meal) });
    Delivery.findOneAndUpdate.mockImplementation(async (filter, update) => ({
      _id: filter._id, recipient: 'user', tokenHash: crypto.createHash('sha256').update('token-a').digest('hex'), attempts: 1, leaseId: update.$set.leaseId,
    }));
    push.sendPushNotification.mockResolvedValue({ responses: [{ success: true }], successCount: 1, failureCount: 0 });
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
  const outcomes = () => Delivery.updateOne.mock.calls.filter(([filter]) => filter.state === 'processing').map(([, update]) => update.$set);
  it('uses a deterministic event key and tolerates an existing event', async () => {
    Event.create.mockRejectedValue({ code: 11000 });
    const a = await service.queueActivationEvent({ _id: 'meal', date, duration: 60 });
    const b = await service.queueActivationEvent({ _id: 'meal', date, duration: 60 });
    expect(a._id).toBe(b._id); expect(a.expiresAt).toEqual(event.expiresAt);
  });
  it('records provider acceptance with a lease guard and no raw token in the ledger', async () => {
    await expect(service.processVideoNotificationEvents()).resolves.toMatchObject({ success: true, accepted: 1 });
    expect(outcomes()[0].state).toBe('accepted');
    expect(Delivery.updateOne.mock.calls.find(([filter]) => filter.state === 'processing')[0].leaseId).toBeTruthy();
    expect(JSON.stringify(Delivery.updateOne.mock.calls)).not.toContain('token-a');
    expect(push.sendPushNotification.mock.calls[0][3].notificationId).toBeTruthy();
  });
  it('does not resend already accepted or concurrently claimed deliveries', async () => {
    Delivery.findOneAndUpdate.mockResolvedValue(null);
    await service.processVideoNotificationEvents(); expect(push.sendPushNotification).not.toHaveBeenCalled();
    const filter = Delivery.findOneAndUpdate.mock.calls[0][0];
    expect(filter.attempts.$lt).toBe(5); expect(filter.$or[0].state.$in).toEqual(['pending', 'retry']);
  });
  it('schedules a transient failure after at least one minute', async () => {
    push.sendPushNotification.mockResolvedValue({ responses: [{ success: false, error: { code: 'messaging/server-unavailable' } }] });
    await expect(service.processVideoNotificationEvents()).resolves.toMatchObject({ success: false, retry: 1 });
    expect(outcomes()[0].state).toBe('retry');
    expect(outcomes()[0].nextAttemptAt.getTime()).toBeGreaterThanOrEqual(date.getTime() + 60000);
  });
  it('honors an exposed Retry-After interval', async () => {
    push.sendPushNotification.mockRejectedValue({ code: 'messaging/server-unavailable', response: { headers: { 'retry-after': '600' } } });
    await service.processVideoNotificationEvents();
    expect(outcomes()[0].nextAttemptAt.getTime()).toBeGreaterThanOrEqual(date.getTime() + 600000);
  });
  it('removes only explicitly invalid tokens', async () => {
    push.sendPushNotification.mockResolvedValue({ responses: [{ success: false, error: { code: 'messaging/registration-token-not-registered' } }] });
    await expect(service.processVideoNotificationEvents()).resolves.toMatchObject({ permanent: 1 });
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'user' }, { $pull: { fcmTokens: 'token-a' } });
  });
  it('does not delete a token for a generic payload error', async () => {
    push.sendPushNotification.mockResolvedValue({ responses: [{ success: false, error: { code: 'messaging/invalid-argument' } }] });
    await expect(service.processVideoNotificationEvents()).resolves.toMatchObject({ permanent: 1 });
    expect(User.updateOne).not.toHaveBeenCalled();
  });
  it('skips if the meal becomes ineligible after claiming', async () => {
    Meal.findOne.mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(meal) }).mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(null) });
    await expect(service.processVideoNotificationEvents()).resolves.toMatchObject({ skipped: 1 });
    expect(push.sendPushNotification).not.toHaveBeenCalled();
  });
  it('does not enqueue users who disabled push', async () => {
    const disabled = { ...user, settings: { notifications: { push: false } } };
    Meal.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue({ ...meal, host: disabled, participants: [disabled] }) });
    await service.processVideoNotificationEvents();
    expect(Delivery.findOneAndUpdate).not.toHaveBeenCalled(); expect(push.sendPushNotification).not.toHaveBeenCalled();
  });
  it('does not send beyond event expiry', async () => {
    jest.setSystemTime(event.expiresAt);
    await service.processVideoNotificationEvents();
    expect(push.sendPushNotification).not.toHaveBeenCalled();
  });
});
