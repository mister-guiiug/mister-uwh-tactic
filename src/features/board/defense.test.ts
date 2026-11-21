import { describe, expect, it } from 'vitest';
import { attackSign } from './describe.ts';
import { DEFENSE, defenseStep, planDefense } from './defense.ts';
import {
  createTactic,
  DECK_REFEREE_ID,
  distance,
  MAX_PLAYERS,
  playerId,
  POOL_MARGIN,
  refereeId,
  type Pitch,
  type Point,
  type Step,
  type Tactic,
} from './model.ts';

const W = (n: number) => playerId('blanc', n);
const B = (n: number) => playerId('noir', n);
const NOIRS = Array.from({ length: MAX_PLAYERS }, (_, i) => B(i + 1));

/**
 * LES BLANCS ATTAQUENT dans la moitié des Noirs, restés à l'engagement : la
 * première étape est l'engagement, la seconde l'attaque. Le but des Noirs
 * est en x = 25, au milieu de la largeur (7,5 m).
 *
 * Du plus proche au plus loin de ce but : Blanc 5, 4, 2, 1, 3, puis Blanc 6,
 * resté près de la ligne médiane.
 */
const ATTACK: Record<number, Point> = {
  1: { x: 16, y: 4 },
  2: { x: 18, y: 7.5 },
  3: { x: 16, y: 11.5 },
  4: { x: 20, y: 5 },
  5: { x: 21, y: 10 },
  6: { x: 13, y: 7.5 },
};

function attack(pitch?: Pitch): Tactic {
  const tactic = createTactic({ id: 't', name: '', pitch });
  const next: Step = structuredClone(tactic.steps[0]!);
  for (const [n, point] of Object.entries(ATTACK)) {
    next.poses[W(Number(n))] = { ...point, angle: 0, surface: false };
  }
  next.puck = { x: 19, y: 7 };
  tactic.steps.push(next);
  return tactic;
}

/** Le point est-il sur le segment [a, b] ? */
const between = (point: Point, a: Point, b: Point) =>
  Math.abs(distance(a, point) + distance(point, b) - distance(a, b)) < 1e-6;

const markerOf = (
  roles: ReturnType<typeof planDefense>['roles'],
  attacker: string
) =>
  Object.entries(roles).find(
    ([, role]) => role.kind === 'mark' && role.attacker === attacker
  )?.[0];

