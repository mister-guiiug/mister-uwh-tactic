import { attackSign } from './describe.ts';
import {
  clampFor,
  distance,
  isSubstitute,
  normalizeAngle,
  visiblePlayers,
  type Point,
  type Pose,
  type Step,
  type Tactic,
  type Team,
} from './model.ts';

/**
 * PLACER UNE ÉQUIPE EN DÉFENSE (ADR 0032) : l'entraîneur dessine son
 * équipe, et l'autre prend d'un geste une place défendable sur l'étape en
 * cours. Une aide au placement, pas une intelligence de jeu — la règle tient
 * en trois phrases :
 *
 * 1. Le défenseur le plus proche de l'axe le garde : entre le palet et le
 *    milieu de son but, à 3 m du but — à mi-chemin si le palet est plus près.
 * 2. Chaque attaquant, le porteur du palet d'abord puis du plus proche au
 *    plus loin du but, est pris par le défenseur libre le plus proche :
 *    entre lui et le but, à 1,5 m et à sa profondeur — le porteur, à 1 m
 *    devant son palet —, sans passer dans l'autre moitié : un attaquant
 *    resté chez lui est attendu sur la ligne médiane, en face de lui.
 * 3. Le but défendu se lit sur la première étape, comme le sens d'attaque
 *    de l'étape racontée (`attackSign`) ; un attaquant de trop reste libre,
 *    un défenseur de trop se range à côté de celui de l'axe, et tout reste
 *    dans le bassin.
 *
 * Seuls bougent les joueurs dans l'eau de l'équipe qui défend : ni les
 * attaquants, ni les remplaçants, ni les arbitres. Un défenseur qui portait
 * le palet le lâche, là où il est : son équipe ne l'a plus.
 */
export const DEFENSE = {
  /** L'écart du marquage, en mètres, de l'attaquant à son défenseur. */
  mark: 1.5,
  /** Le porteur est serré : entre son palet et le but, à cet écart du palet. */
  tight: 1,
  /** Celui de l'axe, à cette distance du milieu de son but. */
  axis: 3,
  /** Les défenseurs sans attaquant à marquer, à côté de lui, tous les… */
  spread: 2,
} as const;

/** Ce que fait chaque défenseur placé. */
export type DefenseRole =
  | { kind: 'axis' }
  | { kind: 'mark'; attacker: string; tight: boolean }
  | { kind: 'cover' };

export interface DefensePlan {
  /** Le milieu du but défendu, sur sa ligne de but. */
  goal: Point;
  /** Le rôle de chaque défenseur placé, par identifiant. */
  roles: Record<string, DefenseRole>;
  /** L'étape, l'équipe placée ; la même étape si personne ne défend. */
  step: Step;
}

const EPSILON = 1e-6;
const other = (team: Team): Team => (team === 'blanc' ? 'noir' : 'blanc');

/**
 * LE MILIEU DU BUT QUE DÉFEND `team`, lu sur le schéma : derrière elle,
 * dans la moitié où elle se tient à la première étape. Une phase dessinée
 * les Blancs à droite défend donc à droite.
 */
export function defendedGoal(tactic: Tactic, team: Team): Point {
  const x = attackSign(tactic, team) === 1 ? 0 : tactic.pitch.length;
  return { x, y: tactic.pitch.width / 2 };
}

/** L'angle qui regarde de `from` vers `to` ; `fallback` s'ils se touchent. */
function facing(from: Point, to: Point, fallback: number): number {
  if (distance(from, to) < EPSILON) return fallback;
  const degrees = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return normalizeAngle(Math.round(degrees));
}

/**
 * LA PLACE DE MARQUAGE : sur la ligne qui va de ce qu'on marque (l'attaquant,
 * ou le palet de son porteur) au milieu du but, à `gap` mètres — au but au
 * plus. Une place qui tomberait dans l'autre moitié recule sur la ligne
 * médiane, en face : on ne quitte pas sa moitié pour marquer.
 */
function markSpot(from: Point, goal: Point, gap: number, half: number): Point {
  const d = distance(from, goal);
  if (d < EPSILON) return { ...goal };
  const t = Math.min(1, gap / d);
  const spot = {
    x: from.x + t * (goal.x - from.x),
    y: from.y + t * (goal.y - from.y),
  };
  return Math.abs(spot.x - goal.x) > half ? { ...spot, x: half } : spot;
}

