import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { fr as frMessages } from '../../i18n/messages.ts';
import { DRILL_IDS, PLAY_IDS } from '../board/examples.ts';
import { SchemasScreen } from './SchemasScreen.tsx';
import { useSchemas } from './store.ts';

/**
 * Ce que ces tests figent : LE CHOIX D'UN EXEMPLE SE FAIT EN DEUX GROUPES
 * NOMMÉS — les phases de jeu, puis les exercices — et chaque bouton garde son
 * nom (`aria-label`) et son aide (`aria-describedby`).
 */

const fr = frMessages.schemas;

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
    // Le premier texte du bouton est le nom de l'exemple.
    const noms = (list: HTMLElement) =>
      within(list)
        .getAllByRole('button')
        .map(b => b.querySelector('.uwh-menu__name')?.textContent);
    expect(noms(phases)).toEqual(PLAY_IDS.map(id => fr.examples[id].name));
    expect(noms(exercices)).toEqual(DRILL_IDS.map(id => fr.examples[id].name));
  });

  it('chaque bouton se nomme par ce qu’il affiche : le nom, puis l’aide', async () => {
    const user = userEvent.setup();
    rendre();
    await user.click(screen.getByRole('button', { name: fr.example }));
    const phases = screen.getByRole('list', { name: fr.exampleGroups.plays });

    // WCAG 2.5.3 : le nom accessible contient tout le texte visible — un
    // `aria-label` réduit au nom le contredisait (axe).
    for (const id of ['freePuckPivots', 'freePuckBack'] as const) {
      const { name, hint } = fr.examples[id];
      const bouton = within(phases).getByRole('button', {
        name: text => text.startsWith(name),
      });
      expect(bouton).not.toHaveAttribute('aria-label');
      expect(bouton.textContent).toBe(`${name}${hint}`);
    }
  });
});
