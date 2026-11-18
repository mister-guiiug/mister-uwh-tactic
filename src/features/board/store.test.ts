import { describe, expect, it } from 'vitest';
import { createBoardStore, SECONDS_PER_STEP } from './store.ts';
import {
  createTactic,
  DECK_REFEREE_ID,
  DEFAULT_PITCH,
  playerId,
  POOL_MARGIN,
  PUCK_ID,
} from './model.ts';

const W1 = playerId('blanc', 1);

function store() {
  return createBoardStore(
    createTactic({ id: 't', name: '', now: '2026-11-17T00:00:00Z' })
  );
}

const pose = (
  s: ReturnType<typeof store>,
  id: string,
  step = s.getState().step
) => s.getState().tactic.steps[step]!.poses[id]!;

describe('le magasin du tableau', () => {
  it('déplace un jeton dans le bassin, jamais au-dehors', () => {
    const s = store();
    s.getState().move(W1, { x: 30, y: -2 });
    expect(pose(s, W1)).toMatchObject({ x: 25 + POOL_MARGIN, y: -POOL_MARGIN });
    s.getState().move(PUCK_ID, { x: 4, y: 5 });
    expect(s.getState().tactic.steps[0]!.puck).toEqual({ x: 4, y: 5 });
  });

  it('tourne en degrés entiers, dans [0, 360)', () => {
    const s = store();
    s.getState().rotate(W1, -14.6);
    expect(pose(s, W1).angle).toBe(345);
  });

  it('une étape ajoutée copie la courante et devient la courante', () => {
    const s = store();
    s.getState().move(W1, { x: 5, y: 5 });
    s.getState().setNote('première');
    s.getState().addStep();
    const state = s.getState();
    expect(state.tactic.steps).toHaveLength(2);
    expect(state.step).toBe(1);
    expect(pose(s, W1, 1)).toMatchObject({ x: 5, y: 5 });
    expect(state.tactic.steps[1]!.note).toBe('');
  });

  it('garde toujours au moins une étape', () => {
    const s = store();
    s.getState().removeStep();
    expect(s.getState().tactic.steps).toHaveLength(1);
  });

  it('n’accepte que 0, 2 ou 3 arbitres, et 0 à 6 joueurs', () => {
    const s = store();
    s.getState().setCount('referees', 2);
    s.getState().setCount('referees', 1);
    expect(s.getState().tactic.counts.referees).toBe(2);
    s.getState().setCount('referees', 3);
    expect(s.getState().tactic.counts.referees).toBe(3);
    s.getState().setCount('noir', 9);
    expect(s.getState().tactic.counts.noir).toBe(6);
  });

  it('la lecture avance au rythme réglé et s’arrête à la dernière étape', () => {
    const s = store();
    s.getState().addStep();
    s.getState().addStep();
    s.getState().goTo(0);
    s.getState().play();
    s.getState().tick(SECONDS_PER_STEP / 2);
    expect(s.getState().playhead).toBeCloseTo(0.5);
    s.getState().setSpeed(2);
    s.getState().tick(SECONDS_PER_STEP / 2);
    expect(s.getState().playhead).toBeCloseTo(1.5);
    expect(s.getState().step).toBe(1);
    s.getState().tick(10);
    expect(s.getState()).toMatchObject({
      playing: false,
      playhead: 2,
      step: 2,
    });
  });

  it('au bout de la phase, « Lire » la rejoue depuis le début', () => {
    const s = store();
    s.getState().addStep();
    s.getState().play();
    expect(s.getState()).toMatchObject({ playing: true, step: 0, playhead: 0 });
  });

  it('éditer arrête la lecture et revient sur l’étape courante', () => {
    const s = store();
    s.getState().addStep();
    s.getState().goTo(0);
    s.getState().play();
    s.getState().tick(SECONDS_PER_STEP * 0.4);
    s.getState().move(W1, { x: 3, y: 3 });
    expect(s.getState()).toMatchObject({
      playing: false,
      playhead: 0,
      step: 0,
    });
    expect(pose(s, W1, 0)).toMatchObject({ x: 3, y: 3 });
  });

  it('un bassin plus petit garde chacun à sa place relative', () => {
    const s = store();
    const before = pose(s, playerId('noir', 1));
    s.getState().setPitch({ length: 21 });
    const black = pose(s, playerId('noir', 1));
    // Contre son mur avant, contre son mur après.
    expect(black.x).toBeCloseTo((before.x * 21) / 25);
    expect(black.x).toBeLessThanOrEqual(21);
    // L'arbitre de bord reste sur la plage, à la même distance du bord.
    const deck = pose(s, DECK_REFEREE_ID);
    expect(deck.y).toBeGreaterThan(DEFAULT_PITCH.width + POOL_MARGIN);
    s.getState().setPitch({ depth: 9 });
    expect(s.getState().tactic.pitch.depth).toBe(3.65);
  });

  it('l’arbitre de bord reste sur la plage', () => {
    const s = store();
    s.getState().move(DECK_REFEREE_ID, { x: 10, y: 8 });
    const deck = pose(s, DECK_REFEREE_ID);
    expect(deck.y).toBeGreaterThan(DEFAULT_PITCH.width + POOL_MARGIN);
  });

  it('règle remplaçants et arbitre de bord', () => {
    const s = store();
    s.getState().setSubstitutes('blanc', 9);
    s.getState().setSubstitutes('noir', 1);
    s.getState().setDeckReferee(false);
    expect(s.getState().tactic.counts).toMatchObject({
      substitutes: { blanc: 4, noir: 1 },
      deckReferee: false,
    });
  });

  it('place une équipe en composition, et la renomme si on le demande', () => {
    const s = store();
    s.getState().setSurface(playerId('noir', 6), false);
    s.getState().applyFormation('noir', '3-2-1', {
      [playerId('noir', 1)]: 'Av G',
      [playerId('noir', 6)]: 'Ar',
    });
    const back = pose(s, playerId('noir', 6));
    const front = pose(s, playerId('noir', 1));
    // Les Noirs défendent le but des x élevés : l'arrière en est plus près.
    expect(back.x).toBeGreaterThan(front.x);
    expect(back.surface).toBe(false);
    const names = s.getState().tactic.roster.players;
    expect(names.find(p => p.id === playerId('noir', 1))!.name).toBe('Av G');
    expect(names.find(p => p.id === playerId('noir', 6))!.name).toBe('Ar');
    // Les Blancs n'ont pas bougé.
    expect(pose(s, W1).x).toBeLessThan(1);
  });

  it('la profondeur ne concerne que les joueurs', () => {
    const s = store();
    s.getState().setSurface(W1, false);
    expect(pose(s, W1).surface).toBe(false);
    s.getState().setSurface('arbitre-1', false);
    expect(pose(s, 'arbitre-1').surface).toBeUndefined();
  });

  it('annule et rétablit, un glisser comptant pour un seul geste', () => {
    const s = store();
    const start = pose(s, W1);
    s.getState().move(W1, { x: 3, y: 3 });
    s.getState().move(W1, { x: 4, y: 3 });
    s.getState().move(W1, { x: 5, y: 3 });
    s.getState().setSurface(W1, false);
    expect(s.getState().past).toHaveLength(2);
    s.getState().undo();
    expect(pose(s, W1).surface).toBe(true);
    s.getState().undo();
    expect(pose(s, W1)).toMatchObject({ x: start.x, y: start.y });
    s.getState().redo();
    expect(pose(s, W1)).toMatchObject({ x: 5, y: 3 });
    // Un nouveau geste efface ce qui restait à rétablir.
    s.getState().rotate(W1, 90);
    expect(s.getState().future).toHaveLength(0);
  });

  it('une sélection se compose, se déplace et tourne ensemble', () => {
    const s = store();
    const W2 = playerId('blanc', 2);
    s.getState().select(W1);
    s.getState().select(W2, true);
    expect(s.getState()).toMatchObject({ selected: W1, extra: [W2] });
    const a = pose(s, W1);
    const b = pose(s, W2);
    s.getState().move(W1, { x: a.x + 2, y: a.y });
    expect(pose(s, W2).x).toBeCloseTo(b.x + 2);
    s.getState().rotateSelection(90);
    expect(pose(s, W1).angle).toBe(90);
    s.getState().select(W2, true);
    expect(s.getState()).toMatchObject({ selected: W1, extra: [] });
    s.getState().selectTeam('noir');
    expect(1 + s.getState().extra.length).toBe(6);
  });

  it('un remplaçant entre à la place du joueur, qui part dans la zone', () => {
    const s = store();
    const sub = playerId('blanc', 8);
    const field = pose(s, W1);
    const bench = pose(s, sub);
    s.getState().substitute(W1, sub);
    expect(pose(s, sub)).toEqual(field);
    expect(pose(s, W1)).toEqual(bench);
  });

  it('ajoute et retire des flèches, règle la durée', () => {
    const s = store();
    s.getState().addArrow({
      kind: 'move',
      from: { x: 1, y: 1 },
      to: { x: 40, y: 1 },
    });
    const arrows = s.getState().tactic.steps[0]!.arrows;
    expect(arrows).toHaveLength(1);
    expect(arrows[0]!.to.x).toBeLessThanOrEqual(26);
    s.getState().removeArrow(0);
    expect(s.getState().tactic.steps[0]!.arrows).toHaveLength(0);
    s.getState().setDuration(99);
    expect(s.getState().tactic.steps[0]!.duration).toBe(60);
  });

  it('une étape nouvelle ne recopie pas les flèches', () => {
    const s = store();
    s.getState().addArrow({
      kind: 'pass',
      from: { x: 1, y: 1 },
      to: { x: 5, y: 1 },
    });
    s.getState().addStep();
    expect(s.getState().tactic.steps[1]!.arrows).toHaveLength(0);
  });

  it('place une situation du règlement sur l’étape courante', () => {
    const s = store();
    s.getState().applySituation('penalty-noir');
    const step = s.getState().tactic.steps[0]!;
    expect(step.puck).toEqual({ x: 22, y: 7.5 });
  });
});
