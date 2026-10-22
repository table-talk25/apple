jest.mock('../bootstrap/firebaseAdmin', () => ({ apps: [{}], messaging: jest.fn(), app: jest.fn() }));
jest.mock('../services/notificationPreferencesService', () => ({ canReceiveNotification: jest.fn() }));
jest.mock('../models/User', () => ({ findById: jest.fn() }));
const admin = require('../bootstrap/firebaseAdmin');
const preferences = require('../services/notificationPreferencesService');
const User = require('../models/User');
const service = require('../services/pushNotificationService');

describe('Firebase push notifications', () => {
  let send;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    send = jest.fn(async ({ tokens }) => ({ responses: tokens.map(() => ({ success: true })), successCount: tokens.length, failureCount: 0 }));
    admin.messaging.mockReturnValue({ sendEachForMulticast: send });
  });
  afterEach(() => jest.restoreAllMocks());

  it('uses the supported API and removes duplicate and empty tokens', async () => {
    const result = await service.sendPushNotification(['a', 'a', '', null, 'b'], 'Title', 'Body');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].tokens).toEqual(['a', 'b']);
    expect(result.successCount).toBe(2);
  });
  it('does not contact Firebase for empty recipients', async () => {
    await service.sendPushNotification([], 'Title', 'Body');
    expect(admin.messaging).not.toHaveBeenCalled();
  });
  it('splits 501 recipients into batches of at most 500', async () => {
    const tokens = Array.from({ length: 501 }, (_, index) => `token-${index}`);
    const result = await service.sendPushNotification(tokens, 'Title', 'Body');
    expect(send.mock.calls.map(([message]) => message.tokens.length)).toEqual([500, 1]);
    expect(result.responses).toHaveLength(501);
    expect(result.successCount).toBe(501);
  });
  it('serializes data and uses SDK notification field names', async () => {
    const actions = [{ action: 'join', title: 'Join' }];
    await service.sendPushNotification(['a'], 'Title', 'Body', { count: 2, enabled: true, actions, absent: null });
    const message = send.mock.calls[0][0];
    expect(message.data.count).toBe('2');
    expect(message.data.enabled).toBe('true');
    expect(message.data.actions).toBe(JSON.stringify(actions));
    expect(message.data).not.toHaveProperty('absent');
    expect(message.android.notification.channelId).toBe('tabletalk-interactive');
    expect(message.android.notification).not.toHaveProperty('channel_id');
    expect(message.android.notification).not.toHaveProperty('actions');
    expect(message.android.notification.clickAction).toBe('FLUTTER_NOTIFICATION_CLICK');
    expect(message.apns.fcmOptions.imageUrl).toBeTruthy();
    expect(message.apns.payload.aps.mutableContent).toBe(true);
  });
  it('keeps partial delivery failures in the batch result', async () => {
    send.mockResolvedValue({ responses: [{ success: true }, { success: false }], successCount: 1, failureCount: 1 });
    const result = await service.sendPushNotification(['a', 'b'], 'Title', 'Body');
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
  });
  it('respects disabled user notification preferences', async () => {
    preferences.canReceiveNotification.mockResolvedValue(false);
    const result = await service.sendPushNotificationWithPreferences('u1', 'Title', 'Body');
    expect(result.skipped).toBe(true);
    expect(User.findById).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it('does not report success when every FCM delivery fails', async () => {
    preferences.canReceiveNotification.mockResolvedValue(true);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ fcmTokens: ['a'] }) });
    send.mockResolvedValue({ responses: [{ success: false }], successCount: 0, failureCount: 1 });
    const result = await service.sendPushNotificationWithPreferences('u1', 'Title', 'Body');
    expect(result.success).toBe(false);
  });
  it('propagates SDK failures without logging their message', async () => {
    const failure = new Error('secret-token-123');
    send.mockRejectedValue(failure);
    await expect(service.sendPushNotification(['a'], 'Title', 'Body')).rejects.toBe(failure);
    expect(JSON.stringify(console.error.mock.calls)).not.toContain('secret-token-123');
  });
});
