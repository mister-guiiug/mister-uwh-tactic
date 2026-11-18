import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { messages } from '../../i18n/messages.ts';
import { DRILL_IDS, PLAY_IDS } from '../board/examples.ts';
import { SchemasScreen } from './SchemasScreen.tsx';
import { useSchemas } from './store.ts';

/**
 * Ce que ces tests figent : LE CHOIX D'UN EXEMPLE SE FAIT EN DEUX GROUPES
 * NOMMÉS — les phases de jeu, puis les exercices — et chaque bouton garde son
 * nom (`aria-label`) et son aide (`aria-describedby`).
 */

const fr = messages.fr.schemas;

function rendre() {
  render(
    <I18nProvider>
      <ToastProvider>
        <MemoryRouter>
          <SchemasScreen />
        </MemoryRouter>
      </ToastProvider>
    </I18nProvider>
  );
}

beforeEach(() => {
  localStorage.setItem('dwc_locale', 'fr');
  useSchemas.setState({
    schemas: [],
    outside: [],
    ready: true,
    error: null,
    load: async () => {},
  });
});

afterEach(() => {
  localStorage.clear();
  useSchemas.setState({ schemas: [], outside: [], ready: false, error: null });
});

describe('les exemples de la bibliothèque', () => {
  it('se choisissent en deux groupes : phases de jeu, puis exercices', async () => {
    const user = userEvent.setup();
    rendre();
    await user.click(screen.getByRole('button', { name: fr.example }));
    const panel = screen.getByRole('dialog', { name: fr.examplePick });

    const titres = within(panel).getAllByRole('heading');
    expect(titres.map(h => h.textContent)).toEqual([
      fr.exampleGroups.plays,
      fr.exampleGroups.drills,
    ]);

    const phases = within(panel).getByRole('list', {
      name: fr.exampleGroups.plays,
    });
    const exercices = within(panel).getByRole('list', {
      name: fr.exampleGroups.drills,
    });
    expect(
      within(phases)
        .getAllByRole('button')
        .map(b => b.getAttribute('aria-label'))
    ).toEqual(PLAY_IDS.map(id => fr.examples[id].name));
    expect(
      within(exercices)
        .getAllByRole('button')
        .map(b => b.getAttribute('aria-label'))
    ).toEqual(DRILL_IDS.map(id => fr.examples[id].name));
  });

  it('chaque bouton dit ce que l’exemple montre, coups francs compris', async () => {
    const user = userEvent.setup();
    rendre();
    await user.click(screen.getByRole('button', { name: fr.example }));
    const phases = screen.getByRole('list', { name: fr.exampleGroups.plays });

    for (const id of ['freePuckPivots', 'freePuckBack'] as const) {
      const bouton = within(phases).getByRole('button', {
        name: fr.examples[id].name,
      });
      expect(bouton).toHaveAccessibleDescription(fr.examples[id].hint);
    }
  });
});
