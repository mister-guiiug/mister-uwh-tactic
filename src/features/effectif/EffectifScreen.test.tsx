import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { emptyEffectif } from './model.ts';
import { EffectifScreen } from './EffectifScreen.tsx';
import { useEffectif } from './store.ts';

const monter = () =>
  render(
    <I18nProvider>
      <ToastProvider>
        <EffectifScreen />
      </ToastProvider>
    </I18nProvider>
  );

const ligne = (nom: string) => within(screen.getByRole('group', { name: nom }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
  useEffectif.getState().replace(emptyEffectif());
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

/**
 * Ce que ces tests figent : UNE LISTE AU DOIGT. Un numéro par ligne, nommé
 * par son équipe ; la main et l'apnée une fois le prénom tapé ; l'apnée
 * pour les six de l'eau seulement ; tout gardé à mesure.
 */
describe('l’écran « Mon effectif »', () => {
  it('garde un prénom, puis demande la main et l’apnée', async () => {
    const user = userEvent.setup();
    monter();
    expect(screen.getAllByRole('group')).toHaveLength(10);
    expect(ligne('Blanc 1').queryByRole('switch')).toBeNull();

    await user.type(ligne('Blanc 1').getByLabelText('Prénom'), 'Paul');
    await user.click(ligne('Blanc 1').getByRole('switch', { name: 'Gaucher' }));
    // « 1 » en route vers « 12 » n'est pas refusé sous le doigt.
    await user.type(ligne('Blanc 1').getByLabelText('Apnée (s)'), '12');

    expect(useEffectif.getState().effectif.blanc[0]).toEqual({
      name: 'Paul',
      leftHanded: true,
      apnea: 12,
    });
    expect(
      screen.getByText('1 joueur nommé dans cette équipe.')
    ).toBeInTheDocument();
  });

  it('les remplaçants ont un prénom et une main, pas d’apnée', async () => {
    const user = userEvent.setup();
    monter();
    await user.type(ligne('Blanc 7').getByLabelText('Prénom'), 'Hugo');
    expect(ligne('Blanc 7').getByRole('switch')).toBeInTheDocument();
    expect(ligne('Blanc 7').queryByLabelText('Apnée (s)')).toBeNull();
  });

  it('les Noirs ont leur liste, et vider une équipe s’annule', async () => {
    const user = userEvent.setup();
    useEffectif.getState().setMember('blanc', 1, { name: 'Paul' });
    monter();
    await user.click(screen.getByRole('tab', { name: 'Noirs' }));
    await user.type(ligne('Noir 2').getByLabelText('Prénom'), 'Max');
    expect(useEffectif.getState().effectif.noir[1]!.name).toBe('Max');

    await user.click(
      screen.getByRole('button', { name: 'Vider cette équipe' })
    );
    expect(useEffectif.getState().effectif.noir[1]!.name).toBe('');
    // Les Blancs n'ont rien vu.
    expect(useEffectif.getState().effectif.blanc[0]!.name).toBe('Paul');

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(useEffectif.getState().effectif.noir[1]!.name).toBe('Max');
  });
});
