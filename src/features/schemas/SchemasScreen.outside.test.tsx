import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { createTactic, type Tactic } from '../board/model.ts';
import { SchemasScreen } from './SchemasScreen.tsx';
import { useSchemas } from './store.ts';

/**
 * Ce que ces tests figent : CE QUI EST HORS DU COMPTE SE VOIT, À PART, ET NE
 * MONTE QUE SUR UN GESTE (ADR 0015). L'écran est rendu sur un magasin posé à
 * la main : le compte, la base et l'appareil sont l'affaire de l'adaptateur,
 * et de ses propres tests.
 */

const schema = (id: string, name: string): Tactic =>
  createTactic({ id, name, now: '2026-11-18T08:00:00.000Z' });

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

let adopt: ReturnType<
  typeof vi.fn<(ids: readonly string[]) => Promise<number>>
>;

beforeEach(() => {
  localStorage.setItem('dwc_locale', 'fr');
  adopt = vi.fn(async (ids: readonly string[]) => ids.length);
  useSchemas.setState({
    ready: true,
    error: null,
    // L'écran relit au montage : la lecture ne doit rien changer ici.
    load: async () => {},
    adopt,
  });
});

afterEach(() => {
  localStorage.clear();
  useSchemas.setState({ schemas: [], outside: [], ready: false, error: null });
});

describe('les schémas hors du compte', () => {
  it('se montrent à part, et montent un par un sur un geste', async () => {
    const user = userEvent.setup();
    useSchemas.setState({
      schemas: [schema('a', 'Sortie de but')],
      outside: [schema('d', 'Contre rapide'), schema('e', 'Bloc à trois')],
    });
    rendre();

    const section = screen.getByRole('region', {
      name: 'Sur cet appareil, hors de votre compte',
    });
    expect(
      within(section).getByRole('heading', { name: 'Contre rapide' })
    ).toBeInTheDocument();
    // La bibliothèque du compte ne les compte pas.
    expect(screen.getByText('1 schéma')).toBeInTheDocument();

    await user.click(
      within(section).getByRole('button', {
        name: 'Ajouter à mon compte : « Contre rapide »',
      })
    );
    expect(adopt).toHaveBeenCalledWith(['d']);
    expect(
      await screen.findByText('1 schéma ajouté à votre compte.')
    ).toBeInTheDocument();
  });

  it('montent tous d’un coup quand il y en a plusieurs', async () => {
    const user = userEvent.setup();
    useSchemas.setState({
      schemas: [],
      outside: [schema('d', 'Contre rapide'), schema('e', 'Bloc à trois')],
    });
    rendre();

    // Le compte est vide, et l'écran le dit sans faire croire que tout l'est.
    expect(
      screen.getByText('Aucun schéma dans votre compte.')
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Ajouter les 2 à mon compte' })
    );
    expect(adopt).toHaveBeenCalledWith(['d', 'e']);
  });

  it('sans rien hors du compte, la section n’existe pas', () => {
    useSchemas.setState({
      schemas: [schema('a', 'Sortie de but')],
      outside: [],
    });
    rendre();

    expect(
      screen.queryByRole('region', {
        name: 'Sur cet appareil, hors de votre compte',
      })
    ).not.toBeInTheDocument();
  });
});
