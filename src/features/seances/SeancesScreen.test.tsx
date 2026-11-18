import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { createTactic } from '../board/model.ts';
import { useSchemas } from '../schemas/store.ts';
import { SeancesScreen } from './SeancesScreen.tsx';
import { useSeances } from './store.ts';

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

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
  useSeances.getState().load();
  useSchemas.setState({ schemas: [sortie, relais], ready: true, error: null });
});

afterEach(() => {
  useSchemas.setState({ schemas: [], ready: false });
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
});