describe('placer une équipe en défense', () => {
  it('chaque attaquant est marqué entre lui et le but, à 1,5 m, une fois', () => {
    const tactic = attack();
    const { goal, roles, step } = planDefense(tactic, 1, 'noir');
    expect(goal).toEqual({ x: 25, y: 7.5 });
    const marked = Object.values(roles).flatMap(role =>
      role.kind === 'mark' ? [role.attacker] : []
    );
    // Six défenseurs : un garde l'axe, cinq marquent. Le plus loin du but,
    // Blanc 6, reste libre.
    expect(marked.sort()).toEqual([W(1), W(2), W(3), W(4), W(5)].sort());
    for (const attacker of marked) {
      const id = markerOf(roles, attacker)!;
      const pose = step.poses[id]!;
      const target = step.poses[attacker]!;
      expect(distance(pose, target)).toBeCloseTo(DEFENSE.mark);
      expect(between(pose, target, goal)).toBe(true);
      // Tourné vers celui qu'il marque.
      const look =
        (Math.atan2(target.y - pose.y, target.x - pose.x) * 180) / Math.PI;
      expect(pose.angle).toBe((Math.round(look) + 360) % 360);
    }
  });

  it('le porteur du palet est serré, avant les autres : à 1 m devant son palet', () => {
    const tactic = attack();
    // Blanc 2 n'est que le troisième plus proche du but, mais il a le palet.
    tactic.steps[1]!.carrier = W(2);
    tactic.steps[1]!.puck = { x: 19.25, y: 7.65 };
    const { goal, roles, step } = planDefense(tactic, 1, 'noir');
    const id = markerOf(roles, W(2))!;
    expect(roles[id]).toEqual({ kind: 'mark', attacker: W(2), tight: true });
    expect(distance(step.poses[id]!, step.puck)).toBeCloseTo(DEFENSE.tight);
    expect(between(step.poses[id]!, step.puck, goal)).toBe(true);
    // Au fond, comme lui.
    expect(step.poses[id]!.surface).toBe(false);
  });

  it('un défenseur couvre l’axe, entre le palet et le milieu du but, à 3 m', () => {
    const tactic = attack();
    const { goal, roles, step } = planDefense(tactic, 1, 'noir');
    const axis = Object.entries(roles).filter(([, r]) => r.kind === 'axis');
    expect(axis).toHaveLength(1);
    const pose = step.poses[axis[0]![0]]!;
    expect(distance(pose, goal)).toBeCloseTo(DEFENSE.axis);
    expect(between(pose, goal, step.puck)).toBe(true);
  });

  it('le palet à moins de 6 m du but : l’axe est gardé à mi-chemin', () => {
    const tactic = attack();
    tactic.steps[1]!.puck = { x: 21, y: 7.5 };
    const { goal, roles, step } = planDefense(tactic, 1, 'noir');
    const id = Object.entries(roles).find(([, r]) => r.kind === 'axis')![0];
    expect(distance(step.poses[id]!, goal)).toBeCloseTo(2);
    expect(between(step.poses[id]!, goal, step.puck)).toBe(true);
  });

  it('la profondeur suit celle de l’attaquant marqué', () => {
    const tactic = attack();
    tactic.steps[1]!.poses[W(4)]!.surface = true;
    tactic.steps[1]!.poses[W(5)]!.surface = false;
    const { roles, step } = planDefense(tactic, 1, 'noir');
    expect(step.poses[markerOf(roles, W(4))!]!.surface).toBe(true);
    expect(step.poses[markerOf(roles, W(5))!]!.surface).toBe(false);
  });

  it('tout reste dans le bassin, même attaqué depuis les coins', () => {
    const pitch = { length: 21, width: 12, depth: 2 };
    const tactic = attack(pitch);
    const corners: Point[] = [
      { x: 21.8, y: -0.9 },
      { x: 21.8, y: 12.9 },
      { x: 20, y: -0.5 },
      { x: 20, y: 12.5 },
      { x: 17, y: 0 },
      { x: 17, y: 12 },
    ];
    corners.forEach((point, i) => {
      tactic.steps[1]!.poses[W(i + 1)] = { ...point, angle: 0, surface: false };
    });
    tactic.steps[1]!.puck = { x: 20.5, y: 0 };
    // Six attaquants dans les coins, puis aucun : les cinq défenseurs de
    // trop se rangent alors en travers, de part et d'autre de l'axe.
    for (const count of [6, 0]) {
      tactic.counts.blanc = count;
      const step = defenseStep(tactic, 1, 'noir');
      for (const id of NOIRS) {
        const pose = step.poses[id]!;
        expect(pose.x).toBeGreaterThanOrEqual(-POOL_MARGIN);
        expect(pose.x).toBeLessThanOrEqual(pitch.length + POOL_MARGIN);
        expect(pose.y).toBeGreaterThanOrEqual(-POOL_MARGIN);
        expect(pose.y).toBeLessThanOrEqual(pitch.width + POOL_MARGIN);
      }
    }
  });

  it('le sens d’attaque se lit sur le schéma : Blancs à droite, les Noirs défendent à gauche', () => {
    const tactic = attack();
    const { length } = tactic.pitch;
    // Toute la phase dessinée à l'envers, dans la longueur.
    for (const step of tactic.steps) {
      for (const [id, pose] of Object.entries(step.poses)) {
        if (!id.startsWith('blanc-') && !id.startsWith('noir-')) continue;
        step.poses[id] = { ...pose, x: length - pose.x };
      }
      step.puck = { x: length - step.puck.x, y: step.puck.y };
    }
    expect(attackSign(tactic, 'noir')).toBe(1);
    const { goal, roles, step } = planDefense(tactic, 1, 'noir');
    expect(goal).toEqual({ x: 0, y: 7.5 });
    const axis = Object.entries(roles).find(([, r]) => r.kind === 'axis')!;
    expect(step.poses[axis[0]]!.x).toBeLessThan(DEFENSE.axis + 1e-6);
    for (const [id, role] of Object.entries(roles)) {
      if (role.kind !== 'mark') continue;
      // Entre l'attaquant et le but de gauche.
      expect(step.poses[id]!.x).toBeLessThan(step.poses[role.attacker]!.x);
    }
  });

  it('un attaquant resté chez lui est attendu sur la ligne médiane, et le sens ne bascule pas', () => {
    // L'engagement : les Blancs contre leur mur, à l'autre bout.
    const tactic = createTactic({ id: 't', name: '' });
    const placed = defenseStep(tactic, 0, 'noir');
    const half = tactic.pitch.length / 2;
    for (const id of NOIRS) {
      expect(placed.poses[id]!.x).toBeGreaterThanOrEqual(half - 1e-9);
    }
    // Rejouer le geste sur son propre résultat ne change rien : le but lu
    // sur la première étape reste celui des Noirs.
    const again = { ...tactic, steps: [placed] };
    expect(attackSign(again, 'noir')).toBe(-1);
    expect(defenseStep(again, 0, 'noir').poses).toEqual(placed.poses);
  });

  it('un défenseur qui portait le palet le lâche, là où il est', () => {
    const tactic = attack();
    const step = tactic.steps[1]!;
    step.poses[B(3)] = { x: 22, y: 7, angle: 180, surface: false };
    step.carrier = B(3);
    step.puck = { x: 20.8, y: 7.1 };
    const next = defenseStep(tactic, 1, 'noir');
    expect(next.carrier).toBeUndefined();
    expect(next.puck).toEqual({ x: 20.8, y: 7.1 });
  });

  it('les défenseurs de trop se rangent à côté de celui de l’axe, tous les 2 m', () => {
    const tactic = attack();
    tactic.counts.blanc = 2;
    const { roles, step } = planDefense(tactic, 1, 'noir');
    const axisId = Object.entries(roles).find(([, r]) => r.kind === 'axis')![0];
    const axis = step.poses[axisId]!;
    const covers = Object.entries(roles)
      .filter(([, r]) => r.kind === 'cover')
      .map(([id]) => step.poses[id]!);
    expect(covers).toHaveLength(3);
    expect(covers.map(p => p.x)).toEqual([axis.x, axis.x, axis.x]);
    const offsets = covers.map(p => p.y - axis.y).sort((a, b) => a - b);
    [-1, 1, 2].forEach((k, i) =>
      expect(offsets[i]).toBeCloseTo(k * DEFENSE.spread)
    );
  });

  it('ni attaquants, ni remplaçants, ni arbitres ne bougent', () => {
    const tactic = attack();
    const before = tactic.steps[1]!;
    const after = defenseStep(tactic, 1, 'noir');
    for (const id of [
      ...[1, 2, 3, 4, 5, 6].map(W),
      W(7),
      B(8),
      refereeId(1),
      DECK_REFEREE_ID,
    ]) {
      expect(after.poses[id]).toEqual(before.poses[id]);
    }
    expect(after.puck).toEqual(before.puck);
  });

  it('une équipe sans personne dans l’eau ne change rien', () => {
    const tactic = attack();
    tactic.counts.noir = 0;
    expect(defenseStep(tactic, 1, 'noir')).toBe(tactic.steps[1]);
  });

  it('les Blancs se placent aussi, devant leur but', () => {
    const tactic = attack();
    // Les Noirs attaquent à leur tour : trois d'entre eux dans la moitié blanche.
    const step = tactic.steps[1]!;
    step.poses[B(1)] = { x: 6, y: 5, angle: 180, surface: false };
    step.poses[B(2)] = { x: 8, y: 9, angle: 180, surface: false };
    step.puck = { x: 6, y: 7 };
    const { goal, roles } = planDefense(tactic, 1, 'blanc');
    expect(goal).toEqual({ x: 0, y: 7.5 });
    const next = defenseStep(tactic, 1, 'blanc');
    for (const [id, role] of Object.entries(roles)) {
      // Aucun Blanc ne passe la ligne médiane.
      expect(next.poses[id]!.x).toBeLessThanOrEqual(12.5 + 1e-9);
      if (role.kind === 'mark') {
        expect(next.poses[id]!.x).toBeLessThan(next.poses[role.attacker]!.x);
      }
    }
  });
});
