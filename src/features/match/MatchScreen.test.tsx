import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { newMatch } from './model.ts';
import { MatchScreen } from './MatchScreen.tsx';
import { useMatch } from './store.ts';

const vibrate = vi.fn();
const request = vi.fn(async () => ({
  released: false,
  release: vi.fn(async () => undefined),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(new Date('2026-11-21T18:00:00Z'));
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
  Object.defineProperty(navigator, 'vibrate', {
    configurable: true,
    value: vibrate,
  });
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request },
  });
  useMatch.getState().replace(newMatch());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vibrate.mockReset();
  request.mockClear();
  localStorage.clear();
});

const monter = () =>
  render(
    <I18nProvider>
      <ToastProvider>
        <MatchScreen />
      </ToastProvider>
    </I18nProvider>
  );

const avancer = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const clic = (name: string) =>
  act(() => {
    fireEvent.click(screen.getByRole('button', { name }));
  });

const chrono = () => screen.getAllByRole('timer')[0]!;

/**
 * Ce que ces tests figent : LE CHRONO AU BORD DU BASSIN. Le temps qui reste
 * en `role="timer"`, qui ne parle pas seul ; chaque fin vibre et se dit UNE
 * fois ; l'écran reste allumé tant que le match dure ; le score, les temps
 * morts et les exclusions se tiennent d'un toucher.
 */
describe('l’écran « Match »', () => {
  it('décompte la mi-temps une fois lancée', () => {
    monter();
    expect(chrono()).toHaveTextContent('10:00');
    clic('Démarrer le match');
    avancer(61_000);
    expect(chrono()).toHaveTextContent('8:59');
    expect(chrono()).toHaveAccessibleName('1re mi-temps, temps restant : 8:59');
  });

  it('se met en pause et repart d’où il en était', () => {
    monter();
    clic('Démarrer le match');
    avancer(10_000);
    clic('Pause');
    expect(screen.getByText('En pause')).toBeInTheDocument();
    avancer(30_000);
    expect(chrono()).toHaveTextContent('9:50');
    clic('Reprendre');
    avancer(5_000);
    expect(chrono()).toHaveTextContent('9:45');
  });

  it('garde l’écran allumé pendant le match, pas avant', () => {
    monter();
    expect(request).not.toHaveBeenCalled();
    clic('Démarrer le match');
    expect(request).toHaveBeenCalledWith('screen');
  });

  it('vibre et dit la fin de la mi-temps une seule fois', () => {
    const { unmount } = monter();
    clic('Démarrer le match');
    avancer(600_000);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Fin de la 1re mi-temps.')).toBeInTheDocument();
    expect(screen.getByText('Pause de mi-temps')).toBeInTheDocument();
    avancer(5_000);
    expect(vibrate).toHaveBeenCalledTimes(1);
    // Revenir sur l'écran ne la redit pas.
    unmount();
    monter();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Fin de la 1re mi-temps.')).toBeNull();
  });

  it('compte les buts des deux équipes', () => {
    monter();
    clic('Un but pour les Blancs');
    clic('Un but pour les Blancs');
    clic('Un but pour les Noirs');
    const blancs = within(screen.getByRole('region', { name: 'Blancs' }));
    expect(blancs.getByText('2')).toBeInTheDocument();
    clic('Retirer un but aux Noirs');
    expect(
      screen.getByRole('button', { name: 'Retirer un but aux Noirs' })
    ).toBeDisabled();
    expect(screen.getByText('Score : Blancs 2, Noirs 0.')).toBeInTheDocument();
  });

  it('un temps mort arrête le chrono, et sa minute se signale', () => {
    monter();
    clic('Démarrer le match');
    avancer(60_000);
    clic('Temps mort des Blancs');
    expect(screen.getByText('Pris dans la mi-temps : 1')).toBeInTheDocument();
    expect(
      screen.getByRole('timer', {
        name: 'Temps mort des Blancs, temps restant : 1:00',
      })
    ).toBeInTheDocument();
    avancer(60_000);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('Fin du temps mort des Blancs.')
    ).toBeInTheDocument();
    // Le chrono du match n'a pas bougé pendant la minute.
    expect(chrono()).toHaveTextContent('9:00');
    clic('Reprendre le jeu');
    avancer(10_000);
    expect(chrono()).toHaveTextContent('8:50');
  });

  it('exclut un joueur : numéro, équipe, durée, puis son compte à rebours', () => {
    monter();
    clic('Démarrer le match');
    clic('Exclure un joueur');
    const feuille = within(
      screen.getByRole('dialog', { name: 'Exclure un joueur' })
    );
    const valider = feuille.getByRole('button', { name: 'Exclure' });
    expect(valider).toBeDisabled();
    act(() => {
      fireEvent.change(feuille.getByLabelText('Numéro'), {
        target: { value: '4' },
      });
      fireEvent.click(feuille.getByRole('tab', { name: 'Noirs' }));
      fireEvent.click(feuille.getByRole('tab', { name: '5 min' }));
    });
    act(() => {
      fireEvent.click(valider);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.getByRole('timer', {
        name: 'N° 4 des Noirs, temps restant : 5:00',
      })
    ).toBeInTheDocument();

    avancer(300_000);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Peut revenir')).toBeInTheDocument();
    expect(
      screen.getByText('Fin d’exclusion : le n° 4 des Noirs peut revenir.')
    ).toBeInTheDocument();
  });

  it('règle les durées avant le coup d’envoi seulement', () => {
    monter();
    act(() => {
      fireEvent.change(screen.getByLabelText('Mi-temps (min)'), {
        target: { value: '15' },
      });
    });
    expect(chrono()).toHaveTextContent('15:00');
    clic('Démarrer le match');
    expect(screen.queryByLabelText('Mi-temps (min)')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Nouveau match' })
    ).toBeInTheDocument();
  });
});
