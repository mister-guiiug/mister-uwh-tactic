import {
  PUCK_ID,
  clampFor,
  distance,
  isSubstitute,
  visiblePlayers,
  type Point,
  type Pose,
  type Step,
  type Tactic,
} from './model.ts';

/**
 * LE PALET EST TOUJOURS AU FOND DE L'EAU — et celui qui le joue aussi.
 *
 * Une étape peut nommer son PORTEUR (`step.carrier`) : le joueur dont la
 * crosse touche le palet. Trois conséquences, tenues ici et non vérifiées
 * après coup :
 *
 * - le palet est au bout de SA crosse, du côté de sa main (la droite, la
 *   gauche pour un gaucher), et le suit quand on le déplace ou le tourne ;
 * - un porteur qui remonte LÂCHE le palet, qui reste au fond où il était :
 *   un joueur en surface ne joue pas le palet ;
 * - déplacer le palet seul le lâche aussi. On le donne d'un geste
 *   (« Donner le palet »), jamais en le posant près d'une crosse : un
 *   placement voulu — le palet dans la cuvette — ne doit pas sauter.
 *
 * La place vient du dessin du nageur (`Board2D.tsx`) : main au bout du bras
 * tendu (0,86 m devant le centre du corps), crosse de 28 cm, palet devant
 * le crochet.
 */
export const CARRY = { ahead: 1.25, side: 0.15 } as const;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Le palet au bout de la crosse d'un joueur, dans le repère du terrain. */
export function stickTip(pose: Pose, leftHanded: boolean): Point {
  const a = radians(pose.angle);
  const side = (leftHanded ? -1 : 1) * CARRY.side;
  return {
    x: pose.x + Math.cos(a) * CARRY.ahead - Math.sin(a) * side,
    y: pose.y + Math.sin(a) * CARRY.ahead + Math.cos(a) * side,
  };
}

/** Les joueurs qui peuvent porter le palet : dans l'eau, et au fond. */
function bottomPlayers(tactic: Tactic, step: Step) {
  return visiblePlayers(tactic).filter(
    player => !isSubstitute(player) && step.poses[player.id]?.surface === false
  );
}

const withoutCarrier = (step: Step): Step => {
  const { carrier: _gone, ...rest } = step;
  return rest;
};

/**
 * L'ÉTAPE REMISE EN RÈGLE : un porteur absent, remplaçant ou en surface
 * lâche le palet ; sinon le palet est au bout de sa crosse. Rend la même
 * étape si rien ne change.
 */
export function settleStep(tactic: Tactic, step: Step): Step {
  if (!step.carrier) return step;
  const id = step.carrier;
  const player = bottomPlayers(tactic, step).find(p => p.id === id);
  if (!player) return withoutCarrier(step);
  const puck = clampFor(
    PUCK_ID,
    stickTip(step.poses[id]!, player.leftHanded),
    tactic.pitch
  );
  if (distance(puck, step.puck) < 1e-6) return step;
  return { ...step, puck };
}

/** Toutes les étapes remises en règle ; le même schéma si rien ne change. */
export function settleTactic(tactic: Tactic): Tactic {
  let changed = false;
  const steps = tactic.steps.map(step => {
    const next = settleStep(tactic, step);
    if (next !== step) changed = true;
    return next;
  });
  return changed ? { ...tactic, steps } : tactic;
}
