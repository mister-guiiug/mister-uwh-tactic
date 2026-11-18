import { describe, expect, it } from 'vitest';
import {
  easeInOut,
  FLICK_HEIGHT,
  flickHeight,
  frameAt,
  lerpAngle,
} from './frame.ts';
import { createTactic, playerId } from './model.ts';

function twoSteps() {
  const t = createTactic({ id: 't', name: '', now: '2026-11-17T00:00:00Z' });
  const second = structuredClone(t.steps[0]!);
  const id = playerId('blanc', 1);
  second.poses[id] = { x: 10.6, y: 3, angle: 90, surface: false };
  second.puck = { x: 2.5, y: 7.5 };
  t.steps.push(second);
  return { t, id };
}

describe('l’image à un instant', () => {
  it('l’angle prend le plus court chemin', () => {
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(0);
    expect(lerpAngle(10, 350, 0.5)).toBeCloseTo(0);
    expect(lerpAngle(0, 90, 0.5)).toBeCloseTo(45);
  });

  it('la transition démarre et finit sans à-coup', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.1)).toBeLessThan(0.1);
  });

  it('sur une étape entière, l’image est l’étape', () => {
    const { t, id } = twoSteps();
    const frame = frameAt(t, 1);
    const p = frame.players.find(pl => pl.id === id)!;
    expect(p).toMatchObject({ x: 10.6, y: 3, angle: 90, surfaceness: 0 });
    expect(frame.puck).toEqual({ x: 2.5, y: 7.5 });
  });

  it('à mi-chemin, position et profondeur sont à mi-chemin', () => {
    const { t, id } = twoSteps();
    const p = frameAt(t, 0.5).players.find(pl => pl.id === id)!;
    expect(p.x).toBeCloseTo(5.6);
    expect(p.surfaceness).toBeCloseTo(0.5);
    expect(p.angle).toBeCloseTo(45);
  });

  it('une tête de lecture hors bornes est ramenée', () => {
    const { t } = twoSteps();
    expect(frameAt(t, 99).puck).toEqual({ x: 2.5, y: 7.5 });
    expect(frameAt(t, -3).puck).toEqual({ x: 12.5, y: 7.5 });
  });

  it('la ligne d’arbitres relie les deux arbitres affichés', () => {
    const { t } = twoSteps();
    const frame = frameAt(t, 0);
    expect(frame.refereeLine?.map(r => r.number)).toEqual([1, 2]);
    t.display.refereeLine = null;
    expect(frameAt(t, 0).refereeLine).toBeNull();
  });

  it('un flick fait décoller le palet entre deux étapes, une passe non', () => {
    const { t } = twoSteps();
    const [a, b] = t.steps as [(typeof t.steps)[0], (typeof t.steps)[0]];
    expect(flickHeight(a, b, 0.5)).toBe(0);
    a.arrows = [{ kind: 'flick', from: a.puck, to: b.puck }];
    expect(flickHeight(a, b, 0.5)).toBeCloseTo(FLICK_HEIGHT);
    expect(flickHeight(a, b, 0)).toBe(0);
    expect(frameAt(t, 0.5).puckHeight).toBeCloseTo(FLICK_HEIGHT);
    a.arrows = [{ kind: 'pass', from: a.puck, to: b.puck }];
    expect(frameAt(t, 0.5).puckHeight).toBe(0);
  });
});
