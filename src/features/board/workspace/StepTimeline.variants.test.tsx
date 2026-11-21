import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../../i18n/index.ts';
import { createTactic, type Tactic } from '../model.ts';
import { boardStore } from '../store.ts';
import { StepTimeline } from './StepTimeline.tsx';

/** Une phase de deux étapes, et une variante qui part de la première. */
function phase(): Tactic {
  const doc = createTactic({ id: 't', name: 'Sortie' });
  doc.steps = [doc.steps[0]!, structuredClone(doc.steps[0]!)];
  doc.variants = [
    {
      id: 'v',
      name: 'Leur 2 monte',
      from: 0,
      steps: [structuredClone(doc.steps[0]!)],
    },
  ];
  return doc;
}

const monter = (simple: boolean) =>
  render(
    <I18nProvider>
      <StepTimeline warned={new Set()} simple={simple} canRecord />
    </I18nProvider>
  );

beforeEach(() => {
  localStorage.setItem('dwc_locale', 'fr');
  act(() => boardStore.getState().load(createTactic({ id: 'x', name: '' })));
});

/**
 * Ce que ces tests figent : LE MODE SIMPLE LIT LES VARIANTES, IL N'EN CRÉE
 * PAS (ADR 0020, ADR 0027). Le mode complet propose d'en créer.
 */
describe('la frise et les variantes', () => {
  it('en mode simple, sans variante, rien n’en parle', () => {
    monter(true);
    expect(
      screen.queryByRole('button', { name: /Variantes|Lignes/ })
    ).toBeNull();
  });

  it('en mode simple, celles d’un schéma reçu se lisent, sans se créer', async () => {
    act(() => boardStore.getState().load(phase()));
    monter(true);
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Lignes de la phase, ligne affichée : Ligne principale',
      })
    );
    expect(
      screen.queryByRole('button', { name: /Nouvelle variante/ })
    ).toBeNull();
    expect(screen.queryByLabelText('Nom de la ligne')).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: /^Leur 2 monte/ })
    );
    expect(boardStore.getState().line).toBe('v');
    expect(
      screen.getByRole('button', {
        name: 'Lignes de la phase, ligne affichée : Leur 2 monte',
      })
    ).toBeTruthy();
  });

  it('en mode complet, une variante naît de l’étape courante', async () => {
    monter(false);
    await userEvent.click(
      screen.getByRole('button', { name: 'Variantes de la phase' })
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Nouvelle variante depuis l’étape 1' })
    );
    expect(boardStore.getState().doc.variants).toHaveLength(1);
    expect(boardStore.getState().line).toBe(
      boardStore.getState().doc.variants![0]!.id
    );
    const steps = screen.getAllByRole('button', { name: /^Étape 1,/ });
    expect(steps[0]!.getAttribute('aria-label')).toBe(
      'Étape 1, commune à la ligne principale, la phase se sépare ici'
    );
  });
});
