import {
  DECK_REFEREE_NUMBER,
  distance,
  isSubstitute,
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

export function frameAt(tactic: Tactic, playhead: number): Frame {
  const { from, to, t } = bracket(tactic, playhead);

  const players = visiblePlayers(tactic).map(identity => {
    const a = poseOf(from, identity.id);
    const b = poseOf(to, identity.id);
    return {
      ...identity,
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
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
    puck: {
      x: lerp(from.puck.x, to.puck.x, t),
      y: lerp(from.puck.y, to.puck.y, t),
    },
    puckHeight: flickHeight(
      from,
      to,
      t,
      tactic.display.flickHeight ?? FLICK_HEIGHT
    ),
    refereeLine: first && second ? [first, second] : null,
  };
}