/**
 * L'ÉTAPE `index`, L'ÉQUIPE `team` PLACÉE EN DÉFENSE, et le rôle de chacun.
 * Rend la même étape quand l'équipe n'a personne dans l'eau.
 */
export function planDefense(
  tactic: Tactic,
  index: number,
  team: Team
): DefensePlan {
  const step = tactic.steps[index]!;
  const goal = defendedGoal(tactic, team);
  const field = (side: Team) =>
    visiblePlayers(tactic).filter(
      p => p.team === side && !isSubstitute(p) && step.poses[p.id]
    );
  const defenders = field(team).map(p => p.id);
  if (defenders.length === 0) return { goal, roles: {}, step };
  const attackers = field(other(team)).map(p => p.id);

  const { pitch } = tactic;
  const half = pitch.length / 2;
  const into = goal.x === 0 ? 1 : -1;
  // Tête vers le terrain, quand rien d'autre ne dit où regarder.
  const ahead = into === 1 ? 0 : 180;
  const poses = { ...step.poses };
  const roles: Record<string, DefenseRole> = {};
  const free = new Set(defenders);

  /** Le défenseur libre le plus proche d'une place ; l'ordre du roster départage. */
  const nearest = (spot: Point): string => {
    let best = '';
    let gap = Infinity;
    for (const id of defenders) {
      if (!free.has(id)) continue;
      const d = distance(step.poses[id]!, spot);
      if (d < gap - EPSILON) {
        best = id;
        gap = d;
      }
    }
    free.delete(best);
    return best;
  };

  /** Pose un défenseur à sa place, tourné vers ce qu'il garde. */
  const place = (id: string, spot: Point, look: Point, depth?: Pose) => {
    const pose = step.poses[id]!;
    const at = clampFor(id, spot, pitch);
    poses[id] = {
      ...pose,
      ...at,
      angle: facing(at, look, ahead),
      ...(depth?.surface === undefined || pose.surface === undefined
        ? {}
        : { surface: depth.surface }),
    };
  };

  // 1. L'AXE, entre le palet et le milieu du but.
  const puck = step.puck;
  const reach = distance(puck, goal);
  const axisGap = Math.min(DEFENSE.axis, reach / 2);
  const axisSpot =
    reach < EPSILON
      ? { x: goal.x + into * DEFENSE.axis, y: goal.y }
      : {
          x: goal.x + ((puck.x - goal.x) / reach) * axisGap,
          y: goal.y + ((puck.y - goal.y) / reach) * axisGap,
        };
  const axisId = nearest(axisSpot);
  place(axisId, axisSpot, puck);
  roles[axisId] = { kind: 'axis' };

  // 2. LE MARQUAGE : le porteur d'abord, puis du plus proche au plus loin.
  const carrier =
    step.carrier && attackers.includes(step.carrier) ? step.carrier : undefined;
  const queue = [...attackers].sort((a, b) => {
    if (a === carrier) return -1;
    if (b === carrier) return 1;
    return distance(step.poses[a]!, goal) - distance(step.poses[b]!, goal);
  });
  for (const attacker of queue) {
    if (free.size === 0) break;
    const target = step.poses[attacker]!;
    const tight = attacker === carrier;
    // Le porteur, c'est son palet qu'on garde : devant lui, côté but.
    const watched = tight ? puck : target;
    const gap = tight ? DEFENSE.tight : DEFENSE.mark;
    const spot = markSpot(watched, goal, gap, half);
    const id = nearest(spot);
    place(id, spot, watched, target);
    roles[id] = { kind: 'mark', attacker, tight };
  }

  // 3. LES DÉFENSEURS DE TROP, à côté de celui de l'axe, de part et d'autre.
  let k = 0;
  for (const id of defenders) {
    if (!free.has(id)) continue;
    k += 1;
    const side = k % 2 === 1 ? 1 : -1;
    const offset = side * Math.ceil(k / 2) * DEFENSE.spread;
    place(id, { x: axisSpot.x, y: axisSpot.y + offset }, puck);
    roles[id] = { kind: 'cover' };
  }

  // Un défenseur qui portait le palet le lâche : son équipe ne l'a plus.
  if (step.carrier && defenders.includes(step.carrier)) {
    const { carrier: _dropped, ...rest } = step;
    return { goal, roles, step: { ...rest, poses } };
  }
  return { goal, roles, step: { ...step, poses } };
}

/** L'étape, l'équipe placée en défense (`planDefense`), sans les rôles. */
export const defenseStep = (tactic: Tactic, index: number, team: Team): Step =>
  planDefense(tactic, index, team).step;
