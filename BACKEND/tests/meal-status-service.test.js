jest.mock('../models/Meal', () => ({ find: jest.fn(), findById: jest.fn(), findOneAndUpdate: jest.fn(), aggregate: jest.fn() }));
const Meal = require('../models/Meal');
const service = require('../services/mealStatusService');
const host = 'host';
const meal = { _id: 'meal', date: new Date('2026-01-01T12:00:00Z'), duration: 60, status: 'ongoing', host, participants: [host] };

describe('meal status synchronization', () => {
  beforeEach(() => {
    jest.resetAllMocks(); jest.useFakeTimers().setSystemTime(new Date('2026-01-01T13:00:00Z'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
  const found = (items) => Meal.find.mockReturnValue({ select: jest.fn().mockResolvedValue(items) });
  it('queries only nonterminal meals and applies the shared host-only rule', async () => {
    found([meal]); Meal.findOneAndUpdate.mockResolvedValue({ ...meal, status: 'cancelled' });
    await expect(service.syncAllMealStatuses()).resolves.toMatchObject({ success: true, updated: 1, failed: 0 });
    expect(Meal.find.mock.calls[0][0]).toEqual({ status: { $in: ['upcoming', 'ongoing'] } });
    const [filter, update] = Meal.findOneAndUpdate.mock.calls[0];
    expect(filter).toMatchObject({ status: 'ongoing', date: meal.date, duration: 60, participants: [host] });
    expect(update.$set).toEqual({ status: 'cancelled', videoCallStatus: 'ended' });
  });
  it('reports partial update failure and fails initialization', async () => {
    found([meal]); Meal.findOneAndUpdate.mockRejectedValue(new Error('db'));
    await expect(service.syncAllMealStatuses()).resolves.toMatchObject({ success: false, failed: 1 });
    await expect(service.initializeStatusService()).resolves.toMatchObject({ success: false, initialSync: { success: false } });
  });
  it('does not count a concurrent update as a successful write', async () => {
    found([meal]); Meal.findOneAndUpdate.mockResolvedValue(null);
    await expect(service.syncAllMealStatuses()).resolves.toMatchObject({ success: false, updated: 0, failed: 1 });
  });
  it('preserves terminal states in single-meal synchronization', async () => {
    Meal.findById.mockResolvedValue({ ...meal, status: 'completed' });
    await expect(service.syncMealStatus('meal')).resolves.toMatchObject({ success: true, status: 'completed' });
    expect(Meal.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('reports a failed lookup without claiming a successful startup', async () => {
    Meal.find.mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('db')) });
    await expect(service.initializeStatusService()).resolves.toMatchObject({ success: false });
  });
  it('counts virtual cancelled and completed meals separately', async () => {
    found([meal, { ...meal, _id: 'other', status: 'completed' }]);
    Meal.aggregate.mockResolvedValue([{ _id: 'ongoing', count: 1 }, { _id: 'completed', count: 1 }]);
    await expect(service.getMealStatusStats()).resolves.toMatchObject({ success: true, virtual: { cancelled: 1, completed: 1, ongoing: 0, upcoming: 0 } });
  });
});
