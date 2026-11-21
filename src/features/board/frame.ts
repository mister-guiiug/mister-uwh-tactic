import { stickTip } from './carry.ts';
import { bezierAt, MOVE_MIN } from './curve.ts';
import {
  clampFor,
  DECK_REFEREE_NUMBER,
  distance,
  isSubstitute,
  PUCK_ID,
  normalizeAngle,
  refereeLineEnds,
  visiblePlayers,
  visibleReferees,
  type PlayerIdentity,
  type Point,
  type Pose,
  type RefereeIdentity,
  type Step,
  type Tactic,
} from './model.ts';

/**
 * CE QUI EST À L'ÉCRAN À UN INSTANT DONNÉ, que la vue soit 2D ou 3D.
 *
 * `playhead` est un réel : `1` est la deuxième étape, `1.5` le milieu du
 * passage de la deuxième à la troisième. Les deux vues lisent la même image ;
 * c'est ce qui garantit qu'une phase de jeu se déroule à l'identique dans
 * chacune.
 *
 * `depth` remplace le booléen `surface` pendant le mouvement : 1 en surface,
 * 0 sous l'eau, et toutes les valeurs entre les deux pendant une plongée. La
 * 3D s'en sert pour la hauteur ; la 2D pour l'aspect, qui bascule à mi-course.
 */
export interface FramePlayer extends PlayerIdentity {
  x: number;
  y: number;
  angle: number;
  /** 1 en surface, 0 sous l'eau. */
  surfaceness: number;
  /** Un remplaçant (numéros 7 à 10). */
  substitute: boolean;
}

export interface FrameReferee extends RefereeIdentity {
  x: number;
  y: number;
  angle: number;
  /** L'arbitre de bord, debout sur la plage. */
  deck: boolean;
}

