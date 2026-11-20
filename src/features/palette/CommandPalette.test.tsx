import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { boardStore } from '../board/store.ts';
import { seancesStore } from '../../backend/local.ts';
import { useSeances } from '../seances/store.ts';
import { CommandPalette } from './CommandPalette.tsx';
import { filterCommands, type Command } from './commands.ts';

function Ici() {
  const { pathname, search } = useLocation();
  return <p data-testid="ici">{pathname + search}</p>;
}

function monter() {
  render(
    <I18nProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={['/schemas']}>
          <button type="button">avant</button>
          <CommandPalette />
          <Routes>
            <Route path="*" element={<Ici />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </I18nProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
  boardStore.getState().reset();
});

describe('la palette de commandes', () => {
  it('Ctrl+K l’ouvre, Échap la referme et rend le focus', async () => {
    const user = userEvent.setup();
    monter();
    screen.getByRole('button', { name: 'avant' }).focus();

    await user.keyboard('{Control>}k{/Control}');
    // Le dialogue est dans son morceau : il paraît au premier chargement.
    expect(
      await screen.findByRole('dialog', { name: 'Palette de commandes' })
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'avant' })).toHaveFocus();
  });

  it('cherche sans accents, et Entrée exécute la commande active', async () => {
    const user = userEvent.setup();
    monter();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'seances');
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Séances');

    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('ici')).toHaveTextContent('/seances');
  });

  it('ouvre une séance de la bibliothèque, lue par le port à l’ouverture', async () => {
    seancesStore.save({
      seances: [
        {
          id: 'mardi',
          name: 'Mardi au bassin',
          items: [],
          updatedAt: '2026-11-20T10:00:00.000Z',
        },
      ],
    });
    useSeances.setState({ seances: [], ready: false });
    const user = userEvent.setup();
    monter();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'mardi au');
    expect(
      await screen.findByRole('option', { name: /Mardi au bassin/ })
    ).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('ici')).toHaveTextContent('/seances/mardi');
  });

  it('une action du tableau y mène, puis agit', async () => {
    const user = userEvent.setup();
    monter();
    const avant = boardStore.getState().tactic.steps.length;
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'ajouter une etape');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('ici')).toHaveTextContent(/^\/$/);
    expect(boardStore.getState().tactic.steps).toHaveLength(avant + 1);
  });

  it('les mots du lexique ne paraissent qu’à la recherche', async () => {
    const user = userEvent.setup();
    monter();
    await user.keyboard('{Control>}k{/Control}');
    await screen.findByRole('combobox');
    expect(
      screen.queryByRole('option', { name: /Sortie de mur/ })
    ).not.toBeInTheDocument();

    await user.type(await screen.findByRole('combobox'), 'sortie de mur');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('ici')).toHaveTextContent(
      '/lexique?terme=sortie-de-mur'
    );
  });
});

describe('le filtre', () => {
  const run = () => undefined;
  const commands: Command[] = [
    { id: 'a', group: 'Composition', label: '3-2-1 · Noirs', run },
    { id: 'b', group: 'Composition', label: '3-2-1 · Blancs', run },
    { id: 'c', group: 'Aller à', label: 'Réglages', run },
  ];

  it('chaque mot doit se trouver, dans n’importe quel ordre', () => {
    expect(filterCommands(commands, 'noirs 3-2').map(c => c.id)).toEqual(['a']);
    expect(filterCommands(commands, 'reglages').map(c => c.id)).toEqual(['c']);
  });

  it('celles qui commencent par la recherche passent devant', () => {
    expect(filterCommands(commands, 'composition').map(c => c.id)).toEqual([
      'a',
      'b',
    ]);
    expect(filterCommands(commands, '3-2-1 · b')[0]?.id).toBe('b');
  });
});
