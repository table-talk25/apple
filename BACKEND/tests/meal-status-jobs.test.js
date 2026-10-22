jest.mock('node-cron', () => ({ schedule: jest.fn(() => ({ destroy: jest.fn() })) }));
jest.mock('../models/Meal', () => ({ find: jest.fn(), updateMany: jest.fn() }));
jest.mock('../utils/sendEmail', () => ({ sendHostMealReminderEmail: jest.fn(), sendMealReminderEmail: jest.fn() }));
const cron = require('node-cron');
const Meal = require('../models/Meal');
const email = require('../utils/sendEmail');
const start = require('../jobs/mealStatusUpdater');

describe('meal job lifecycle and reminder failures', () => {
  beforeEach(() => {
    start.stop();
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { start.stop(); jest.restoreAllMocks(); });

  it('does not schedule jobs on import', () => {
    expect(cron.schedule).not.toHaveBeenCalled();
  });
  it('starts both jobs only once and disables local overlap', () => {
    start(); start();
    expect(cron.schedule).toHaveBeenCalledTimes(2);
    for (const call of cron.schedule.mock.calls) expect(call[2].noOverlap).toBe(true);
  });
  it('destroys both jobs and permits an explicit restart', () => {
    start();
    const tasks = cron.schedule.mock.results.map(({ value }) => value);
    start.stop();
    tasks.forEach((task) => expect(task.destroy).toHaveBeenCalledTimes(1));
    start();
    expect(cron.schedule).toHaveBeenCalledTimes(4);
  });
  it('returns a failure when reminder lookup fails', async () => {
    Meal.find.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('db')) });
    await expect(start.sendMealReminders()).resolves.toMatchObject({ success: false });
  });
  it('does not email the host twice or fail on deleted participants', async () => {
    const host = { _id: 'host', email: 'host@example.invalid', settings: { notifications: { email: true } } };
    const guest = { _id: 'guest', email: 'guest@example.invalid', settings: { notifications: { email: true } } };
    Meal.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([{ _id: 'meal', host, participants: [host, null, guest, guest] }]) });
    await expect(start.sendMealReminders()).resolves.toMatchObject({ success: true });
    expect(email.sendHostMealReminderEmail).toHaveBeenCalledTimes(1);
    expect(email.sendMealReminderEmail).toHaveBeenCalledTimes(1);
  });
  it('closes a meal at its exact end, preserving the host-only cancellation rule', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T13:00:00Z'));
    try {
      const meal = { date: new Date('2026-01-01T12:00:00Z'), duration: 60, participants: ['host'], save: jest.fn().mockResolvedValue(undefined) };
      Meal.find.mockResolvedValue([meal]);
      await start.updateMealStatuses();
      expect(meal.status).toBe('cancelled');
      expect(meal.save).toHaveBeenCalledTimes(1);
    } finally { jest.useRealTimers(); }
  });
});
