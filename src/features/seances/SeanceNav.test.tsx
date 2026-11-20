import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../../i18n/index.ts';
import { createTactic } from '../board/model.ts';
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
