import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { I18nProvider } from '../../../i18n/index.ts';
import { boardFrame } from '../boardFrame.ts';
import { boardStore, createBoardStore, draftStore } from '../store.ts';
import { deepFreeze, learnPhase, W1 } from './fixtures.ts';
import { LearnSheet } from './LearnSheet.tsx';
import { pitchToPercent } from './screen.ts';

vi.mock('@mister-guiiug/dev-pwa-config/analytics', () => ({
  trackEvent: vi.fn(),
}));

const monter = (
  tactic = deepFreeze(learnPhase()),
  selected: string | null = null
) =>
  render(
    <I18nProvider>
      <LearnSheet tactic={tactic} selected={selected} onClose={() => {}} />
    </I18nProvider>
  );

const jeton = () =>
  screen.getByRole('button', { name: 'Votre jeton, Blanc 1' });
const annonce = () => screen.getByRole('status');

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
  vi.mocked(trackEvent).mockClear();
});

afterEach(cleanup);

/**
 * Ce que ces tests figent : UNE PARTIE ENTIÈRE, SANS TOUCHER AU TABLEAU.
 * Choisir son joueur, le déplacer au clavier, vérifier, lire le verdict
 * annoncé, repartir de sa vraie place, finir sur le bilan — et le
 * brouillon, ni rechargé ni réenregistré.
 */

