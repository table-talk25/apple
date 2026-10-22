const { buildMealReminder } = require('../utils/mealReminderContent');

describe('meal reminder content', () => {
  let original;
  beforeEach(() => { original = process.env.FRONTEND_URL; process.env.FRONTEND_URL = 'https://example.invalid/app/'; });
  afterEach(() => { if (original === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = original; });
  it('uses the short reminder timing and supports mealId', () => {
    const result = buildMealReminder('Name', { mealId: 'abc', title: 'Meal', reminderMinutes: 10 });
    expect(result.subject).toContain('10–15 minuti');
    expect(result.html).toContain('https://example.invalid/app/#/meals/abc');
    expect(result.html).not.toContain('undefined');
    expect(result.html).not.toContain('1 ora');
  });
  it('retains one-hour timing by default for both roles', () => {
    expect(buildMealReminder('Name', { _id: 'abc', title: 'Meal' }, true).subject).toContain('1 ora');
  });
  it('escapes untrusted names and meal titles', () => {
    const result = buildMealReminder('<script>x</script>', { id: 'abc', title: '<img src=x onerror=alert(1)>' });
    expect(result.html).not.toContain('<script>'); expect(result.html).not.toContain('<img');
    expect(result.html).toContain('&lt;script&gt;');
  });
  it('rejects missing identifiers and unsafe frontend URLs before sending', () => {
    expect(() => buildMealReminder('Name', { title: 'Meal' })).toThrow();
    process.env.FRONTEND_URL = 'javascript:alert(1)';
    expect(() => buildMealReminder('Name', { id: 'abc' })).toThrow();
  });
});
