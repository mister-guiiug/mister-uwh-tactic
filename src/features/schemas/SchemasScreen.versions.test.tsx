import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  configure,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { schemaVersions } from '../../backend/index.ts';
import { createTactic, type Tactic } from '../board/model.ts';
import { boardStore } from '../board/store.ts';
import { SchemasScreen } from './SchemasScreen.tsx';
import { useSchemas } from './store.ts';

// LE CORPS DE LA FEUILLE VIENT D'UN MORCEAU CHARGÉ À LA DEMANDE, et le
// retour enchaîne deux enregistrements : sous la charge de la suite entière,
// le test dépassait les cinq secondes par défaut (relevé le 21/11/2026),
// comme celui du carnet. L'attente est allongée ici seulement.
configure({ asyncUtilTimeout: 10_000 });
vi.setConfig({ testTimeout: 30_000 });

/**
 * Ce que ces tests figent : LA FEUILLE DES VERSIONS (ADR 0034). Le menu
 * « ⋯ » d'une vignette l'ouvre ; elle liste les versions rangées sur
 * l'appareil — date, étapes, nom s'il a changé —, et « Revenir à cette
 * version » l'enregistre, le tableau suit, « Annuler » rend la courante.
 */

const ID = '0f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';

const premiere = createTactic({
  id: ID,
  name: 'Sortie de mur',
  now: '2026-11-21T08:00:00.000Z',
});
/** Retouchée : renommée, une étape de plus. */
const seconde: Tactic = {
  ...premiere,
  name: 'Sortie de mur, revue',
  steps: [premiere.steps[0]!, premiere.steps[0]!],
  updatedAt: '2026-11-21T09:00:00.000Z',
};

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

const ouvrir = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(
    await screen.findByRole('button', {
      name: 'Actions pour « Sortie de mur, revue »',
    })
  );
  await user.click(screen.getByRole('button', { name: 'Versions' }));
  return screen.findByRole(
    'dialog',
    { name: 'Versions de « Sortie de mur, revue »' },
    { timeout: 5000 }
  );
};

beforeEach(async () => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
  await useSchemas.getState().load();
  await useSchemas.getState().save(premiere);
  await useSchemas.getState().save(seconde);
  // Le schéma est ouvert au tableau, tel qu'enregistré.
  boardStore.getState().load(seconde);
});

afterEach(() => {
  localStorage.clear();
  useSchemas.setState({ schemas: [], outside: [], ready: false, error: null });
});

describe('les versions d’un schéma', () => {
  it('la feuille liste la version d’avant : sa date, ses étapes, son nom', async () => {
    const user = userEvent.setup();
    rendre();
    const feuille = await ouvrir(user);

    const liste = await within(feuille).findByRole(
      'list',
      { name: 'Versions précédentes' },
      { timeout: 5000 }
    );
    const [rangee] = within(liste).getAllByRole('listitem');
    expect(rangee).toHaveTextContent('1 étape');
    expect(rangee).toHaveTextContent('Nommée « Sortie de mur »');
    expect(rangee).toHaveTextContent(/21 nov\. 2026/);
    // La vignette de la première étape, tue au lecteur d'écran.
    expect(rangee!.querySelector('[aria-hidden="true"] svg')).not.toBe(null);
  });

  it('« Revenir à cette version » l’enregistre, le tableau suit, « Annuler » rend la courante', async () => {
    const user = userEvent.setup();
    rendre();
    const feuille = await ouvrir(user);

    await user.click(
      await within(feuille).findByRole(
        'button',
        { name: 'Revenir à cette version' },
        { timeout: 5000 }
      )
    );

    await waitFor(() =>
      expect(boardStore.getState().doc.name).toBe('Sortie de mur')
    );
    expect(boardStore.getState().doc.steps).toHaveLength(1);
    const enregistre = useSchemas.getState().schemas[0]!;
    expect(enregistre.name).toBe('Sortie de mur');
    // Rien ne se perd : la retouchée est rangée à son tour.
    expect(schemaVersions.list(ID).map(v => v.name)).toEqual([
      'Sortie de mur, revue',
    ]);
    // La feuille suit : son titre et sa liste.
    const rouverte = await screen.findByRole('dialog', {
      name: 'Versions de « Sortie de mur »',
    });
    expect(within(rouverte).getByRole('listitem')).toHaveTextContent(
      '2 étapes'
    );

    // La notification nomme la version reprise, et garde de quoi revenir.
    expect(await screen.findByText(/^Version du 21 nov\. 2026/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    await waitFor(() =>
      expect(boardStore.getState().doc.name).toBe('Sortie de mur, revue')
    );
    expect(useSchemas.getState().schemas[0]!.name).toBe('Sortie de mur, revue');
    expect(schemaVersions.list(ID).map(v => v.name)).toEqual(['Sortie de mur']);
  });

  it('sans version, la feuille dit comment en avoir', async () => {
    localStorage.clear();
    localStorage.setItem('dwc_locale', 'fr');
    await useSchemas.getState().load();
    await useSchemas.getState().save(seconde);
    const user = userEvent.setup();
    rendre();
    const feuille = await ouvrir(user);

    expect(
      await within(feuille).findByText(/Pas encore de version/, undefined, {
        timeout: 5000,
      })
    ).toBeInTheDocument();
  });
});
