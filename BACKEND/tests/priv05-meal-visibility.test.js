const ME = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const BLOCKED = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const BLOCKER = 'cccccccccccccccccccccccc';

jest.mock('../models/User', () => ({
  findById: jest.fn(() => ({ select: () => Promise.resolve({ blockedUsers: ['bbbbbbbbbbbbbbbbbbbbbbbb'] }) })),
  find: jest.fn(() => ({ select: () => Promise.resolve([{ _id: 'cccccccccccccccccccccccc' }]) })),
}));
jest.mock('../models/Meal', () => ({ find: jest.fn() }));
jest.mock('../models/UserPreference', () => ({}));
jest.mock('../services/aiRecommendationService', () => ({ getPersonalizedRecommendations: jest.fn() }));

const Meal = require('../models/Meal');
const mealService = require('../services/mealService');

const chain = () => {
  const c = { select: () => c, populate: () => c, lean: () => c, exec: () => Promise.resolve([]) };
  return c;
};
const COORDS = { latitude: 41.9, longitude: 12.5 };

describe('PRIV-05 mealService.getMealsForMap', () => {
  beforeEach(() => { jest.clearAllMocks(); Meal.find.mockImplementation(() => chain()); });

  it('senza utente: solo pasti pubblici', async () => {
    await mealService.getMealsForMap(COORDS, 10, { mealType: 'physical' });
    const query = Meal.find.mock.calls[0][0];
    expect(query.isPublic).toBe(true);
    expect(query.$or).toBeUndefined();
  });

  it('con utente: pubblici + dove è host/partecipante, bloccati esclusi in entrambe le direzioni', async () => {
    await mealService.getMealsForMap(COORDS, 10, { userId: ME });
    const query = Meal.find.mock.calls[0][0];
    expect(query.isPublic).toBeUndefined();
    expect(query.$or).toEqual([{ isPublic: true }, { host: ME }, { participants: ME }]);
    expect(query.host.$nin.map(String)).toEqual([BLOCKED, BLOCKER]);
  });
});

describe('PRIV-05 /api/ai/recommendations passa l\'utente al servizio', () => {
  it('getPersonalizedRecommendations invoca getMealsForMap con userId = req.user.id', async () => {
    const spy = jest.spyOn(mealService, 'getMealsForMap').mockResolvedValue({ data: [] });
    const controller = require('../controllers/aiRecommendationController');
    const req = { user: { id: ME, location: { coordinates: [12.5, 41.9] } }, query: {}, body: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await controller.getPersonalizedRecommendations(req, res, jest.fn());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][2]).toMatchObject({ userId: ME, mealType: 'physical' });
  });
});
