jest.mock('../models/Meal', () => ({ find: jest.fn() }));
jest.mock('../models/MealReminderDelivery', () => ({ create: jest.fn(), updateOne: jest.fn() }));
jest.mock('../utils/sendEmail', () => ({ sendEmail: jest.fn() }));
const Meal = require('../models/Meal');
const Delivery = require('../models/MealReminderDelivery');
const email = require('../utils/sendEmail');
const service = require('../services/mealEmailReminderService');
const host = { _id: 'host', email: 'host@example.invalid', settings: { notifications: { email: true } } };
const guest = { _id: 'guest', email: 'guest@example.invalid', settings: { notifications: { email: true } } };
const meal = { _id: 'meal', date: new Date('2027-01-01T12:00:00Z'), title: 'Meal', host, participants: [host, null, guest, guest] };

describe('persistent meal reminder attempts', () => {
  let original;
  beforeEach(() => {
    jest.resetAllMocks();
    original = process.env.FRONTEND_URL; process.env.FRONTEND_URL = 'https://example.invalid';
    jest.spyOn(console, 'error').mockImplementation(() => {});
    Meal.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([meal]) });
    Delivery.create.mockResolvedValue({}); Delivery.updateOne.mockResolvedValue({ matchedCount: 1 });
    email.sendEmail.mockImplementation(async ({ to }) => ({ accepted: [to] }));
  });
  afterEach(() => {
    if (original === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = original;
    jest.restoreAllMocks();
  });
  it('deduplicates host and guest recipients within a pass', async () => {
    await expect(service.sendRemindersForWindow(10, 15)).resolves.toMatchObject({ success: true, accepted: 2 });
    expect(email.sendEmail).toHaveBeenCalledTimes(2); expect(Delivery.create).toHaveBeenCalledTimes(2);
    expect(email.sendEmail.mock.calls[0][0].subject).toContain('10–15 minuti');
  });
  it('skips explicit email opt-outs in the one-hour job too', async () => {
    Meal.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([{ ...meal, host: { ...host, settings: { notifications: { email: false } } }, participants: [] }]) });
    await expect(service.sendRemindersForWindow(60, 70)).resolves.toMatchObject({ accepted: 0, skipped: 1 });
    expect(Delivery.create).not.toHaveBeenCalled(); expect(email.sendEmail).not.toHaveBeenCalled();
  });
  it('does not send again when the unique attempt key already exists', async () => {
    Delivery.create.mockRejectedValue({ code: 11000 });
    await expect(service.sendRemindersForWindow(10, 15)).resolves.toMatchObject({ success: true, accepted: 0, skipped: 2 });
    expect(email.sendEmail).not.toHaveBeenCalled();
  });
  it('never sends when the database cannot claim the attempt', async () => {
    Delivery.create.mockRejectedValue(new Error('db'));
    await expect(service.sendRemindersForWindow(10, 15)).resolves.toMatchObject({ success: false, failed: 2 });
    expect(email.sendEmail).not.toHaveBeenCalled();
  });
  it('records SMTP exceptions as uncertain without enabling retries', async () => {
    email.sendEmail.mockRejectedValue(new Error('smtp'));
    await expect(service.sendRemindersForWindow(10, 15)).resolves.toMatchObject({ success: false, failed: 2 });
    expect(Delivery.updateOne.mock.calls[0][1].$set.state).toBe('uncertain');
  });
  it('does not treat a resolved response without acceptance as success', async () => {
    email.sendEmail.mockResolvedValue({ accepted: [], rejected: [host.email] });
    await expect(service.sendRemindersForWindow(10, 15)).resolves.toMatchObject({ success: false, accepted: 0 });
  });
  it('reports lookup failures', async () => {
    Meal.find.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('db')) });
    await expect(service.sendRemindersForWindow(10, 15)).resolves.toMatchObject({ success: false });
  });
  it('uses distinct keys for rescheduled meals and different windows', () => {
    const key = service.deliveryKey(meal, guest._id, 10);
    expect(key).not.toBe(service.deliveryKey(meal, guest._id, 60));
    expect(key).not.toBe(service.deliveryKey({ ...meal, date: new Date('2027-01-02T12:00:00Z') }, guest._id, 10));
  });
});
