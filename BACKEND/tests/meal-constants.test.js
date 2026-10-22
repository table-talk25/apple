describe('backend meal constants CommonJS compatibility', () => {
  it('loads through require and retains all existing exports', () => {
    const constants = require('../constants/mealConstants');
    for (const name of [
      'MEAL_TYPES', 'MEAL_TYPE_LABELS', 'MEAL_TYPE_COLORS', 'mealTypeOptions',
      'MEAL_ICONS', 'MEAL_STATUS', 'MEAL_STATUS_LABELS',
      'MEAL_CONSTRAINTS', 'MEAL_ERROR_MESSAGES',
    ]) {
      expect(constants).toHaveProperty(name);
    }
    expect(constants.MEAL_TYPES.APERITIVO).toBe('aperitif');
    expect(constants.MEAL_STATUS.CANCELLED).toBe('cancelled');
    expect(constants.mealTypeOptions).toHaveLength(5);
  });

  it('exports an icon for every supported meal type', () => {
    const { MEAL_TYPES, MEAL_ICONS } = require('../constants/mealConstants');
    expect(Object.keys(MEAL_ICONS).sort()).toEqual(Object.values(MEAL_TYPES).sort());
    for (const type of Object.values(MEAL_TYPES)) {
      expect(typeof MEAL_ICONS[type]).toBe('string');
      expect(MEAL_ICONS[type].length).toBeGreaterThan(0);
    }
  });
});
