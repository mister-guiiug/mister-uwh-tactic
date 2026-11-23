import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { schemasStore, seancesStore } from '../../backend/local.ts';
import { createTactic } from '../board/model.ts';
import { encodeJson } from '../board/share.ts';
import { boardStore } from '../board/store.ts';
import { useSchemas } from '../schemas/store.ts';
import { createSeance } from './model.ts';
import { useSeancePlay } from './play.ts';
import { seanceShareUrl } from './share.ts';
import { useSeances } from './store.ts';
import { useSharedSeance } from './useSharedSeance.ts';

/**
 * Ce que ces tests figent : UN LIEN DE SÉANCE OUVERT, D'OÙ QU'ON ARRIVE.
 * Pour modifier, elle entre dans la bibliothèque et son éditeur s'ouvre
 * (ADR 0018) ; pour les joueurs, elle se présente au tableau, et rien
 * n'est rangé (ADR 0040).
 */

const sortie = createTactic({ id: 'sortie', name: 'Sortie de mur' });
const relais = createTactic({ id: 'relais', name: 'Relais au fond' });
const library = new Map([
  ['sortie', sortie],
  ['relais', relais],
]);
const mardi = {
  ...createSeance('mardi', 'Mardi'),
  items: [
    { schemaId: 'sortie', minutes: 6, note: '' },
    { schemaId: 'relais', minutes: 4, note: '' },
  ],
};

/** Le tableau dit si on lui demande la présentation (`state.present`). */
function Tableau() {
  const state = useLocation().state as { present?: boolean } | null;
  return <p>{state?.present ? 'Présentation demandée' : 'Le tableau'}</p>;
}

function Coquille() {
  useSharedSeance();
  return (
    <Routes>
      <Route path="/" element={<Tableau />} />
      <Route path="/seances/:id" element={<p>L’éditeur de la séance</p>} />
      <Route path="/schemas" element={<p>La bibliothèque</p>} />
    </Routes>
  );
}

/** Ouvre l'application à cette adresse, le lien dans le fragment. */
function ouvrir(hash: string, chemin = '/') {
  window.history.replaceState(null, '', `${chemin}${hash}`);
  render(
    <I18nProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[chemin]}>
          <Coquille />
        </MemoryRouter>
      </ToastProvider>
    </I18nProvider>
  );
}

const fragment = (url: string) => new URL(url).hash;

beforeEach(async () => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
  useSchemas.setState({ schemas: [], outside: [], ready: false });
  await useSeances.getState().load();
  boardStore
    .getState()
    .load(createTactic({ id: 'brouillon', name: 'Mon brouillon' }));
});

afterEach(() => {
  useSeancePlay.getState().stop();
  window.history.replaceState(null, '', '/');
});

describe('un lien de séance ouvert', () => {
  it('pour les joueurs : la séance se présente, et rien n’est rangé', async () => {
    const url = await seanceShareUrl(mardi, library, `${location.origin}/`, {
      player: true,
    });
    // Arrivé ailleurs que sur le tableau, le joueur y est conduit.
    ouvrir(fragment(url), '/schemas');

    expect(
      await screen.findByText('Présentation demandée')
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/passez d’une phase à l’autre/)
    ).toBeInTheDocument();
    // Le lien quitte l'adresse : un rechargement ne le rejoue pas.
    expect(window.location.hash).toBe('');

    expect(boardStore.getState().tactic.name).toBe('Sortie de mur');
    const play = useSeancePlay.getState();
    expect(play.seanceId).not.toBeNull();
    expect(play.guest?.seance.name).toBe('Mardi');
    expect(play.guest?.schemas).toHaveLength(2);

    expect(schemasStore.load().schemas).toEqual([]);
    expect(seancesStore.load().seances).toEqual([]);
    expect(useSeances.getState().seances).toEqual([]);
  });

  it('pour modifier : elle entre dans la bibliothèque, son éditeur s’ouvre', async () => {
    const url = await seanceShareUrl(mardi, library, `${location.origin}/`);
    ouvrir(fragment(url));

    expect(
      await screen.findByText('L’éditeur de la séance')
    ).toBeInTheDocument();
    expect(useSeancePlay.getState().seanceId).toBeNull();
    expect(seancesStore.load().seances.map(s => s.name)).toEqual(['Mardi']);
    expect(boardStore.getState().tactic.name).toBe('Mon brouillon');
  });

  it('pour les joueurs, forgé : refusé, et le tableau reste tel quel', async () => {
    const forge = encodeJson({ v: 1, n: 'Forgée', p: [[3, 5, '']], t: [] });
    ouvrir(`#ssp=${forge}`);

    expect(
      await screen.findByText('Ce lien de séance est illisible ou incomplet.')
    ).toBeInTheDocument();
    expect(screen.getByText('Le tableau')).toBeInTheDocument();
    expect(boardStore.getState().tactic.name).toBe('Mon brouillon');
    expect(useSeancePlay.getState().seanceId).toBeNull();
  });
});
