import {
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
}

export interface FrameReferee extends RefereeIdentity {
  x: number;
  y: number;
  angle: number;
}

export interface Frame {
  players: FramePlayer[];
  referees: FrameReferee[];
  puck: Point;
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
      surfaceness: lerp(a.surface ? 1 : 0, b.surface ? 1 : 0, t),
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
    refereeLine: first && second ? [first, second] : null,
  };
}
