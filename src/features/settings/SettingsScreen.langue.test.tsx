import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider, LOCALES } from '../../i18n/index.ts';
import { LOCALE_NAMES } from '../../i18n/names.ts';
import { SettingsScreen } from './SettingsScreen.tsx';

/**
 * Ce que ces tests figent : LA LANGUE SE CHOISIT DANS UNE LISTE OÙ CHACUNE
 * EST NOMMÉE DANS LA SIENNE, et le choix bascule tout l'écran — textes de
 * l'application, libellés du socle, `<html lang>` et la clé que les apps de
 * la famille partagent.
 */

function monter() {
  render(
    <I18nProvider>
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>
    </I18nProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
});

afterEach(() => {
  cleanup();
});

describe('Réglages — la langue', () => {
  it('propose les cinq langues, chacune dans la sienne', () => {
    monter();
    const liste = screen.getByRole('combobox', { name: 'Langue' });
    expect(liste).toHaveValue('fr');
    const options = within(liste).getAllByRole('option');
    expect(options.map(option => option.textContent)).toEqual(
      LOCALES.map(code => LOCALE_NAMES[code])
    );
    // Le lecteur d'écran prononce « Deutsch » en allemand.
    expect(options.map(option => option.getAttribute('lang'))).toEqual([
      ...LOCALES,
    ]);
  });

  it('bascule en allemand, puis en espagnol, et tout suit', async () => {
    const user = userEvent.setup();
    monter();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Langue' }),
      'de'
    );
    // Le morceau allemand arrive, puis l'écran bascule.
    const allemand = await screen.findByRole('combobox', { name: 'Sprache' });
    expect(allemand).toHaveValue('de');
    expect(screen.getByText('Darstellung')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('de');
    expect(localStorage.getItem('dwc_locale')).toBe('de');

    await user.selectOptions(allemand, 'es');
    expect(await screen.findByRole('combobox', { name: 'Idioma' })).toHaveValue(
      'es'
    );
    expect(screen.getByText('Apariencia')).toBeInTheDocument();
    // Le thème, contrôle segmenté du socle, parle la même langue.
    expect(screen.getByRole('tab', { name: 'Oscuro' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('es');
  });
});
