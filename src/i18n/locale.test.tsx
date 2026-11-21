import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { es } from './messages.es.ts';
import { nl } from './messages.nl.ts';
import { de } from './messages.de.ts';
import {
  I18nProvider,
  initialLocale,
  loadLocale,
  useI18n,
  type Locale,
} from './index.ts';

/**
 * Ce que ces tests figent : LA LANGUE DU DÉMARRAGE EST CELLE QU'ON A
 * CHOISIE, SINON CELLE DU NAVIGATEUR, ET ELLE EST CHARGÉE AVANT D'ÊTRE
 * AFFICHÉE. `<html lang>` la suit : un lecteur d'écran lit l'espagnol avec
 * une voix espagnole, pas française.
 */

const navigateur = (langues: string[]) =>
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(langues);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('initialLocale', () => {
  it.each([
    ['es', 'es'],
    ['nl', 'nl'],
    ['de', 'de'],
    ['en', 'en'],
  ] as const)('« %s » rangé par la famille → %s', (rangee, attendue) => {
    navigateur(['fr-BE']);
    localStorage.setItem('dwc_locale', rangee);
    expect(initialLocale()).toBe(attendue);
  });

  it.each([
    [['es-CO', 'en-US'], 'es'],
    [['es-AR'], 'es'],
    [['nl-BE', 'fr-BE'], 'nl'],
    [['de-CH'], 'de'],
    // La première langue CONNUE, pas la première de la liste.
    [['pt-BR', 'es-ES'], 'es'],
    [['ja-JP', 'zh-CN'], 'fr'],
  ] as const)('navigateur %j → %s', (langues, attendue) => {
    navigateur([...langues]);
    expect(initialLocale()).toBe(attendue);
  });

  it('une valeur rangée inconnue (« pt », d’une app sœur) est ignorée', () => {
    navigateur(['de-DE']);
    localStorage.setItem('dwc_locale', 'pt');
    expect(initialLocale()).toBe('de');
  });
});

function Sonde() {
  const { t, locale } = useI18n();
  return (
    <p data-locale={locale}>
      {t('nav.schemas')} · {t('settings.title')}
    </p>
  );
}

describe('une langue chargée à la demande', () => {
  it.each([
    ['es', es],
    ['nl', nl],
    ['de', de],
  ] as const)(
    '%s : ses textes à l’écran, et <html lang> qui suit',
    async (locale, catalogue) => {
      localStorage.setItem('dwc_locale', locale);
      await loadLocale(locale as Locale);
      render(
        <I18nProvider>
          <Sonde />
        </I18nProvider>
      );
      expect(
        screen.getByText(
          `${catalogue.nav.schemas} · ${catalogue.settings.title}`
        )
      ).toBeInTheDocument();
      expect(document.documentElement.lang).toBe(locale);
    }
  );
});
