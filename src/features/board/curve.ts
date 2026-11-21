import { distance, type Point, type Step, type Tactic } from './model.ts';

/**
 * LES NAGES COURBES. D'une étape à l'autre, un joueur allait en ligne droite ;
 * dans l'eau, on contourne un adversaire, on décrit un arc pour prendre le
 * palet à revers. L'entraîneur courbe donc le chemin d'un joueur entre deux
 * étapes.
 *
 * La courbe est une Bézier QUADRATIQUE : le départ (la position à l'étape
 * précédente), l'arrivée (la position à cette étape), et un point de
 * contrôle rangé dans l'étape d'arrivée (`step.curves[id]`), en mètres.
 *
 * À MI-PASSAGE, LE JOUEUR EST AU MILIEU DE LA COURBE, en B(½) : c'est là que
 * le tableau pose la poignée qui la courbe. La glisser, c'est dire par où il
 * passe — `controlThrough` en déduit le point de contrôle.
 *
 * Le point est ABSOLU, pas relatif à la corde : retoucher l'arrivée d'un
 * demi-mètre laisse la courbe tirer vers le même endroit — celui de
 * l'adversaire qu'on contourne.
 */

/**
 * En deçà, en mètres, un joueur n'a pas bougé : pas de fantôme, pas de
 * chemin, donc pas de courbe.
 */
export const MOVE_MIN = 0.3;
/** Un milieu de courbe à moins de ce rayon du milieu de la corde : c'est droit. */
export const STRAIGHT_SNAP = 0.15;

export function bezierAt(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/** Le milieu du chemin : sur la courbe, ou au milieu de la corde. */
export function pathMiddle(a: Point, b: Point, control?: Point): Point {
  return control ? bezierAt(a, control, b, 0.5) : midpoint(a, b);
}

/** Le point de contrôle qui fait passer la courbe par `middle` à mi-chemin. */
export function controlThrough(a: Point, b: Point, middle: Point): Point {
  const m = midpoint(a, b);
  return { x: 2 * middle.x - m.x, y: 2 * middle.y - m.y };
}

const SEGMENTS = 32;

/**
 * LA LONGUEUR NAGÉE : la corde, ou la courbe mesurée en 32 segments — à
 * moins d'un millième près pour un arc de bassin. C'est elle que la vitesse
 * maximale compare (`checks.ts`), pas la corde.
 */
export function pathLength(a: Point, b: Point, control?: Point): number {
  if (!control) return distance(a, b);
  let length = 0;
  let previous = a;
  for (let i = 1; i <= SEGMENTS; i++) {
    const point = bezierAt(a, control, b, i / SEGMENTS);
    length += distance(previous, point);
    previous = point;
  }
  return length;
}

/** Une courbe qui a lieu d'être : un vrai déplacement, qui quitte sa corde. */
export function isCurved(a: Point, b: Point, control: Point): boolean {
  return (
    distance(a, b) > MOVE_MIN &&
    distance(pathMiddle(a, b, control), midpoint(a, b)) >= STRAIGHT_SNAP
  );
}

/**
 * LES COURBES REMISES EN RÈGLE après chaque édition, comme le palet
 * (`carry.ts`). Disparaît la courbe :
 *
 * - d'un joueur qui ne bouge plus — une étape qui naît copie de la
 *   précédente, une position gardée aux étapes suivantes ;
 * - presque droite — la poignée relâchée sur la corde redresse la nage ;
 * - de la première étape, qui n'a pas de départ, ou d'un jeton inconnu.
 *
 * Rend le même schéma si rien ne change.
 */
export function settleCurves(tactic: Tactic): Tactic {
  const players = new Set(tactic.roster.players.map(p => p.id));
  let changed = false;
  const steps = tactic.steps.map((step, i) => {
    if (!step.curves) return step;
    const before = tactic.steps[i - 1];
    const entries = Object.entries(step.curves);
    const kept = entries.filter(([id, control]) => {
      const a = before?.poses[id];
      const b = step.poses[id];
      return players.has(id) && a && b && isCurved(a, b, control);
    });
    if (kept.length === entries.length && kept.length > 0) return step;
    changed = true;
    const { curves: _was, ...rest } = step;
    return kept.length > 0
      ? { ...rest, curves: Object.fromEntries(kept) }
      : rest;
  });
  return changed ? { ...tactic, steps } : tactic;
}

/**
 * La même étape, chaque point de contrôle passé par `map` : le bassin
 * redimensionné, la phase retournée.
 */
export function mapCurves(
  step: Step,
  map: (control: Point, id: string) => Point
): Step {
  if (!step.curves) return step;
  return {
    ...step,
    curves: Object.fromEntries(
      Object.entries(step.curves).map(([id, c]) => [id, map(c, id)])
    ),
  };
}
