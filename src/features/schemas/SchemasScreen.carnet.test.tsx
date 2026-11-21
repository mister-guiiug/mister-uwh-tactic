import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  configure,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { schemasStore } from '../../backend/local.ts';
import { createTactic, type Tactic } from '../board/model.ts';
import { carnetCodeFromHash } from '../carnet/link.ts';
import { carnetShareUrl, decodeSharedCarnet } from '../carnet/share.ts';
import { useSharedCarnet } from '../carnet/useSharedCarnet.ts';
import { SchemasScreen } from './SchemasScreen.tsx';

// LA BARRE ET LA FEUILLE DU CARNET VIENNENT D'UN MORCEAU CHARGÉ À LA
// DEMANDE : c'est ce que ce fichier éprouve. Sous la charge de la suite
// entière (plus de mille tests), ce chargement dépassait l'attente par défaut
// — un échec sur deux passages, jamais seul. L'attente est allongée ici
// seulement, pas l'exigence.
configure({ asyncUtilTimeout: 10_000 });
vi.setConfig({ testTimeout: 30_000 });
import { useSchemas } from './store.ts';

/**
 * Ce que ces tests figent : LE CARNET DE JEU (ADR 0023), des deux côtés. Chez
 * l'entraîneur, on coche des schémas — ou tout ce que l'écran montre — et la
 * feuille donne un lien qui les emporte, dans l'ordre de la liste. Chez le
 * joueur, le lien ouvert range tout dans la bibliothèque et l'écran Schémas
 * montre ce qui vient d'arriver ; un lien abîmé n'y laisse rien.
 */

const BASE = 'http://localhost:3000/';

const schema = (id: string, name: string, updatedAt: string): Tactic =>
  createTactic({ id, name, now: updatedAt });

const SORTIE = schema('a', 'Sortie de mur', '2026-11-21T09:00:00.000Z');
const RELAIS = schema('b', 'Relais au fond', '2026-11-20T09:00:00.000Z');
const PRESSING = schema('c', 'Pressing haut', '2026-11-19T09:00:00.000Z');

const bibliotheque = [SORTIE, RELAIS, PRESSING];

const NEUF = {
  newId: () => crypto.randomUUID(),
  now: new Date().toISOString(),
};

// La sélection se teste sur un magasin posé à la main ; la réception, sur le
// vrai, qui lit l'appareil.
const { load } = useSchemas.getState();

beforeEach(() => {
  localStorage.setItem('dwc_locale', 'fr');
});

afterEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  useSchemas.setState({
    schemas: [],
    outside: [],
    ready: false,
    error: null,
    load,
  });
});

