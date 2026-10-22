jest.mock('node-cron', () => ({ schedule: jest.fn(() => ({ destroy: jest.fn() })) }));
jest.mock('../models/Meal', () => ({ find: jest.fn(), findOneAndUpdate: jest.fn() }));
jest.mock('../services/videoNotificationService', () => ({ queueActivationEvent: jest.fn(), processVideoNotificationEvents: jest.fn() }));
const cron = require('node-cron');
const Meal = require('../models/Meal');
const notifications = require('../services/videoNotificationService');
const job = require('../jobs/mealVideoActivationCron');

describe('video activation with durable notification intent', () => {
  beforeEach(() => {
    job.stopMealVideoActivationCron(); jest.resetAllMocks();
    cron.schedule.mockImplementation(() => ({ destroy: jest.fn() }));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    Meal.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    notifications.queueActivationEvent.mockResolvedValue({});
    notifications.processVideoNotificationEvents.mockResolvedValue({ success: true, failed: 0 });
  });
  afterEach(() => { job.stopMealVideoActivationCron(); jest.restoreAllMocks(); });
  it('schedules only once without local overlap', () => {
    job.scheduleMealVideoActivationCron(); job.scheduleMealVideoActivationCron();
    expect(cron.schedule).toHaveBeenCalledTimes(1); expect(cron.schedule.mock.calls[0][2].noOverlap).toBe(true);
  });
  it('keeps virtual and unexpired eligibility guards', async () => {
    await job.activateMealVideos();
    expect(Meal.find.mock.calls[0][0]).toMatchObject({ mealType: 'virtual', videoCallStatus: 'pending', status: { $in: ['upcoming', 'ongoing'] } });
    expect(Meal.find.mock.calls[0][0].$expr.$gt).toBeDefined();
  });
  it('processes outstanding notifications without new activations', async () => {
    await job.activateMealVideos(); expect(notifications.processVideoNotificationEvents).toHaveBeenCalledTimes(1);
  });
  it('persists intent before activation and guards the observed schedule', async () => {
    const candidate = { _id: 'meal', date: new Date(), duration: 60 };
    Meal.find.mockReturnValue({ select: jest.fn().mockResolvedValue([candidate]) });
    Meal.findOneAndUpdate.mockResolvedValue(candidate);
    await expect(job.activateMealVideos()).resolves.toMatchObject({ activated: 1, success: true });
    expect(notifications.queueActivationEvent.mock.invocationCallOrder[0]).toBeLessThan(Meal.findOneAndUpdate.mock.invocationCallOrder[0]);
    expect(Meal.findOneAndUpdate.mock.calls[0][0]).toMatchObject({ date: candidate.date, duration: 60 });
  });
  it('does not activate when intent cannot be persisted', async () => {
    Meal.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'meal' }]) });
    notifications.queueActivationEvent.mockRejectedValue(new Error('db'));
    await expect(job.activateMealVideos()).resolves.toMatchObject({ success: false });
    expect(Meal.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('surfaces retry or delivery failures', async () => {
    notifications.processVideoNotificationEvents.mockResolvedValue({ success: false, failed: 0, retry: 1 });
    await expect(job.activateMealVideos()).resolves.toMatchObject({ success: false });
  });
});
