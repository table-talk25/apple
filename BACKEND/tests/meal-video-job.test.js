jest.mock('node-cron', () => ({ schedule: jest.fn(() => ({ destroy: jest.fn() })) }));
jest.mock('../models/Meal', () => ({ find: jest.fn(), findOneAndUpdate: jest.fn() }));
jest.mock('../services/pushNotificationService', () => ({ sendPushNotification: jest.fn() }));
const cron = require('node-cron');
const Meal = require('../models/Meal');
const push = require('../services/pushNotificationService');
const job = require('../jobs/mealVideoActivationCron');

describe('meal video activation', () => {
  beforeEach(() => {
    job.stopMealVideoActivationCron(); jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { job.stopMealVideoActivationCron(); jest.restoreAllMocks(); });
  const candidates = (values) => Meal.find.mockReturnValue({ select: jest.fn().mockResolvedValue(values) });
  const claim = (value) => Meal.findOneAndUpdate.mockReturnValue({ populate: jest.fn().mockResolvedValue(value) });

  it('schedules only once with local overlap prevention', () => {
    job.scheduleMealVideoActivationCron(); job.scheduleMealVideoActivationCron();
    expect(cron.schedule).toHaveBeenCalledTimes(1);
    expect(cron.schedule.mock.calls[0][2].noOverlap).toBe(true);
  });
  it('queries only virtual, nonterminal, pending and unexpired meals', async () => {
    candidates([]);
    await job.activateMealVideos();
    const filter = Meal.find.mock.calls[0][0];
    expect(filter.mealType).toBe('virtual');
    expect(filter.status.$in).toEqual(['upcoming', 'ongoing']);
    expect(filter.videoCallStatus).toBe('pending');
    expect(filter.$expr.$gt).toBeDefined();
  });
  it('does not notify if another worker has already claimed activation', async () => {
    candidates([{ _id: 'm1' }]); claim(null);
    await job.activateMealVideos();
    expect(push.sendPushNotification).not.toHaveBeenCalled();
  });
  it('awaits push completion and tolerates missing participants', async () => {
    candidates([{ _id: 'm1' }]);
    claim({ _id: 'm1', title: 'Meal', participants: [null, { fcmTokens: ['a', 'a'] }, {}] });
    let complete;
    push.sendPushNotification.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    const running = job.activateMealVideos();
    await Promise.resolve(); await Promise.resolve();
    expect(push.sendPushNotification.mock.calls[0][0]).toEqual(['a']);
    complete();
    await expect(running).resolves.toMatchObject({ success: true, activated: 1 });
  });
  it('handles rejected push promises without an unhandled rejection', async () => {
    candidates([{ _id: 'm1' }]);
    claim({ _id: 'm1', title: 'Meal', participants: [{ fcmTokens: ['a'] }] });
    push.sendPushNotification.mockRejectedValue(new Error('FCM'));
    await expect(job.activateMealVideos()).resolves.toMatchObject({ success: false, activated: 1, failed: 1 });
  });
});