describe('chez l’entraîneur : la sélection', () => {
  function rendre() {
    useSchemas.setState({
      schemas: bibliotheque,
      outside: [],
      ready: true,
      error: null,
      load: async () => {},
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

  it('coche des schémas un à un, ou tout, et compte', async () => {
    const user = userEvent.setup();
    rendre();
    // Hors sélection, ni case ni barre.
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sélectionner' }));
    // La barre vient avec le morceau du carnet.
    const partager = await screen.findByRole('button', {
      name: 'Partager la sélection',
    });
    expect(screen.getByText('0 schéma sélectionné')).toBeInTheDocument();
    expect(partager).toBeDisabled();

    await user.click(
      screen.getByRole('checkbox', { name: 'Sélectionner « Sortie de mur »' })
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Sélectionner « Pressing haut »' })
    );
    expect(screen.getByText('2 schémas sélectionnés')).toBeInTheDocument();
    expect(partager).toBeEnabled();
    const tout = screen.getByRole<HTMLInputElement>('checkbox', {
      name: 'Tout sélectionner',
    });
    expect(tout.checked).toBe(false);
    expect(tout.indeterminate).toBe(true);

    await user.click(tout);
    expect(screen.getByText('3 schémas sélectionnés')).toBeInTheDocument();
    expect(tout.checked).toBe(true);
    await user.click(tout);
    expect(screen.getByText('0 schéma sélectionné')).toBeInTheDocument();

    // « Terminer » quitte la sélection.
    await user.click(screen.getByRole('button', { name: 'Terminer' }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('« Tout » ne coche que ce que montre la recherche', async () => {
    const user = userEvent.setup();
    rendre();
    await user.click(screen.getByRole('button', { name: 'Sélectionner' }));
    await user.type(screen.getByLabelText('Rechercher un schéma'), 'fond');
    await user.click(
      await screen.findByRole('checkbox', { name: 'Tout sélectionner' })
    );
    expect(screen.getByText('1 schéma sélectionné')).toBeInTheDocument();
  });

  it('partage la sélection : un lien qui l’emporte, dans l’ordre, avec son nom', async () => {
    const user = userEvent.setup();
    rendre();
    await user.click(screen.getByRole('button', { name: 'Sélectionner' }));
    await user.click(
      screen.getByRole('checkbox', { name: 'Sélectionner « Pressing haut »' })
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Sélectionner « Sortie de mur »' })
    );
    await user.click(
      await screen.findByRole('button', { name: 'Partager la sélection' })
    );

    const feuille = await screen.findByRole('dialog', {
      name: 'Partager le carnet',
    });
    // Le corps de la feuille vient avec le morceau du carnet.
    expect(
      await within(feuille).findByText(/Les 2 schémas voyagent dans le lien/)
    ).toBeInTheDocument();
    const champ =
      await within(feuille).findByLabelText<HTMLInputElement>('Lien du carnet');
    expect(champ.value).toMatch(/^http:\/\/localhost:3000\/#zc=/);
    const relu = async () =>
      decodeSharedCarnet(carnetCodeFromHash(new URL(champ.value).hash)!, NEUF);
    // L'ordre de la liste (la plus récente d'abord), pas celui des clics.
    expect((await relu()).schemas.map(s => s.name)).toEqual([
      'Sortie de mur',
      'Pressing haut',
    ]);
    expect(
      within(feuille).getByAltText('QR code du lien vers ce carnet')
    ).toBeInTheDocument();

    await user.type(
      within(feuille).getByLabelText('Nom du carnet (facultatif)'),
      'Semaine 47'
    );
    await waitFor(async () => expect((await relu()).name).toBe('Semaine 47'));
    await waitFor(() =>
      expect(
        within(feuille).getByRole('button', { name: /Envoyer le lien/ })
      ).not.toHaveAttribute('aria-busy', 'true')
    );
  });
});

/** La coquille, réduite à ce qui reçoit un carnet : le crochet et les routes. */
function Coquille() {
  useSharedCarnet();
  return (
    <Routes>
      <Route path="/" element={<p>Accueil</p>} />
      <Route path="/schemas" element={<SchemasScreen />} />
    </Routes>
  );
}

function ouvrir(lien: string) {
  window.history.replaceState(null, '', `/${new URL(lien).hash}`);
  render(
    <I18nProvider>
      <ToastProvider>
        <MemoryRouter>
          <Coquille />
        </MemoryRouter>
      </ToastProvider>
    </I18nProvider>
  );
}

describe('chez le joueur : la réception', () => {
  it('range le carnet dans la bibliothèque, et l’écran Schémas montre ce qui arrive', async () => {
    const user = userEvent.setup();
    ouvrir(await carnetShareUrl([SORTIE, RELAIS], 'Semaine 47', BASE));

    expect(
      await screen.findByText(
        '« Semaine 47 » : 2 schémas reçus, gardés sur cet appareil, même hors réseau.'
      )
    ).toBeInTheDocument();
    // Le lien a quitté l'adresse : un rechargement n'ajouterait rien.
    expect(window.location.hash).toBe('');
    expect(
      await screen.findByRole('heading', { name: 'Sortie de mur' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Relais au fond' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Reçu')).toHaveLength(2);
    const ranges = schemasStore.load().schemas;
    expect(ranges.map(s => s.name).sort()).toEqual([
      'Relais au fond',
      'Sortie de mur',
    ]);
    expect(ranges.map(s => s.id)).not.toContain(SORTIE.id);

    await user.click(screen.getByRole('button', { name: 'Compris' }));
    expect(screen.queryByText(/schémas reçus/)).not.toBeInTheDocument();
    expect(screen.queryByText('Reçu')).not.toBeInTheDocument();
  });

  it('sans nom, il s’appelle « Carnet de jeu »', async () => {
    ouvrir(await carnetShareUrl([PRESSING], '', BASE));
    expect(
      await screen.findByText(/^« Carnet de jeu » : 1 schéma reçu/)
    ).toBeInTheDocument();
  });

  it('un lien abîmé est refusé, et ne laisse rien', async () => {
    ouvrir(`${BASE}#sc=eyJ2IjoxLCJ0IjpbeyJ2IjozLCJuIjoiU29ydGll`);
    expect(
      await screen.findByText(
        'Carnet illisible ou incomplet : rien n’a été ajouté.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Accueil')).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    expect(schemasStore.load().schemas).toEqual([]);
  });
});
