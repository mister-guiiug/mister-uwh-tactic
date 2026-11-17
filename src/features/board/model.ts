import { z } from 'zod';

/**
 * LE MODÈLE DU TABLEAU TACTIQUE, en mètres et en degrés.
 *
 * Repère : `x` court le long du terrain, de la ligne de but des Blancs (0)
 * à celle des Noirs (`length`) ; `y` en travers, d'un bord (0) à l'autre
 * (`width`). Vu de dessus, `y` descend — c'est le repère du SVG, et la 3D le
 * transpose (voir `scene3d.ts`). Un angle de 0° regarde vers le but des Noirs,
 * et tourne dans le sens des aiguilles d'une montre vu de dessus.
 *
 * L'IDENTITÉ ET LA POSITION SONT SÉPARÉES. Le nom d'un joueur, sa main, son
 * équipe vivent dans `roster`, une fois pour tout le schéma ; sa position, son
 * orientation et sa profondeur vivent dans chaque étape. Une phase de jeu est
 * une suite d'étapes, et ce qui la distingue d'une autre, c'est le mouvement —
 * pas le nom de celui qui bouge.
 *
 * Les douze joueurs et les trois arbitres existent TOUJOURS dans chaque étape ;
 * `counts` dit combien sont affichés. Retirer un joueur puis le remettre ne
 * perd donc pas sa place.
 */

export const TEAMS = ['blanc', 'noir'] as const;
export type Team = (typeof TEAMS)[number];

export const MAX_PLAYERS = 6;
export const REFEREE_COUNTS = [0, 2, 3] as const;
export type RefereeCount = (typeof REFEREE_COUNTS)[number];

/** Identifiant du palet parmi les jetons sélectionnables. */
export const PUCK_ID = 'palet';

/**
 * Bornes du règlement international (CMAS, 12ᵉ édition) : un terrain de 21 à
 * 25 m sur 12 à 15 m, dans une eau de 2 à 3,65 m.
 */
export const PITCH_LIMITS = {
  length: { min: 21, max: 25 },
  width: { min: 12, max: 15 },
  depth: { min: 2, max: 3.65 },
} as const;

export const pitchSchema = z.object({
  length: z.number().min(PITCH_LIMITS.length.min).max(PITCH_LIMITS.length.max),
  width: z.number().min(PITCH_LIMITS.width.min).max(PITCH_LIMITS.width.max),
  depth: z.number().min(PITCH_LIMITS.depth.min).max(PITCH_LIMITS.depth.max),
});
export type Pitch = z.infer<typeof pitchSchema>;

export const playerIdentitySchema = z.object({
  id: z.string().min(1),
  team: z.enum(TEAMS),
  number: z.number().int().min(1).max(MAX_PLAYERS),
  name: z.string().max(24),
  leftHanded: z.boolean(),
});
export type PlayerIdentity = z.infer<typeof playerIdentitySchema>;

export const refereeIdentitySchema = z.object({
  id: z.string().min(1),
  number: z.number().int().min(1).max(3),
  name: z.string().max(24),
});
export type RefereeIdentity = z.infer<typeof refereeIdentitySchema>;

/** Où est un jeton à une étape. `surface` ne concerne que les joueurs. */
export const poseSchema = z.object({
  x: z.number(),
  y: z.number(),
  angle: z.number(),
  surface: z.boolean().optional(),
});
export type Pose = z.infer<typeof poseSchema>;

export const pointSchema = z.object({ x: z.number(), y: z.number() });
export type Point = z.infer<typeof pointSchema>;

export const stepSchema = z.object({
  poses: z.record(z.string(), poseSchema),
  puck: pointSchema,
  note: z.string().max(280),
});
export type Step = z.infer<typeof stepSchema>;

/** Les paires d'arbitres qu'une ligne peut relier. */
export const REFEREE_PAIRS = ['1-2', '1-3', '2-3'] as const;
export type RefereePair = (typeof REFEREE_PAIRS)[number];

export const displaySchema = z.object({
  /** Le champ de vision des arbitres. */
  fieldOfView: z.boolean(),
  /** La ligne imaginaire entre deux arbitres, ou aucune. */
  refereeLine: z.enum(REFEREE_PAIRS).nullable(),
  /** Les noms sous les jetons. */
  labels: z.boolean(),
});
export type Display = z.infer<typeof displaySchema>;

