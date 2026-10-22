const { calculateMealStatus } = require('../utils/mealLifecycle');
const Meal = require('../models/Meal');
const host = '000000000000000000000001';
const guest = '000000000000000000000002';
const base = { date: new Date('2026-01-01T12:00:00Z'), duration: 60, status: 'upcoming', host, participants: [host, guest] };

describe('shared meal lifecycle', () => {
  it.each([
    ['2026-01-01T11:59:59Z', 'upcoming'],
    ['2026-01-01T12:00:00Z', 'ongoing'],
    ['2026-01-01T12:59:59Z', 'ongoing'],
    ['2026-01-01T13:00:00Z', 'completed'],
  ])('calculates %s as %s', (now, expected) => { expect(calculateMealStatus(base, new Date(now))).toBe(expected); });
  it('cancels a host-only meal at its exact end', () => {
    expect(calculateMealStatus({ ...base, participants: [host, host] }, new Date('2026-01-01T13:00:00Z'))).toBe('cancelled');
  });
  it.each(['completed', 'cancelled'])('preserves terminal %s even before the scheduled start', (status) => {
    expect(calculateMealStatus({ ...base, status }, new Date('2025-12-01T00:00:00Z'))).toBe(status);
  });
  it('does not infer cancellation from an omitted participants projection', () => {
    expect(() => calculateMealStatus({ ...base, participants: undefined }, new Date('2026-01-01T13:00:00Z'))).toThrow();
  });
  it('rejects invalid time data', () => { expect(() => calculateMealStatus({ ...base, date: 'invalid' })).toThrow(); });
});

describe('Mongoose model lifecycle integration without database', () => {
  beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date('2026-01-01T13:00:00Z')); });
  afterEach(() => jest.useRealTimers());
  it('has consistent virtuals at exact completion', () => {
    const meal = new Meal(base);
    expect(meal.virtualStatus).toBe('completed'); expect(meal.isActive).toBe(false);
    expect(meal.timeRemaining).toBe(0); expect(meal.statusInfo.status).toBe('completed'); expect(meal.nextStatusUpdate).toBeNull();
  });
  it('synchronizes a host-only cancellation using a permitted notification type', () => {
    const meal = new Meal({ ...base, participants: [host] });
    meal.syncStatus();
    expect(meal.status).toBe('cancelled'); expect(meal.videoCallStatus).toBe('ended');
    expect(meal.notifications[0].type).toBe('update');
    const count = meal.notifications.length; meal.syncStatus(); expect(meal.notifications).toHaveLength(count);
  });
  it('does not reopen completed meals with future dates', () => {
    const meal = new Meal({ ...base, status: 'completed', date: new Date('2027-01-01T12:00:00Z') });
    expect(meal.virtualStatus).toBe('completed'); expect(meal.isActive).toBe(false);
    expect(meal.timeRemaining).toBe(0); expect(meal.nextStatusUpdate).toBeNull();
    meal.syncStatus(); expect(meal.status).toBe('completed');
  });
});
