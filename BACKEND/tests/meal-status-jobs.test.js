jest.mock('node-cron', () => ({ schedule: jest.fn(() => ({ destroy: jest.fn() })) }));
jest.mock('../models/Meal', () => ({ find: jest.fn() }));
jest.mock('../services/mealStatusService', () => ({ syncAllMealStatuses: jest.fn() }));
jest.mock('../utils/sendEmail', () => ({ sendHostMealReminderEmail: jest.fn(), sendMealReminderEmail: jest.fn() }));
const cron = require('node-cron');
const Meal = require('../models/Meal');
const statusService = require('../services/mealStatusService');
const email = require('../utils/sendEmail');
const start = require('../jobs/mealStatusUpdater');

describe('meal job lifecycle and reminder failures', () => {
  beforeEach(() => { start.stop(); jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { start.stop(); jest.restoreAllMocks(); });
  it('does not schedule jobs on import', () => { expect(cron.schedule).not.toHaveBeenCalled(); });
  it('starts both jobs only once without overlap', () => {
    start(); start(); expect(cron.schedule).toHaveBeenCalledTimes(2);
    for (const call of cron.schedule.mock.calls) expect(call[2].noOverlap).toBe(true);
  });
  it('destroys both jobs and permits restart', () => {
    start(); const tasks = cron.schedule.mock.results.map(({ value }) => value); start.stop();
    tasks.forEach((task) => expect(task.destroy).toHaveBeenCalledTimes(1));
    start(); expect(cron.schedule).toHaveBeenCalledTimes(4);
  });
  it('reports reminder lookup failure', async () => {
    Meal.find.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('db')) });
    await expect(start.sendMealReminders()).resolves.toMatchObject({ success: false });
  });
  it('does not email the host twice and tolerates deleted participants', async () => {
    const host = { _id: 'host', email: 'host@example.invalid', settings: { notifications: { email: true } } };
    const guest = { _id: 'guest', email: 'guest@example.invalid', settings: { notifications: { email: true } } };
    Meal.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([{ _id: 'meal', host, participants: [host, null, guest, guest] }]) });
    await expect(start.sendMealReminders()).resolves.toMatchObject({ success: true });
    expect(email.sendHostMealReminderEmail).toHaveBeenCalledTimes(1); expect(email.sendMealReminderEmail).toHaveBeenCalledTimes(1);
  });
  it('delegates status transitions to the shared service', async () => {
    const result = { success: true, updated: 2, failed: 0 };
    statusService.syncAllMealStatuses.mockResolvedValue(result);
    await expect(start.updateMealStatuses()).resolves.toBe(result);
    expect(statusService.syncAllMealStatuses).toHaveBeenCalledTimes(1);
  });
  it('handles service rejection', async () => {
    statusService.syncAllMealStatuses.mockRejectedValue(new Error('db'));
    await expect(start.updateMealStatuses()).resolves.toMatchObject({ success: false });
  });
});
