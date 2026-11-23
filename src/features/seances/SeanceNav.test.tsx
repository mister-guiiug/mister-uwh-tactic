import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../../i18n/index.ts';
import { createTactic } from '../board/model.ts';
import { boardStore } from '../board/store.ts';
import { useSchemas } from '../schemas/store.ts';
import { createSeance } from './model.ts';
import { useSeancePlay } from './play.ts';
import { SeanceNav } from './SeanceNav.tsx';
import { useSeances } from './store.ts';

const sortie = createTactic({ id: 'sortie', name: 'Sortie de mur' });
const relais = createTactic({ id: 'relais', name: 'Relais au fond' });
const seance = {
  ...createSeance('s1', 'Mardi'),
  items: [
    { schemaId: 'sortie', minutes: 2, note: '' },
    { schemaId: 'relais', minutes: 5, note: '' },
  ],
};

const vibrate = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(new Date('2026-11-20T10:00:00Z'));
  localStorage.setItem('dwc_locale', 'fr');
  Object.defineProperty(navigator, 'vibrate', {
    configurable: true,
    value: vibrate,
  });
  useSchemas.setState({ schemas: [sortie, relais], ready: true, error: null });
  useSeances.setState({ seances: [seance], ready: true });
  useSeancePlay.getState().start('s1', 0);
});

afterEach(() => {
  vi.useRealTimers();
  vibrate.mockReset();
  useSeancePlay.getState().stop();
  useSeances.setState({ seances: [] });
  useSchemas.setState({ schemas: [], ready: false });
});

const monter = () =>
  render(
    <I18nProvider>
      <SeanceNav />
    </I18nProvider>
  );

const avancer = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('le chronomètre de la séance', () => {
  it('décompte le temps prévu de la phase', () => {
    monter();
    expect(screen.getByRole('timer')).toHaveTextContent('2:00');
    avancer(61_000);
    expect(screen.getByRole('timer')).toHaveTextContent('0:59');
    expect(screen.getByRole('timer')).toHaveAccessibleName(
      'Temps restant pour la phase : 0:59'
    );
  });

  it('se met en pause et repart d’où il en était', () => {
    monter();
    avancer(10_000);
    fireEvent.click(
      screen.getByRole('button', { name: 'Mettre le chronomètre en pause' })
    );
    avancer(30_000);
    expect(screen.getByRole('timer')).toHaveTextContent('1:50');
    fireEvent.click(
      screen.getByRole('button', { name: 'Relancer le chronomètre' })
    );
    avancer(5_000);
    expect(screen.getByRole('timer')).toHaveTextContent('1:45');
  });

  it('vibre une fois au temps écoulé, puis compte le dépassement', () => {
    monter();
    const suivante = screen.getByRole('button', { name: 'Phase suivante' });
    expect(suivante).toHaveAttribute('data-variant', 'ghost');
    avancer(120_000);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Temps écoulé/)).toBeInTheDocument();
    // « Phase suivante » passe au premier plan.
    expect(suivante).toHaveAttribute('data-variant', 'primary');
    avancer(12_000);
    expect(screen.getByRole('timer')).toHaveTextContent('+0:12');
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('repart à zéro à la phase suivante', () => {
    monter();
    avancer(120_000);
    fireEvent.click(screen.getByRole('button', { name: 'Phase suivante' }));
    expect(screen.getByText('Phase 2 / 2')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('5:00');
    expect(useSeancePlay.getState().clock.rang).toBe(false);
  });
});

/**
 * UNE SÉANCE REÇUE PAR LE LIEN POUR LES JOUEURS (ADR 0040) n'est pas dans
 * la bibliothèque : la barre la lit dans la présentation, schémas compris.
 */
describe('une séance reçue pour les joueurs', () => {
  const engagement = createTactic({ id: 'recu-1', name: 'Engagement' });
  const contre = createTactic({ id: 'recu-2', name: 'Contre au mur' });
  const recue = {
    ...createSeance('recue', 'Jeudi'),
    items: [
      { schemaId: 'recu-1', minutes: 3, note: '' },
      { schemaId: 'recu-2', minutes: 4, note: 'au mur' },
    ],
  };

  beforeEach(() => {
    boardStore.getState().load(engagement);
    useSeancePlay
      .getState()
      .start('recue', 0, { seance: recue, schemas: [engagement, contre] });
  });

  it('se présente sans être dans la bibliothèque', () => {
    monter();
    expect(screen.getByText('Phase 1 / 2')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('3:00');
    fireEvent.click(screen.getByRole('button', { name: 'Phase suivante' }));
    expect(screen.getByText('Phase 2 / 2')).toBeInTheDocument();
    // La consigne passe par le lexique (`TermText`) : « mur » y est un terme.
    expect(document.querySelector('.uwh-seance-nav__note')).toHaveTextContent(
      'au mur'
    );
    expect(boardStore.getState().tactic.name).toBe('Contre au mur');
    expect(useSeances.getState().seances.map(s => s.id)).not.toContain('recue');
    fireEvent.click(screen.getByRole('button', { name: 'Phase précédente' }));
    expect(boardStore.getState().tactic.name).toBe('Engagement');
  });

  it('la séance reçue l’emporte sur la bibliothèque', () => {
    useSeances.setState({ seances: [{ ...seance, id: 'recue' }] });
    monter();
    // La séance reçue a deux phases de 3 et 4 min, celle de la
    // bibliothèque 2 et 5 : c'est la reçue qui se montre.
    expect(screen.getByRole('timer')).toHaveTextContent('3:00');
  });
});
