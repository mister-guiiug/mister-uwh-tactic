import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { createTactic, type Tactic } from '../board/model.ts';
import { saveStateOf } from '../board/saveState.ts';
import { boardStore } from '../board/store.ts';
import { SchemasScreen } from './SchemasScreen.tsx';
import { useSchemas } from './store.ts';

/**
 * Ce que ces tests figent : LES ÉTIQUETTES DANS LA BIBLIOTHÈQUE (ADR 0029).
 * Une rangée de puces filtre la liste, avec la recherche et le mode
 * sélection du carnet ; le menu « ⋯ » d'une vignette ouvre la feuille qui
 * les pose. Poser une étiquette date le schéma, et le brouillon ouvert sur
 * le tableau la reçoit sans cesser d'être « enregistré ».
 */

const schema = (
  id: string,
  name: string,
  updatedAt: string,
  tags?: string[]
): Tactic => ({
  ...createTactic({ id, name, now: updatedAt }),
  ...(tags ? { tags } : {}),
});

const SORTIE = schema('a', 'Sortie de mur', '2026-11-21T09:00:00.000Z', [
  'attack',
  'wall',
]);
const COULISSE = schema(
  'b',
  'Défense qui coulisse',
  '2026-11-20T09:00:00.000Z',
  ['defense']
);
const RELAIS = schema('c', 'Relais sur le mur', '2026-11-19T09:00:00.000Z', [
  'drill',
  'wall',
  'Cadets',
]);
const PRESSING = schema('d', 'Pressing haut', '2026-11-18T09:00:00.000Z');

const { load, save } = useSchemas.getState();

function rendre(schemas: Tactic[]) {
  useSchemas.setState({
    schemas,
    outside: [],
    ready: true,
    error: null,
    load: async () => {},
    save,
  });
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

const titres = () =>
  screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);

beforeEach(() => {
  localStorage.setItem('dwc_locale', 'fr');
});

afterEach(() => {
  localStorage.clear();
  useSchemas.setState({
    schemas: [],
    outside: [],
    ready: false,
    error: null,
    load,
    save,
  });
});

describe('le filtre', () => {
  it('une puce par étiquette présente, dans la langue de l’écran', () => {
    rendre([SORTIE, COULISSE, RELAIS, PRESSING]);
    const filtre = screen.getByRole('group', { name: 'Filtrer par étiquette' });
    expect(
      within(filtre)
        .getAllByRole('radio')
        .map(radio => radio.closest('label')!.textContent)
    ).toEqual([
      'Toutes',
      'Attaque',
      'Défense',
      'Jeu au mur',
      'Exercice',
      'Cadets',
    ]);
    expect(screen.getByRole('radio', { name: 'Toutes' })).toBeChecked();
    // Chaque vignette montre les siennes.
    const sortie = screen
      .getByRole('heading', { name: 'Sortie de mur' })
      .closest('li')!;
    expect(
      within(within(sortie).getByRole('list', { name: 'Étiquettes' }))
        .getAllByRole('listitem')
        .map(item => item.textContent)
    ).toEqual(['Attaque', 'Jeu au mur']);
  });

  it('filtre, avec la recherche, et « Toutes » rend tout', async () => {
    const user = userEvent.setup();
    rendre([SORTIE, COULISSE, RELAIS, PRESSING]);

    await user.click(screen.getByRole('radio', { name: 'Jeu au mur' }));
    expect(titres()).toEqual(['Sortie de mur', 'Relais sur le mur']);
    expect(screen.getByText('2 sur 4 schémas')).toBeInTheDocument();

    await user.type(
      screen.getByRole('searchbox', { name: 'Rechercher un schéma' }),
      'relais'
    );
    expect(titres()).toEqual(['Relais sur le mur']);

    await user.clear(screen.getByRole('searchbox'));
    await user.click(screen.getByRole('radio', { name: 'Toutes' }));
    expect(titres()).toHaveLength(4);
  });

  it('se tait quand aucun schéma n’a d’étiquette', () => {
    rendre([PRESSING, schema('e', 'Contre', '2026-11-17T09:00:00.000Z')]);
    expect(screen.queryByRole('group', { name: 'Filtrer par étiquette' })).toBe(
      null
    );
  });

  it('en sélection, « Tout » ne coche que ce que le filtre montre', async () => {
    const user = userEvent.setup();
    rendre([SORTIE, COULISSE, RELAIS, PRESSING]);
    await user.click(screen.getByRole('radio', { name: 'Jeu au mur' }));
    await user.click(screen.getByRole('button', { name: 'Sélectionner' }));
    await user.click(
      await screen.findByRole(
        'checkbox',
        { name: 'Tout sélectionner' },
        { timeout: 5000 }
      )
    );
    expect(screen.getByText('2 schémas sélectionnés')).toBeInTheDocument();

    // Le filtre change, la sélection reste : les deux cochés sont masqués.
    await user.click(screen.getByRole('radio', { name: 'Défense' }));
    expect(titres()).toEqual(['Défense qui coulisse']);
    expect(screen.getByText('2 schémas sélectionnés')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'Sélectionner « Défense qui coulisse »',
      })
    ).not.toBeChecked();
  });
});