export const tacticSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(60),
  createdAt: z.string(),
  updatedAt: z.string(),
  pitch: pitchSchema,
  roster: z.object({
    players: z.array(playerIdentitySchema).length(MAX_PLAYERS * 2),
    referees: z.array(refereeIdentitySchema).length(3),
  }),
  counts: z.object({
    blanc: z.number().int().min(0).max(MAX_PLAYERS),
    noir: z.number().int().min(0).max(MAX_PLAYERS),
    referees: z.union([z.literal(0), z.literal(2), z.literal(3)]),
  }),
  display: displaySchema,
  steps: z.array(stepSchema).min(1).max(30),
});
export type Tactic = z.infer<typeof tacticSchema>;

export const playerId = (team: Team, number: number) => `${team}-${number}`;
export const refereeId = (number: number) => `arbitre-${number}`;

export const DEFAULT_PITCH: Pitch = { length: 25, width: 15, depth: 2.5 };

/**
 * L'ENGAGEMENT : chaque équipe contre son mur de but, le palet au centre.
 * C'est la seule disposition que le règlement impose — tout le reste est
 * tactique, donc à l'entraîneur.
 *
 * Les six joueurs sont répartis de part et d'autre du but (3 m de large),
 * à un demi-mètre du mur, tête vers l'adversaire. Les arbitres aquatiques
 * encadrent le centre, de chaque côté.
 */
export function kickoffStep(pitch: Pitch): Step {
  const poses: Record<string, Pose> = {};
  const spacing = Math.min(1.6, (pitch.width - 2) / MAX_PLAYERS);
  for (let n = 1; n <= MAX_PLAYERS; n++) {
    const y = pitch.width / 2 + (n - (MAX_PLAYERS + 1) / 2) * spacing;
    poses[playerId('blanc', n)] = { x: 0.6, y, angle: 0, surface: true };
    poses[playerId('noir', n)] = {
      x: pitch.length - 0.6,
      y,
      angle: 180,
      surface: true,
    };
  }
  const mid = pitch.length / 2;
  poses[refereeId(1)] = { x: mid - 3, y: 0.8, angle: 90 };
  poses[refereeId(2)] = { x: mid, y: pitch.width - 0.8, angle: 270 };
  poses[refereeId(3)] = { x: mid + 3, y: 0.8, angle: 90 };
  return {
    poses,
    puck: { x: mid, y: pitch.width / 2 },
    note: '',
  };
}

export function createRoster(): Tactic['roster'] {
  const players: PlayerIdentity[] = [];
  for (const team of TEAMS) {
    for (let n = 1; n <= MAX_PLAYERS; n++) {
      players.push({
        id: playerId(team, n),
        team,
        number: n,
        name: '',
        leftHanded: false,
      });
    }
  }
  const referees: RefereeIdentity[] = [1, 2, 3].map(n => ({
    id: refereeId(n),
    number: n,
    name: '',
  }));
  return { players, referees };
}

export function createTactic(options: {
  id: string;
  name: string;
  now?: string;
  pitch?: Pitch;
}): Tactic {
  const now = options.now ?? new Date().toISOString();
  const pitch = options.pitch ?? DEFAULT_PITCH;
  return {
    id: options.id,
    name: options.name,
    createdAt: now,
    updatedAt: now,
    pitch,
    roster: createRoster(),
    counts: { blanc: MAX_PLAYERS, noir: MAX_PLAYERS, referees: 2 },
    display: { fieldOfView: false, refereeLine: '1-2', labels: true },
    steps: [kickoffStep(pitch)],
  };
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Un point gardé dans le terrain. */
export function clampToPitch(point: Point, pitch: Pitch): Point {
  return {
    x: clamp(point.x, 0, pitch.length),
    y: clamp(point.y, 0, pitch.width),
  };
}

/** Un angle ramené dans [0, 360). */
export const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;

/** Les jetons affichés selon `counts`, dans un ordre stable. */
export function visiblePlayers(tactic: Tactic): PlayerIdentity[] {
  return tactic.roster.players.filter(p => p.number <= tactic.counts[p.team]);
}

export function visibleReferees(tactic: Tactic): RefereeIdentity[] {
  return tactic.roster.referees.filter(r => r.number <= tactic.counts.referees);
}

/** Les deux arbitres que relie la ligne, s'ils sont tous deux affichés. */
export function refereeLineEnds(tactic: Tactic): [string, string] | null {
  const pair = tactic.display.refereeLine;
  if (!pair) return null;
  const [a, b] = pair.split('-').map(Number) as [number, number];
  if (a > tactic.counts.referees || b > tactic.counts.referees) return null;
  return [refereeId(a), refereeId(b)];
}

export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
