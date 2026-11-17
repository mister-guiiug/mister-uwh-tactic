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
});