describe('poser des étiquettes', () => {
  const ouvrir = async (
    user: ReturnType<typeof userEvent.setup>,
    nom: string
  ) => {
    await user.click(
      screen.getByRole('button', { name: `Actions pour « ${nom} »` })
    );
    await user.click(screen.getByRole('button', { name: 'Étiquettes' }));
    return screen.findByRole(
      'dialog',
      { name: `Étiquettes de « ${nom} »` },
      { timeout: 5000 }
    );
  };

  const tagsOf = (id: string) =>
    useSchemas.getState().schemas.find(s => s.id === id)!.tags;

  it('coche une proposée, et le schéma est daté du geste', async () => {
    const user = userEvent.setup();
    rendre([SORTIE, PRESSING]);
    const feuille = await ouvrir(user, 'Pressing haut');
    const defense = await within(feuille).findByRole(
      'checkbox',
      { name: 'Défense' },
      { timeout: 5000 }
    );
    expect(defense).not.toBeChecked();
    await user.click(defense);
    await waitFor(() => expect(tagsOf('d')).toEqual(['defense']));
    const apres = useSchemas.getState().schemas.find(s => s.id === 'd')!;
    expect(apres.updatedAt > PRESSING.updatedAt).toBe(true);

    await user.click(within(feuille).getByRole('button', { name: 'Terminer' }));
    expect(screen.queryByRole('dialog')).toBe(null);
  });

  it('ajoute une libre ; le nom d’une proposée redonne la proposée', async () => {
    const user = userEvent.setup();
    rendre([SORTIE, PRESSING]);
    const feuille = await ouvrir(user, 'Pressing haut');
    const champ = await within(feuille).findByRole(
      'textbox',
      { name: 'Nouvelle étiquette' },
      { timeout: 5000 }
    );
    await user.type(champ, 'Cadets{Enter}');
    await user.type(champ, 'attaque');
    await user.click(within(feuille).getByRole('button', { name: 'Ajouter' }));
    await waitFor(() => expect(tagsOf('d')).toEqual(['Cadets', 'attack']));

    // Décochée, une libre reste offerte tant que la feuille est ouverte.
    const cadets = within(feuille).getByRole('checkbox', { name: 'Cadets' });
    await user.click(cadets);
    await waitFor(() => expect(tagsOf('d')).toEqual(['attack']));
    expect(cadets).not.toBeChecked();
  });

  it('le brouillon ouvert sur le tableau les reçoit, et reste enregistré', async () => {
    const user = userEvent.setup();
    boardStore.getState().load(PRESSING);
    rendre([SORTIE, PRESSING]);
    const feuille = await ouvrir(user, 'Pressing haut');
    await user.click(
      await within(feuille).findByRole(
        'checkbox',
        { name: 'Exercice' },
        { timeout: 5000 }
      )
    );
    await waitFor(() =>
      expect(boardStore.getState().tactic.tags).toEqual(['drill'])
    );
    expect(
      saveStateOf(boardStore.getState().tactic, useSchemas.getState().schemas)
    ).toBe('saved');
  });

  it('au-delà de huit, la feuille le dit et n’en prend plus', async () => {
    const user = userEvent.setup();
    const plein = schema(
      'f',
      'Plein',
      '2026-11-21T08:00:00.000Z',
      Array.from({ length: 8 }, (_, i) => `t${i}`)
    );
    rendre([plein, PRESSING]);
    const feuille = await ouvrir(user, 'Plein');
    expect(
      await within(feuille).findByText(
        /Ce schéma porte déjà 8 étiquettes/,
        {},
        { timeout: 5000 }
      )
    ).toBeInTheDocument();
    expect(
      within(feuille).getByRole('checkbox', { name: 'Attaque' })
    ).toBeDisabled();
    expect(
      within(feuille).getByRole('textbox', { name: 'Nouvelle étiquette' })
    ).toBeDisabled();
  });
});
