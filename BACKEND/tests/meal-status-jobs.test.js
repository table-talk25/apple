jest.mock('node-cron', () => ({ schedule: jest.fn(() => ({ destroy: jest.fn() })) }));
jest.mock('../services/mealStatusService', () => ({ syncAllMealStatuses: jest.fn() }));
jest.mock('../services/mealEmailReminderService', () => ({ sendRemindersForWindow: jest.fn() }));
const cron = require('node-cron');
const status = require('../services/mealStatusService');
const reminders = require('../services/mealEmailReminderService');
const start = require('../jobs/mealStatusUpdater');
const hourly = require('../utils/cronJobs');

describe('meal scheduler delegation and lifecycle', () => {
  beforeEach(() => { start.stop(); hourly.stop(); jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { start.stop(); hourly.stop(); jest.restoreAllMocks(); });
  it('does not schedule on import', () => expect(cron.schedule).not.toHaveBeenCalled());
  it('starts each scheduler only once with no local overlap', () => {
    start(); start(); hourly(); hourly();
    expect(cron.schedule).toHaveBeenCalledTimes(3);
    for (const call of cron.schedule.mock.calls) expect(call[2].noOverlap).toBe(true);
  });
  it('destroys all tasks and permits explicit restart', () => {
    start(); hourly(); const tasks = cron.schedule.mock.results.map(({ value }) => value);
    start.stop(); hourly.stop(); tasks.forEach((task) => expect(task.destroy).toHaveBeenCalledTimes(1));
    start(); hourly(); expect(cron.schedule).toHaveBeenCalledTimes(6);
  });
  it('delegates both reminder windows to the same persistent service', async () => {
    reminders.sendRemindersForWindow.mockResolvedValue({ success: true });
    await start.sendMealReminders(); await hourly.sendOneHourReminders();
    expect(reminders.sendRemindersForWindow.mock.calls).toEqual([[10, 15], [60, 70]]);
  });
  it('delegates state updates and handles service rejection', async () => {
    status.syncAllMealStatuses.mockResolvedValueOnce({ success: true });
    await expect(start.updateMealStatuses()).resolves.toEqual({ success: true });
    status.syncAllMealStatuses.mockRejectedValueOnce(new Error('db'));
    await expect(start.updateMealStatuses()).resolves.toMatchObject({ success: false });
  });
});