export interface Frame {
  players: FramePlayer[];
  referees: FrameReferee[];
  puck: Point;
  /** La hauteur du palet au-dessus du fond : nulle, sauf pendant un flick. */
  puckHeight: number;
  refereeLine: [FrameReferee, FrameReferee] | null;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Le plus court chemin d'un angle à l'autre : de 350° à 10°, on passe par 0°. */
export function lerpAngle(a: number, b: number, t: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180;
  return normalizeAngle(a + delta * t);
}

/** Une transition douce, qui démarre et s'arrête sans à-coup. */
export const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

const FALLBACK_POSE: Pose = { x: 0, y: 0, angle: 0, surface: true };

function poseOf(step: Step, id: string): Pose {
  return step.poses[id] ?? FALLBACK_POSE;
}

/**
 * LA PLONGÉE EN TROIS TEMPS, en secondes : le canard au DÉBUT de l'étape,
 * presque vertical (« les jambes en l'air, leur poids enfonce le corps »,
 * manuel de la WUHA), puis la nage au fond ; la remontée à la FIN. Un
 * passage linéaire faisait traverser l'eau en diagonale pendant toute
 * l'étape.
 */
export const DIVE_SECONDS = 1;
export const ASCENT_SECONDS = 1;

/**
 * 1 en surface, 0 au fond, entre les deux pendant le canard ou la remontée.
 * `t` est l'avancement dans l'étape, `duration` sa durée en secondes.
 */
export function surfacenessAt(
  fromSurface: boolean,
  toSurface: boolean,
  t: number,
  duration: number
): number {
  if (fromSurface === toSurface) return fromSurface ? 1 : 0;
  const elapsed = t * duration;
  if (fromSurface) {
    // Le canard : de la surface au fond dès le départ.
    const span = Math.min(DIVE_SECONDS, duration);
    return 1 - Math.min(1, elapsed / span);
  }
  // La remontée : le joueur reste au fond, puis remonte à la fin.
  const span = Math.min(ASCENT_SECONDS, duration);
  return Math.max(0, Math.min(1, (elapsed - (duration - span)) / span));
}

/** Les deux étapes qui encadrent `playhead`, et l'avancement entre elles. */
export function bracket(
  tactic: Tactic,
  playhead: number
): { from: Step; to: Step; t: number } {
  const last = tactic.steps.length - 1;
  const clamped = Math.min(Math.max(playhead, 0), last);
  const index = Math.min(Math.floor(clamped), last);
  const from = tactic.steps[index]!;
  const to = tactic.steps[Math.min(index + 1, last)]!;
  return { from, to, t: easeInOut(clamped - index) };
}

/**
 * La hauteur que prend le palet au sommet d'un flick, en mètres. LE PALET
 * EST AU FOND : un flick le lève juste assez pour passer au-dessus d'un
 * joueur allongé, et il retombe aussitôt. Il montait à 1,2 m, plus de la
 * moitié d'un bassin de 2 m. Le schéma peut régler la sienne
 * (`display.flickHeight`) : aucun document ne la chiffre.
 */
export const FLICK_HEIGHT = 0.5;
/** Une flèche « part du palet » à moins de ce rayon. */
const FLICK_SNAP = 1.5;

/**
 * LE FLICK FAIT DÉCOLLER LE PALET. Quand l'étape de départ porte une flèche
 * « flick » qui part du palet et arrive là où il sera à l'étape suivante, le
 * palet suit une parabole : nul au départ et à l'arrivée, `FLICK_HEIGHT` au
 * milieu. Une passe, elle, reste au fond.
 */
export function flickHeight(
  from: Step,
  to: Step,
  t: number,
  height = FLICK_HEIGHT
): number {
  if (from === to) return 0;
  const flick = from.arrows.find(
    a =>
      a.kind === 'flick' &&
      distance(a.from, from.puck) < FLICK_SNAP &&
      distance(a.to, to.puck) < FLICK_SNAP
  );
  return flick ? 4 * height * t * (1 - t) : 0;
}

/**
 * LE PALET PORTÉ SUIT LA CROSSE. Quand le même joueur le porte aux deux
 * étapes, le palet ne glisse pas en ligne droite d'un bout de crosse à
 * l'autre : il reste au bout de la crosse, qui suit la nage — courbe
 * comprise — et tourne avec le joueur. L'écart de la crosse à sa corde
 * s'ajoute au chemin du palet : nul aux deux étapes, qui gardent leur palet
 * exact (`settleStep`), la courbe entre les deux. Une passe, elle, va droit.
 */
function puckAt(
  tactic: Tactic,
  from: Step,
  to: Step,
  t: number,
  players: FramePlayer[]
): Point {
  const linear = {
    x: lerp(from.puck.x, to.puck.x, t),
    y: lerp(from.puck.y, to.puck.y, t),
  };
  const id = from.carrier;
  if (!id || id !== to.carrier || from === to) return linear;
  const carrier = players.find(p => p.id === id);
  const a = from.poses[id];
  const b = to.poses[id];
  if (!carrier || !a || !b) return linear;
  const hand = carrier.leftHanded;
  const tipA = stickTip(a, hand);
  const tipB = stickTip(b, hand);
  const tip = stickTip(carrier, hand);
  return clampFor(
    PUCK_ID,
    {
      x: linear.x + tip.x - lerp(tipA.x, tipB.x, t),
      y: linear.y + tip.y - lerp(tipA.y, tipB.y, t),
    },
    tactic.pitch
  );
}

export function frameAt(tactic: Tactic, playhead: number): Frame {
  const { from, to, t } = bracket(tactic, playhead);

  const players = visiblePlayers(tactic).map(identity => {
    const a = poseOf(from, identity.id);
    const b = poseOf(to, identity.id);
    // LA NAGE COURBE (`curve.ts`) : son point de contrôle est rangé dans
    // l'étape d'arrivée. Gardée dans le bassin : une courbe tirée contre un
    // mur ne le traverse pas.
    const control = from === to ? undefined : to.curves?.[identity.id];
    const at = control
      ? clampFor(identity.id, bezierAt(a, control, b, t), tactic.pitch)
      : { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    return {
      ...identity,
      ...at,
      angle: lerpAngle(a.angle, b.angle, t),
      surfaceness: surfacenessAt(
        a.surface !== false,
        b.surface !== false,
        t,
        from.duration
      ),
      substitute: isSubstitute(identity),
    };
  });

  const referees = visibleReferees(tactic).map(identity => {
    const a = poseOf(from, identity.id);
    const b = poseOf(to, identity.id);
    return {
      ...identity,
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      angle: lerpAngle(a.angle, b.angle, t),
      deck: identity.number === DECK_REFEREE_NUMBER,
    };
  });

  const ends = refereeLineEnds(tactic);
  const first = ends ? referees.find(r => r.id === ends[0]) : undefined;
  const second = ends ? referees.find(r => r.id === ends[1]) : undefined;

  return {
    players,
    referees,
    puck: puckAt(tactic, from, to, t, players),
    puckHeight: flickHeight(
      from,
      to,
      t,
      tactic.display.flickHeight ?? FLICK_HEIGHT
    ),
    refereeLine: first && second ? [first, second] : null,
  };
}

/** Un joueur qui a bougé depuis l'étape précédente : d'où, jusqu'où, par où. */
export interface Swim {
  was: FramePlayer;
  now: FramePlayer;
  /** Le point de contrôle de sa nage courbe, s'il y en a une. */
  control?: Point;
}

/**
 * LES CHEMINS QUI MÈNENT À L'ÉTAPE `index` : les fantômes du tableau, les
 * traces de la 3D et la poignée qui courbe une nage lisent cette liste —
 * les deux vues tracent le même chemin. Un joueur qui a bougé de moins de
 * `MOVE_MIN` n'en a pas.
 */
export function swimsInto(tactic: Tactic, index: number): Swim[] {
  if (index <= 0 || index >= tactic.steps.length) return [];
  const before = frameAt(tactic, index - 1);
  const curves = tactic.steps[index]!.curves;
  return frameAt(tactic, index).players.flatMap(now => {
    const was = before.players.find(p => p.id === now.id);
    if (!was || distance(was, now) <= MOVE_MIN) return [];
    const control = curves?.[now.id];
    return [control ? { was, now, control } : { was, now }];
  });
}
