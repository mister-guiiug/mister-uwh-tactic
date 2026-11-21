import { describe, expect, it } from 'vitest';
import { stickTip } from '../carry.ts';
import { createTactic, distance } from '../model.ts';
import { deepFreeze, learnPhase, N1, W1 } from './fixtures.ts';
import {
  checkRound,
  guessTactic,
  movingPlayers,
  nextStage,
  revealTactic,
  startRound,
  summarize,
  verdictOf,
  VERDICT_LIMITS,
  type LearnStage,
  type RoundResult,
} from './rounds.ts';

/**
 * Ce que ces tests figent : LE JEU MONTRE L'ÉTAPE SANS SOUFFLER LA RÉPONSE,
 * ET SANS TOUCHER AU SCHÉMA. Ni la flèche qui part du joueur ou y arrive,
 * ni le fantôme, ni le palet qu'il porte à sa place d'arrivée ; et le
 * schéma reçu reste tel quel — gelé, la moindre écriture lèverait.
 */
describe('la copie sans indice', () => {
  it('ne propose que les joueurs qui bougent pendant la phase', () => {
    expect(movingPlayers(learnPhase()).map(p => p.id)).toEqual([W1, N1]);
    const still = createTactic({ id: 'immobile', name: '' });
    still.steps.push(structuredClone(still.steps[0]!));
    expect(movingPlayers(still)).toEqual([]);
  });

  it('montre l’étape, tous à leur place sauf lui, posé où on l’a mis', () => {
    const tactic = deepFreeze(learnPhase());
    const before = JSON.stringify(tactic);
    const copy = guessTactic(tactic, 1, W1, { x: 5, y: 4 });

    expect(copy.steps).toHaveLength(1);
    const [step] = copy.steps;
    const start = tactic.steps[0]!.poses[W1]!;
    // Lui : là où on l'a posé, avec l'orientation et la profondeur d'avant.
    expect(step!.poses[W1]).toEqual({ ...start, x: 5, y: 4 });
    // Les autres : à leur place de l'étape.
    expect(step!.poses[N1]).toEqual(tactic.steps[1]!.poses[N1]);
    expect(step!.note).toBe(tactic.steps[1]!.note);
    // Le schéma reçu n'a pas bougé d'un octet.
    expect(JSON.stringify(tactic)).toBe(before);
  });

  it('retire ses flèches et le fantôme, garde celles des autres', () => {
    const tactic = deepFreeze(learnPhase());
    const copy = guessTactic(tactic, 1, W1, { x: 5, y: 4 });
    expect(copy.display.ghosts).toBe(false);
    expect(copy.steps[0]!.arrows).toEqual([tactic.steps[1]!.arrows[1]]);

    // Pour Noir 1, c'est l'inverse.
    const other = guessTactic(tactic, 1, N1, { x: 22, y: 6 });
    expect(other.steps[0]!.arrows).toEqual([tactic.steps[1]!.arrows[0]]);
  });

  it('la passe qu’il reçoit disparaît, et le palet reste au bout de SA crosse', () => {
    const tactic = deepFreeze(learnPhase());
    const guess = { x: 6, y: 3 };
    const step = guessTactic(tactic, 2, W1, guess).steps[0]!;
    // La passe arrive à 1,26 m de lui : retirée ; l'autre flèche reste.
    expect(step.arrows).toEqual([tactic.steps[2]!.arrows[1]]);
    // Le palet n'est pas à sa vraie place, qui dirait où il va.
    const placed = { ...tactic.steps[1]!.poses[W1]!, ...guess };
    expect(step.puck).toEqual(stickTip(placed, false));
    expect(distance(step.puck, tactic.steps[2]!.puck)).toBeGreaterThan(4);
  });

  it('la réponse : l’étape telle quelle, flèches comprises', () => {
    const tactic = deepFreeze(learnPhase());
    const copy = revealTactic(tactic, 2);
    expect(copy.steps).toEqual([tactic.steps[2]]);
    expect(copy.display.ghosts).toBe(false);
    expect(copy.id).toBe(tactic.id);
  });
});

describe('le verdict', () => {
  it('juste à un mètre, presque à deux, à revoir au-delà', () => {
    expect(VERDICT_LIMITS).toEqual({ right: 1, close: 2 });
    expect(verdictOf(0)).toBe('right');
    expect(verdictOf(1)).toBe('right');
    expect(verdictOf(1.01)).toBe('close');
    expect(verdictOf(2)).toBe('close');
    expect(verdictOf(2.01)).toBe('off');
  });
});

describe('la partie', () => {
  const round = (stage: LearnStage) => {
    if (stage.kind !== 'round')
      throw new Error(`étape attendue : ${stage.kind}`);
    return stage;
  };

  it('part de la deuxième étape, le joueur à sa place de la première', () => {
    const tactic = learnPhase();
    const first = round(startRound(tactic, W1));
    const start = tactic.steps[0]!.poses[W1]!;
    expect(first.step).toBe(1);
    expect(first.guess).toEqual({ x: start.x, y: start.y });
    expect(first.checked).toBeNull();
  });

  it('vérifie une fois, puis repart de sa VRAIE place', () => {
    const tactic = learnPhase();
    const placed = {
      ...round(startRound(tactic, W1)),
      guess: { x: 8, y: 8.5 },
    };
    const checked = round(checkRound(tactic, placed));
    expect(checked.checked).toEqual({ step: 1, gap: 1.5, verdict: 'close' });
    // Vérifier deux fois ne compte pas deux fois.
    expect(checkRound(tactic, checked)).toBe(checked);
    expect(checked.results).toHaveLength(1);

    const second = round(nextStage(tactic, checked));
    expect(second.step).toBe(2);
    expect(second.guess).toEqual({ x: 8, y: 7 });
    expect(second.results).toEqual(checked.results);
    // Sans vérifier, on ne passe pas.
    expect(nextStage(tactic, second)).toBe(second);
  });

  it('après la dernière étape, le bilan', () => {
    const tactic = learnPhase();
    let stage = startRound(tactic, W1);
    stage = nextStage(tactic, checkRound(tactic, stage));
    stage = checkRound(tactic, { ...round(stage), guess: { x: 11, y: 7 } });
    const summary = nextStage(tactic, stage);
    expect(summary).toMatchObject({ kind: 'summary', player: W1 });
    if (summary.kind !== 'summary') return;
    expect(summary.results.map(r => r.verdict)).toEqual(['off', 'right']);
  });
});

describe('le bilan', () => {
  const result = (step: number, gap: number): RoundResult => ({
    step,
    gap,
    verdict: verdictOf(gap),
  });

  it('compte les étapes justes et l’écart moyen', () => {
    expect(
      summarize([result(1, 0.5), result(2, 1.5), result(3, 4), result(4, 0)])
    ).toEqual({ steps: 4, right: 2, meanGap: 1.5 });
  });

  it('sans étape, un écart nul', () => {
    expect(summarize([])).toEqual({ steps: 0, right: 0, meanGap: 0 });
  });
});
