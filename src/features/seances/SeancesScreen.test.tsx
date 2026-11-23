import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { createTactic } from '../board/model.ts';
import { useSchemas } from '../schemas/store.ts';
import { SeancesScreen } from './SeancesScreen.tsx';
import { seanceCodeFromHash } from './link.ts';
import { decodeSharedSeance } from './share.ts';
import { flushSeances, useSeances } from './store.ts';

const sortie = createTactic({ id: 'sortie', name: 'Sortie de mur' });
const relais = createTactic({ id: 'relais', name: 'Relais au fond' });

function monter(chemin = '/seances') {
  render(
    <I18nProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[chemin]}>
          <Routes>
            <Route path="/seances" element={<SeancesScreen />} />
            <Route path="/seances/:id" element={<SeancesScreen />} />
            <Route path="/" element={<p>Le tableau</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </I18nProvider>
  );
}

beforeEach(async () => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
  await useSeances.getState().load();
  useSchemas.setState({ schemas: [sortie, relais], ready: true, error: null });
});

const adoptReel = useSeances.getState().adopt;

afterEach(() => {
  flushSeances();
  useSchemas.setState({ schemas: [], ready: false });
  useSeances.setState({ outside: [], adopt: adoptReel });
});

describe('l’écran des séances', () => {
  it('sans séance, invite à préparer la première', () => {
    monter();
    expect(
      screen.getByText('Préparez votre première séance')
    ).toBeInTheDocument();
  });

  it('prépare une séance : un nom, deux phases ordonnées, une durée', async () => {
    const user = userEvent.setup();
    monter();
    await user.click(screen.getByRole('button', { name: 'Nouvelle séance' }));

    await user.type(screen.getByLabelText('Nom de la séance'), 'Mardi');
    const choix = screen.getByLabelText('Schéma à ajouter');
    await user.selectOptions(choix, 'sortie');
    await user.click(
      screen.getByRole('button', { name: 'Ajouter à la séance' })
    );
    await user.selectOptions(choix, 'relais');
    await user.click(
      screen.getByRole('button', { name: 'Ajouter à la séance' })
    );

    const phases = () =>
      within(screen.getByRole('list'))
        .getAllByRole('listitem')
        .map(li => li.querySelector('.uwh-seance__name')?.textContent);
    expect(phases()).toEqual(['Sortie de mur', 'Relais au fond']);

    await user.click(
      screen.getByRole('button', { name: 'Monter « Relais au fond »' })
    );
    expect(phases()).toEqual(['Relais au fond', 'Sortie de mur']);

    // Un champ numérique contrôlé : la valeur se remplace d'un coup.
    fireEvent.change(screen.getByLabelText('Durée de la phase 1 (min)'), {
      target: { value: '12' },
    });
    expect(screen.getByText('2 phases · 17 min')).toBeInTheDocument();
    expect(useSeances.getState().seances[0]?.name).toBe('Mardi');
  });

  it('une phase dont le schéma a disparu le dit', () => {
    const { create, addItem } = useSeances.getState();
    create('s', 'Vieille');
    addItem('s', 'efface');
    monter('/seances/s');
    expect(
      screen.getByText('Schéma introuvable dans la bibliothèque')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Présenter la séance' })
    ).toBeDisabled();
  });

  it('présenter ouvre le tableau', async () => {
    const user = userEvent.setup();
    const { create, addItem } = useSeances.getState();
    create('s', 'Jeudi');
    addItem('s', 'sortie');
    monter('/seances/s');
    await user.click(
      screen.getByRole('button', { name: 'Présenter la séance' })
    );
    expect(screen.getByText('Le tableau')).toBeInTheDocument();
  });

  it('imprimer monte la séance sur papier, phase par phase, puis la retire', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const { create, addItem } = useSeances.getState();
    create('s', 'Jeudi');
    addItem('s', 'sortie');
    addItem('s', 'relais');
    monter('/seances/s');
    await user.click(screen.getByRole('button', { name: 'Imprimer' }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    const feuille = document.querySelector('.uwh-print--seance');
    expect(feuille).not.toBeNull();
    expect(feuille).toHaveTextContent('Phase 1 / 2 · Sortie de mur · 5 min');
    expect(feuille).toHaveTextContent('Phase 2 / 2 · Relais au fond · 5 min');
    // Une vignette par étape de chaque schéma.
    expect(feuille!.querySelectorAll('figure')).toHaveLength(2);
    fireEvent(window, new Event('afterprint'));
    await waitFor(() =>
      expect(document.querySelector('.uwh-print--seance')).toBeNull()
    );
    print.mockRestore();
  });

  it('« Supprimer la séance » est en contour, lisible', () => {
    const { create } = useSeances.getState();
    create('s', 'Jeudi');
    monter('/seances/s');
    expect(
      screen.getByRole('button', { name: 'Supprimer la séance' })
    ).toHaveAttribute('data-variant', 'outline');
  });

  it('partager donne un lien qui porte la séance et ses schémas, et son QR code', async () => {
    const user = userEvent.setup();
    const { create, addItem, updateItem } = useSeances.getState();
    create('s', 'Vendredi');
    addItem('s', 'sortie');
    addItem('s', 'relais');
    updateItem('s', 1, { minutes: 9, note: 'en relais' });
    monter('/seances/s');

    await user.click(screen.getByRole('button', { name: 'Partager' }));
    const feuille = screen.getByRole('dialog', { name: 'Partager la séance' });
    expect(
      within(feuille).getByText(/emporte la séance et ses 2 schémas/)
    ).toBeInTheDocument();

    const champ = await within(feuille).findByLabelText('Lien de la séance');
    const url = (champ as HTMLInputElement).value;
    const shared = seanceCodeFromHash(new URL(url).hash)!;
    expect(shared.compressed).toBe(true);
    const { seance, schemas } = await decodeSharedSeance(shared, {
      newId: () => crypto.randomUUID(),
      now: '2026-11-20T10:00:00.000Z',
    });
    expect(seance.name).toBe('Vendredi');
    expect(schemas.map(s => s.name)).toEqual([
      'Sortie de mur',
      'Relais au fond',
    ]);
    expect(seance.items[1]).toMatchObject({ minutes: 9, note: 'en relais' });

    expect(
      within(feuille).getByRole('button', { name: 'Envoyer le lien' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(feuille).getByAltText('QR code du lien vers cette séance')
      ).toBeInTheDocument()
    );
  });

  /**
   * LE MÊME CHOIX QUE POUR UN SCHÉMA (ADR 0035, 0040) : « Pour les joueurs »
   * donne le lien qui présente la séance, et le QR code le suit.
   */
  it('« Pour les joueurs » donne le lien qui présente la séance, et son QR code', async () => {
    const user = userEvent.setup();
    const { create, addItem } = useSeances.getState();
    create('s', 'Samedi');
    addItem('s', 'sortie');
    addItem('s', 'relais');
    monter('/seances/s');

    await user.click(screen.getByRole('button', { name: 'Partager' }));
    const feuille = screen.getByRole('dialog', { name: 'Partager la séance' });
    const pourModifier =
      await within(feuille).findByLabelText('Lien de la séance');
    const lienModifier = (pourModifier as HTMLInputElement).value;
    expect(
      within(feuille).getByRole('tab', { name: 'Pour modifier' })
    ).toHaveAttribute('aria-selected', 'true');

    await user.click(
      within(feuille).getByRole('tab', { name: 'Pour les joueurs' })
    );
    expect(
      within(feuille).getByText(/sans rien ranger dans leur bibliothèque/)
    ).toBeInTheDocument();
    const champ = within(feuille).getByLabelText('Lien pour les joueurs');
    const url = (champ as HTMLInputElement).value;
    const shared = seanceCodeFromHash(new URL(url).hash)!;
    expect(shared).toMatchObject({ compressed: true, player: true });
    // Le même code, derrière une autre clé.
    expect(shared.code).toBe(
      seanceCodeFromHash(new URL(lienModifier).hash)!.code
    );
    const { seance } = await decodeSharedSeance(shared, {
      newId: () => crypto.randomUUID(),
      now: '2026-11-20T10:00:00.000Z',
    });
    expect(seance.name).toBe('Samedi');
    expect(seance.items).toHaveLength(2);
    await waitFor(() =>
      expect(
        within(feuille).getByAltText('QR code du lien vers cette séance')
      ).toBeInTheDocument()
    );

    // Retour « Pour modifier » : le lien de toujours.
    await user.click(
      within(feuille).getByRole('tab', { name: 'Pour modifier' })
    );
    expect(within(feuille).getByLabelText('Lien de la séance')).toHaveValue(
      lienModifier
    );
  });

  it('une séance sans schéma présentable ne se partage pas', () => {
    const { create, addItem } = useSeances.getState();
    create('s', 'Vide');
    addItem('s', 'efface');
    monter('/seances/s');
    expect(screen.getByRole('button', { name: 'Partager' })).toBeDisabled();
  });

  it('les séances restées hors du compte attendent un geste pour y entrer', async () => {
    const user = userEvent.setup();
    const adopt = vi.fn(async () => 1);
    useSeances.setState({
      adopt,
      outside: [
        {
          id: 'ailleurs',
          name: 'Samedi, sur la tablette',
          items: [{ schemaId: 'sortie', minutes: 5, note: '' }],
          updatedAt: '2026-11-19T10:00:00.000Z',
        },
      ],
    });
    monter();

    const section = screen.getByRole('region', {
      name: 'Sur cet appareil, hors de votre compte',
    });
    await user.click(
      within(section).getByRole('button', {
        name: 'Ajouter à mon compte : « Samedi, sur la tablette »',
      })
    );
    expect(adopt).toHaveBeenCalledWith(['ailleurs']);
    expect(
      await screen.findByText('1 séance ajoutée à votre compte.')
    ).toBeInTheDocument();
  });
});
