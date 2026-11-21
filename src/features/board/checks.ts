import { overLimit, type ApneaTable } from './apnea.ts';
import { pathLength } from './curve.ts';
import {
  DECK_REFEREE_NUMBER,
  DEFAULT_MAX_SPEED,
  distance,
  isSubstitute,
  visiblePlayers,
  visibleReferees,
  type Point,
  type Step,
  type Tactic,
} from './model.ts';

/** Ouverture et portée du champ de vision d'un arbitre de l'eau. */
export const FOV_APERTURE = 100;
export const FOV_RANGE = 9;

/**
 * CE QU'UN JOUEUR ALLONGÉ AU FOND CACHE. L'arbitre regarde depuis la
 * surface : sa ligne de vue descend en biais jusqu'au palet. Un corps
 * allongé (35 cm de haut, 70 cm de large) la coupe s'il est assez près du
 * palet pour que la ligne passe encore sous son dos.
 */
const BODY_HEIGHT = 0.35;
const BODY_HALF_WIDTH = 0.35;
/** Le palet lui-même et la crosse qui le touche ne le cachent pas. */
const PUCK_CLEARANCE = 0.25;

const toDegrees = (radians: number) => (radians * 180) / Math.PI;
const angleGap = (a: number, b: number) =>
  Math.abs(((((a - b) % 360) + 540) % 360) - 180);

const inPitch = (point: Point, tactic: Tactic) =>
  point.x >= 0 &&
  point.x <= tactic.pitch.length &&
  point.y >= 0 &&
  point.y <= tactic.pitch.width;

/** Un point dans le champ de vision d'un arbitre (dessiné en 2D). */
export function inFieldOfView(
  referee: { x: number; y: number; angle: number },
  point: Point
): boolean {
  if (distance(referee, point) > FOV_RANGE) return false;
  const towards = toDegrees(
    Math.atan2(point.y - referee.y, point.x - referee.x)
  );
  return angleGap(towards, referee.angle) <= FOV_APERTURE / 2;
}

/**
 * Le joueur au fond qui masque le palet à un arbitre en surface, s'il y en a
 * un. La ligne de vue part de l'arbitre, à `depth` au-dessus du fond, et
 * descend jusqu'au palet : à `d` mètres du palet, elle est à `depth × d / L`
 * du fond.
 */
export function maskedBy(
  tactic: Tactic,
  step: Step,
  referee: Point
): string | undefined {
  const { puck } = step;
  const length = distance(puck, referee);
  if (length < 0.01) return undefined;
  const ux = (referee.x - puck.x) / length;
  const uy = (referee.y - puck.y) / length;
  for (const player of visiblePlayers(tactic)) {
    if (isSubstitute(player)) continue;
    const pose = step.poses[player.id];
    if (!pose || pose.surface !== false) continue;
    const along = (pose.x - puck.x) * ux + (pose.y - puck.y) * uy;
    if (along <= PUCK_CLEARANCE || along >= length) continue;
    const across = Math.abs((pose.x - puck.x) * uy - (pose.y - puck.y) * ux);
    const height = (tactic.pitch.depth * along) / length;
    if (across < BODY_HALF_WIDTH && height < BODY_HEIGHT) return player.id;
  }
  return undefined;
}

export interface Fast {
  id: string;
  /** En mètres par seconde, pour rejoindre cette étape depuis la précédente. */
  speed: number;
}

export interface Masked {
  referee: string;
  by: string;
}

export interface StepAlerts {
  /** Au-delà de leur apnée. */
  apnea: string[];
  /** Trop rapides pour rejoindre cette étape à temps. */
  fast: Fast[];
  /** Aucun arbitre de l'eau ne voit le palet. */
  blind: boolean;
  /** Un arbitre a le palet dans son champ, mais un joueur le lui cache. */
  masked: Masked[];
  count: number;
}

/**
 * LES VITESSES : la distance parcourue depuis l'étape précédente, rapportée
 * à sa durée. Joueurs dans l'eau et arbitres de l'eau ; un remplaçant, ou un
 * jeton qui entre dans la zone de remplacement, ne compte pas. Une nage
 * courbe compte sa longueur, pas sa corde (`curve.ts`) : contourner un
 * adversaire, c'est nager plus.
 */
function fastAt(tactic: Tactic, index: number): Fast[] {
  if (index === 0) return [];
  const before = tactic.steps[index - 1]!;
  const now = tactic.steps[index]!;
  const limit = tactic.display.maxSpeed ?? DEFAULT_MAX_SPEED;
  const ids = [
    ...visiblePlayers(tactic)
      .filter(p => !isSubstitute(p))
      .map(p => p.id),
    ...visibleReferees(tactic)
      .filter(r => r.number !== DECK_REFEREE_NUMBER)
      .map(r => r.id),
  ];
  const fast: Fast[] = [];
  for (const id of ids) {
    const a = before.poses[id];
    const b = now.poses[id];
    if (!a || !b || !inPitch(a, tactic) || !inPitch(b, tactic)) continue;
    const speed = pathLength(a, b, now.curves?.[id]) / before.duration;
    if (speed > limit) fast.push({ id, speed });
  }
  return fast;
}

/**
 * CE QUE VOIENT LES ARBITRES : seulement quand leur champ de vision est
 * affiché — c'est là qu'on prépare leur placement —, et s'ils sont au moins
 * deux dans l'eau. Sinon, les phases écrites sans eux porteraient une
 * alerte à chaque étape.
 */
function refereesAt(
  tactic: Tactic,
  step: Step
): { blind: boolean; masked: Masked[] } {
  if (!tactic.display.fieldOfView || tactic.counts.referees < 2) {
    return { blind: false, masked: [] };
  }
  const masked: Masked[] = [];
  let seen = false;
  for (const referee of visibleReferees(tactic)) {
    if (referee.number === DECK_REFEREE_NUMBER) continue;
    const pose = step.poses[referee.id];
    if (!pose || !inFieldOfView(pose, step.puck)) continue;
    const by = maskedBy(tactic, step, pose);
    if (by) masked.push({ referee: referee.id, by });
    else seen = true;
  }
  return { blind: !seen, masked };
}

/** Les alertes d'une étape, toutes familles confondues. */
export function stepAlerts(
  tactic: Tactic,
  apnea: ApneaTable,
  index: number
): StepAlerts {
  const step = tactic.steps[index];
  if (!step) {
    return { apnea: [], fast: [], blind: false, masked: [], count: 0 };
  }
  const over = [...overLimit(apnea, index)];
  const fast = fastAt(tactic, index);
  const { blind, masked } = refereesAt(tactic, step);
  return {
    apnea: over,
    fast,
    blind,
    masked,
    count: over.length + fast.length + (blind ? 1 : 0) + masked.length,
  };
}

/** Les étapes qui portent au moins une alerte, pour la frise. */
export function alertedSteps(tactic: Tactic, apnea: ApneaTable): Set<number> {
  const steps = new Set<number>();
  tactic.steps.forEach((_, i) => {
    if (stepAlerts(tactic, apnea, i).count > 0) steps.add(i);
  });
  return steps;
}
