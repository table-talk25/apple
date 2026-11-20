import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import i18n, { SUPPORTED_LANGUAGES, SUPPORTED_LNGS } from './i18n';
import LanguageMenu from './components/common/LanguageMenu';

const expectedHeroSnippets = {
  it: 'Condividi un table2Talk.',
  en: 'Share a table2Talk.',
  es: 'Comparte un table2Talk.',
  fr: 'Partagez un table2Talk.',
  de: 'Teile einen table2Talk.',
  ar: 'شارك table2Talk.',
  ja: 'table2Talkを共有しよう。',
  zh: '分享一个 table2Talk。',
};

const TestHarness = () => {
  const { t } = useTranslation();
  return (
    <div>
      <LanguageMenu />
      <p data-testid="hero-title">{t('home.heroTitle')}</p>
    </div>
  );
};

describe('i18n supported languages & LanguageMenu switching', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('it');
  });

  test('exports and configures all 8 locales in supportedLngs', () => {
    expect([...SUPPORTED_LNGS].sort()).toEqual(['ar', 'de', 'en', 'es', 'fr', 'it', 'ja', 'zh']);
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual(SUPPORTED_LNGS);
    SUPPORTED_LNGS.forEach((lng) => {
      expect(i18n.options.supportedLngs).toContain(lng);
    });
  });

  test('switches rendered translations via LanguageMenu for ES, FR, DE, AR, JA, ZH, EN, IT', async () => {
    render(<TestHarness />);

    expect(screen.getByTestId('hero-title').textContent).toContain(expectedHeroSnippets.it);

    for (const lng of ['es', 'fr', 'de', 'ar', 'ja', 'zh', 'en', 'it']) {
      // Open dropdown
      const trigger = screen.getByRole('button', { expanded: false });
      fireEvent.click(trigger);

      // Click target language option
      const option = screen
        .getAllByRole('menuitem')
        .find((el) => el.textContent.toUpperCase().startsWith(lng.toUpperCase()));
      expect(option).toBeTruthy();
      fireEvent.click(option);

      await waitFor(() => {
        expect(i18n.language).toBe(lng);
        expect(screen.getByTestId('hero-title').textContent).toContain(expectedHeroSnippets[lng]);
      });
    }
  });
});