describe('à toi de jouer', () => {
  it('se joue jusqu’au bilan sans toucher au brouillon', async () => {
    const user = userEvent.setup();
    const draft = boardStore.getState().tactic;
    const save = vi.spyOn(draftStore, 'save');
    monter();

    // Les joueurs qui bougent, et eux seuls.
    expect(screen.getByText('Quel joueur êtes-vous ?')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('listitem')
        .map(item => item.textContent)
        .sort()
    ).toEqual(['Blanc 1', 'Noir 1']);
    await user.click(screen.getByRole('button', { name: 'Blanc 1' }));

    expect(screen.getByText('Blanc 1 · étape 2 sur 3')).toBeInTheDocument();
    expect(annonce()).toHaveTextContent(
      'Glissez votre jeton où vous devez être, puis vérifiez.'
    );
    expect(jeton()).toHaveFocus();

    // Quatorze pas d'un demi-mètre vers la droite, puis Entrée.
    for (let i = 0; i < 14; i += 1) {
      fireEvent.keyDown(jeton(), { key: 'ArrowRight' });
    }
    fireEvent.keyDown(jeton(), { key: 'Enter' });
    // De (0,6 ; 3,5) à (7,6 ; 3,5) : la bonne place est (8 ; 7), à 3,5 m.
    expect(annonce()).toHaveTextContent('À revoir : 3,5 m de la bonne place.');
    expect(annonce()).toHaveAttribute('data-verdict', 'off');
    expect(
      screen.getByText('Blanc 1 plonge vers le centre.')
    ).toBeInTheDocument();
    // Le jeton s'efface, le focus passe à la suite.
    expect(
      screen.getByRole('button', { name: 'Étape suivante' })
    ).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Étape suivante' }));
    expect(screen.getByText('Blanc 1 · étape 3 sur 3')).toBeInTheDocument();
    // Il repart de sa VRAIE place de l'étape 2, pas de celle qu'on lui
    // avait donnée.
    const at = pitchToPercent(
      { x: 8, y: 7 },
      boardFrame(learnPhase().pitch, false)
    );
    // EN NOMBRE, À TROIS DÉCIMALES : depuis jsdom 31, comme un navigateur,
    // `style.left` relit le pourcentage arrondi à quatre décimales
    // (`34.8993%`), pas la chaîne écrite (`34.899328859060404%`).
    expect(Number.parseFloat(jeton().style.left)).toBeCloseTo(at.left, 3);
    expect(Number.parseFloat(jeton().style.top)).toBeCloseTo(at.top, 3);

    fireEvent.keyDown(jeton(), { key: 'ArrowRight' });
    fireEvent.keyDown(jeton(), { key: 'ArrowRight' });
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    // De (9 ; 7) à (11 ; 7,5) : 2,06 m.
    expect(annonce()).toHaveTextContent('À revoir : 2,1 m de la bonne place.');

    await user.click(screen.getByRole('button', { name: 'Voir le bilan' }));
    expect(annonce()).toHaveTextContent(
      '0 étape juste sur 2. Écart moyen : 2,8 m.'
    );
    expect(screen.getByText('Étape 2 : À revoir, 3,5 m')).toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledWith('a_toi_de_jouer', {
      etapes: 2,
      justes: 0,
    });

    // Recommencer : la même partie, depuis le début.
    await user.click(screen.getByRole('button', { name: 'Recommencer' }));
    expect(screen.getByText('Blanc 1 · étape 2 sur 3')).toBeInTheDocument();

    // Le tableau n'a rien vu passer.
    expect(boardStore.getState().tactic).toBe(draft);
    expect(save).not.toHaveBeenCalled();
    save.mockRestore();
  });

  it('part du joueur sélectionné au tableau, sans rien demander', () => {
    monter(deepFreeze(learnPhase()), W1);
    expect(screen.queryByText('Quel joueur êtes-vous ?')).toBeNull();
    expect(screen.getByText('Blanc 1 · étape 2 sur 3')).toBeInTheDocument();
    // Au clavier, jusqu'à la bonne place : de (0,6 ; 3,5) à (8 ; 7), par
    // demi-mètres, puis au décimètre avec Maj.
    const press = (key: string, times: number, shiftKey = false) => {
      for (let i = 0; i < times; i += 1) {
        fireEvent.keyDown(jeton(), { key, shiftKey });
      }
    };
    press('ArrowRight', 14);
    press('ArrowRight', 4, true);
    press('ArrowDown', 7);
    fireEvent.keyDown(jeton(), { key: 'Enter' });
    expect(annonce()).toHaveTextContent('Juste : 0,0 m de la bonne place.');
    expect(annonce()).toHaveAttribute('data-verdict', 'right');
  });

  it('le jeton suit le doigt, et un toucher ailleurs le pose là', () => {
    monter(deepFreeze(learnPhase()), W1);
    const layer = jeton().parentElement!;
    // Dix pixels par mètre : le terrain couché fait 298 × 198 px.
    layer.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 298, height: 198 }) as DOMRect;
    // Un toucher au centre du terrain, relâché.
    fireEvent.pointerDown(layer, { clientX: 149, clientY: 99, pointerId: 1 });
    fireEvent.pointerUp(layer, { clientX: 149, clientY: 99, pointerId: 1 });
    const frame = boardFrame(learnPhase().pitch, false);
    const center = pitchToPercent({ x: 12.5, y: 7.5 }, frame);
    expect(Number.parseFloat(jeton().style.left)).toBeCloseTo(center.left, 3);
    expect(Number.parseFloat(jeton().style.top)).toBeCloseTo(center.top, 3);

    // Saisi, il glisse de 2 m vers la droite, sans sauter sous le doigt.
    fireEvent.pointerDown(jeton(), { clientX: 152, clientY: 99, pointerId: 1 });
    fireEvent.pointerMove(layer, { clientX: 172, clientY: 99, pointerId: 1 });
    fireEvent.pointerUp(layer, { clientX: 172, clientY: 99, pointerId: 1 });
    const moved = pitchToPercent({ x: 14.5, y: 7.5 }, frame);
    expect(Number.parseFloat(jeton().style.left)).toBeCloseTo(moved.left, 3);
  });

  it('nomme le joueur par son prénom quand le schéma en a un (ADR 0028)', async () => {
    const user = userEvent.setup();
    // Le prénom posé comme le pose « Appliquer mon effectif ».
    const board = createBoardStore(learnPhase());
    board.getState().applyIdentities({
      [W1]: { name: 'Paul', leftHanded: false },
    });
    monter(deepFreeze(board.getState().tactic));

    await user.click(screen.getByRole('button', { name: 'Blanc 1 · Paul' }));
    expect(
      screen.getByText('Blanc 1 · Paul · étape 2 sur 3')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Votre jeton, Blanc 1 · Paul' })
    ).toHaveFocus();
  });

  it('une phase d’une seule étape ne propose pas le jeu, et le dit', () => {
    const tactic = learnPhase();
    tactic.steps.splice(1);
    monter(deepFreeze(tactic), W1);
    expect(
      screen.getByText('Il faut au moins deux étapes.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Votre jeton/ })).toBeNull();
  });
});
