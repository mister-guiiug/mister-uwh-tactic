import { describe, expect, it } from 'vitest';
import { CARRY, settleStep, stickTip } from './carry.ts';
import { createBoardStore, REFEREE_GAP } from './store.ts';
import { encodeTactic, decodeTactic } from './share.ts';
import {
  createTactic,
  distance,
  playerId,
  PUCK_ID,
  refereeId,
} from './model.ts';

const W1 = playerId('blanc', 1);
const W7 = playerId('blanc', 7);
const fresh = () =>
  createTactic({ id: 't', name: '', now: '2026-11-20T00:00:00Z' });
const store = () => createBoardStore(fresh());
const current = (s: ReturnType<typeof store>) =>
  s.getState().tactic.steps[s.getState().step]!;

/**
 * Ce que ces tests figent : LE PALET EST TOUJOURS AU FOND, ET SON PORTEUR
 * AUSSI. Le palet est au bout de sa crosse et le suit ; un porteur qui
 * remonte le lâche.
 */
describe('la crosse et le palet', () => {
  it('le palet est devant le joueur, du côté de sa main', () => {
    const pose = { x: 10, y: 5, angle: 0, surface: false };
    expect(stickTip(pose, false)).toEqual({
      x: 10 + CARRY.ahead,
      y: 5 + CARRY.side,
    });
    // Le gaucher tient la crosse de l'autre main.
    expect(stickTip(pose, true).y).toBeCloseTo(5 - CARRY.side);
    // Tourné d'un quart de tour, le palet est devant lui, vers +y.
    const turned = stickTip({ ...pose, angle: 90 }, false);
    expect(turned.x).toBeCloseTo(10 - CARRY.side);
    expect(turned.y).toBeCloseTo(5 + CARRY.ahead);
  });

  it('un porteur en surface, ou remplaçant, lâche le palet', () => {
    const t = fresh();
    const step = structuredClone(t.steps[0]!);
    step.carrier = W1;
    step.poses[W1] = { ...step.poses[W1]!, surface: true };
    expect(settleStep(t, step).carrier).toBeUndefined();
    step.carrier = W7;
    expect(settleStep(t, step).carrier).toBeUndefined();
  });

  it('donner le palet fait descendre le joueur, et le palet suit sa crosse', () => {
    const s = store();
    s.getState().setCarrier(W1);
    const step = current(s);
    expect(step.carrier).toBe(W1);
    expect(step.poses[W1]!.surface).toBe(false);
    expect(distance(step.puck, stickTip(step.poses[W1]!, false))).toBeLessThan(
      1e-6
    );

    s.getState().move(W1, { x: 8, y: 6 });
    s.getState().rotate(W1, 45);
    const moved = current(s);
    expect(
      distance(moved.puck, stickTip(moved.poses[W1]!, false))
    ).toBeLessThan(1e-6);
  });

  it('remonter lâche le palet, qui reste au fond où il était', () => {
    const s = store();
    s.getState().setCarrier(W1);
    const before = current(s).puck;
    s.getState().setSurface(W1, true);
    expect(current(s).carrier).toBeUndefined();
    expect(current(s).puck).toEqual(before);
  });

  it('déplacer le palet seul le lâche', () => {
    const s = store();
    s.getState().setCarrier(W1);
    s.getState().move(PUCK_ID, { x: 12, y: 7 });
    expect(current(s).carrier).toBeUndefined();
    expect(current(s).puck).toEqual({ x: 12, y: 7 });
  });

  it('une passe tracée près du palet part du palet', () => {
    const s = store();
    const puck = current(s).puck;
    s.getState().addArrow({
      kind: 'pass',
      from: { x: puck.x + 0.8, y: puck.y },
      to: { x: puck.x + 5, y: puck.y },
    });
    expect(current(s).arrows[0]!.from).toEqual(puck);
  });

  it('les arbitres de l’eau se placent de part et d’autre du palet, face à lui', () => {
    const s = store();
    s.getState().move(PUCK_ID, { x: 8, y: 7.5 });
    s.getState().followPuck();
    const { poses, puck } = current(s);
    const r1 = poses[refereeId(1)]!;
    const r2 = poses[refereeId(2)]!;
    expect(r1).toMatchObject({ x: puck.x, y: puck.y - REFEREE_GAP, angle: 90 });
    expect(r2).toMatchObject({ x: puck.x, y: puck.y + REFEREE_GAP });
    expect(distance(poses[refereeId(3)]!, puck)).toBeCloseTo(REFEREE_GAP);
  });

  it('l’arrêt de jeu et l’apnée d’un joueur se posent et se retirent', () => {
    const s = store();
    s.getState().setDecision({ kind: 'free', team: 'noir' });
    expect(current(s).decision).toEqual({ kind: 'free', team: 'noir' });
    s.getState().setDecision(null);
    expect(current(s).decision).toBeUndefined();

    s.getState().setApnea(W1, 99);
    const player = () =>
      s.getState().tactic.roster.players.find(p => p.id === W1)!;
    expect(player().apnea).toBe(60);
    s.getState().setApnea(W1, null);
    expect(player().apnea).toBeUndefined();
  });

  it('le lien partagé garde porteur, arrêt de jeu, apnée et vitesse', () => {
    const s = store();
    s.getState().setCarrier(W1);
    s.getState().setDecision({ kind: 'timeout' });
    s.getState().setApnea(W1, 12);
    s.getState().setDisplay({
      maxSpeed: 1.5,
      recoveryRatio: 0.75,
      flickHeight: 0.4,
    });
    const back = decodeTactic(encodeTactic(s.getState().tactic), {
      id: 'x',
      now: '2026-11-20T00:00:00Z',
    });
    expect(back.steps[0]!.carrier).toBe(W1);
    expect(back.steps[0]!.decision).toEqual({ kind: 'timeout' });
    expect(back.roster.players.find(p => p.id === W1)!.apnea).toBe(12);
    expect(back.display.maxSpeed).toBe(1.5);
    expect(back.display.recoveryRatio).toBe(0.75);
    expect(back.display.flickHeight).toBe(0.4);
  });
});
