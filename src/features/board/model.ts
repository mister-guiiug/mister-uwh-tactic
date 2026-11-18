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
 * TOUS LES JETONS EXISTENT TOUJOURS dans chaque étape ; `counts` dit combien
 * sont affichés. Retirer un joueur puis le remettre ne perd donc pas sa place.
 *
 * VERSION 3 (18/11/2026). Chaque étape porte sa DURÉE de jeu réel — c'est elle
 * qui compte l'apnée — et ses FLÈCHES : un déplacement, une passe, un flick.
 * L'affichage gagne le fantôme de l'étape précédente et le seuil d'apnée.
 *
 * VERSION 2 (17/11/2026). Une équipe, c'est six joueurs dans l'eau et quatre
 * remplaçants, qui entrent et sortent par une zone le long du bord ; l'arbitrage,
 * trois arbitres dans l'eau et un sur la plage. La version 1 ne connaissait
 * que les six joueurs et les arbitres aquatiques : `migrateTactic` la monte,
 * remplaçants et arbitre de bord masqués, pour qu'un schéma ancien s'affiche
 * exactement comme avant.
 */

export const TACTIC_VERSION = 3;

export const TEAMS = ['blanc', 'noir'] as const;
export type Team = (typeof TEAMS)[number];

/** Les joueurs dans l'eau, par équipe. */
export const MAX_PLAYERS = 6;
/** Les remplaçants, par équipe : numéros 7 à 10. */
export const MAX_SUBSTITUTES = 4;
export const SQUAD_SIZE = MAX_PLAYERS + MAX_SUBSTITUTES;
export const REFEREE_COUNTS = [0, 2, 3] as const;
export type RefereeCount = (typeof REFEREE_COUNTS)[number];
/** L'arbitre de bord porte le numéro 4, après les trois arbitres aquatiques. */
export const DECK_REFEREE_NUMBER = 4;

/** Identifiant du palet parmi les jetons sélectionnables. */
export const PUCK_ID = 'palet';

/**
 * Le bassin déborde du terrain d'un mètre : c'est là que nagent les
 * remplaçants. La plage, au-delà, porte l'arbitre de bord.
 */
export const POOL_MARGIN = 1;
export const DECK_REACH = 2.5;

/**
 * LE RECTANGLE DE REMISE EN JEU, à 5 m des lignes de but et 2 m des bords :
 * un palet neutre ou d'avantage n'est jamais placé hors de lui (CMAS,
 * règles 17.5.1.2.1 et 17.6.2.1). C'est le rectangle intérieur du terrain.
 */
export const INNER_RECT = { ends: 5, sides: 2 } as const;

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
  number: z.number().int().min(1).max(SQUAD_SIZE),
  name: z.string().max(24),
  leftHanded: z.boolean(),
});
export type PlayerIdentity = z.infer<typeof playerIdentitySchema>;

export const refereeIdentitySchema = z.object({
  id: z.string().min(1),
  number: z.number().int().min(1).max(DECK_REFEREE_NUMBER),
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

/**
 * UNE FLÈCHE DESSINÉE SUR UNE ÉTAPE : un déplacement (un joueur va là), une
 * passe (le palet glisse au fond), un flick (le palet décolle et retombe).
 */
export const ARROW_KINDS = ['move', 'pass', 'flick'] as const;
export type ArrowKind = (typeof ARROW_KINDS)[number];

export const arrowSchema = z.object({
  kind: z.enum(ARROW_KINDS),
  from: pointSchema,
  to: pointSchema,
});
export type Arrow = z.infer<typeof arrowSchema>;

export const MAX_ARROWS = 20;
/** Durée d'une étape en jeu réel, en secondes : de quoi compter l'apnée. */
export const STEP_DURATION = { min: 1, max: 60, default: 5 } as const;

export const stepSchema = z.object({
  poses: z.record(z.string(), poseSchema),
  puck: pointSchema,
  note: z.string().max(280),
  arrows: z.array(arrowSchema).max(MAX_ARROWS),
  duration: z.number().min(STEP_DURATION.min).max(STEP_DURATION.max),
});
export type Step = z.infer<typeof stepSchema>;

/** Les paires d'arbitres aquatiques qu'une ligne peut relier. */
export const REFEREE_PAIRS = ['1-2', '1-3', '2-3'] as const;
export type RefereePair = (typeof REFEREE_PAIRS)[number];

export const displaySchema = z.object({
  /** Le champ de vision des arbitres aquatiques. */
  fieldOfView: z.boolean(),
  /** La ligne imaginaire entre deux arbitres aquatiques, ou aucune. */
  refereeLine: z.enum(REFEREE_PAIRS).nullable(),
  /** Les noms sous les jetons. */
  labels: z.boolean(),
  /** La position de l'étape précédente, en transparence, et le chemin parcouru. */
  ghosts: z.boolean(),
  /** Au-delà, en secondes de fond consécutives, un joueur est signalé. */
  apneaLimit: z.number().min(5).max(60),
});
export type Display = z.infer<typeof displaySchema>;

const teamCount = (max: number) => z.number().int().min(0).max(max);

export const countsSchema = z.object({
  blanc: teamCount(MAX_PLAYERS),
  noir: teamCount(MAX_PLAYERS),
  substitutes: z.object({
    blanc: teamCount(MAX_SUBSTITUTES),
    noir: teamCount(MAX_SUBSTITUTES),
  }),
  referees: z.union([z.literal(0), z.literal(2), z.literal(3)]),
  deckReferee: z.boolean(),
});
export type Counts = z.infer<typeof countsSchema>;

export const tacticSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(60),
  createdAt: z.string(),
  updatedAt: z.string(),
  pitch: pitchSchema,
  roster: z.object({
    players: z.array(playerIdentitySchema).length(SQUAD_SIZE * 2),
    referees: z.array(refereeIdentitySchema).length(DECK_REFEREE_NUMBER),
  }),
  counts: countsSchema,
  display: displaySchema,
  steps: z.array(stepSchema).min(1).max(30),
});
export type Tactic = z.infer<typeof tacticSchema>;

export const playerId = (team: Team, number: number) => `${team}-${number}`;
export const refereeId = (number: number) => `arbitre-${number}`;
export const DECK_REFEREE_ID = refereeId(DECK_REFEREE_NUMBER);

export const isSubstitute = (player: { number: number }) =>
  player.number > MAX_PLAYERS;

/**
 * 2 m de fond par défaut : « généralement joué dans un bassin de 2 m », dit
 * la présentation du sport par UWH News, et c'est le minimum du règlement.
 */
export const DEFAULT_PITCH: Pitch = { length: 25, width: 15, depth: 2 };

/**
 * Le seuil d'apnée par défaut : quinze secondes de fond d'affilée. Un
 * joueur de club tient une action de dix à vingt secondes ; au-delà, il
 * remonte, et c'est ce trou-là qu'une phase de jeu doit prévoir.
 */
export const DEFAULT_APNEA_LIMIT = 15;

/**
 * LES ZONES DE REMPLACEMENT : le long du bord `y = 0`, dans le mètre de
 * bassin hors du terrain, chaque équipe de son côté du milieu.
 */
export function substitutionZone(
  team: Team,
  pitch: Pitch
): { x1: number; x2: number; y1: number; y2: number } {
  const mid = pitch.length / 2;
  return team === 'blanc'
    ? { x1: 1, x2: mid - 1, y1: -POOL_MARGIN + 0.05, y2: -0.05 }
    : { x1: mid + 1, x2: pitch.length - 1, y1: -POOL_MARGIN + 0.05, y2: -0.05 };
}

/**
 * L'ENGAGEMENT : chaque équipe contre son mur de but, le palet au centre.
 * C'est la seule disposition que le règlement impose — tout le reste est
 * tactique, donc à l'entraîneur.
 *
 * Les six joueurs sont répartis de part et d'autre du but (3 m de large),
 * à un demi-mètre du mur, tête vers l'adversaire ; les remplaçants attendent
 * dans leur zone, tournés vers le terrain. Les arbitres aquatiques encadrent
 * le centre, l'arbitre de bord se tient sur la plage d'en face.
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
  for (let k = 0; k < MAX_SUBSTITUTES; k++) {
    const n = MAX_PLAYERS + 1 + k;
    const y = -POOL_MARGIN / 2;
    poses[playerId('blanc', n)] = {
      x: 2.5 + k * 1.8,
      y,
      angle: 90,
      surface: true,
    };
    poses[playerId('noir', n)] = {
      x: pitch.length - 2.5 - k * 1.8,
      y,
      angle: 90,
      surface: true,
    };
  }
  // Les officiels selon la règle 15.1.4 : l'arbitre de bord au milieu d'un
  // côté, un arbitre aquatique dans l'eau face à lui, les deux autres près des
  // croisements des lignes de 5 et 2 m, du côté opposé, chacun vers son but.
  const mid = pitch.length / 2;
  poses[refereeId(1)] = { x: 5, y: 2, angle: 180 };
  poses[refereeId(2)] = { x: mid, y: pitch.width - 0.8, angle: 270 };
  poses[refereeId(3)] = { x: pitch.length - 5, y: 2, angle: 0 };
  poses[DECK_REFEREE_ID] = {
    x: mid,
    y: pitch.width + POOL_MARGIN + 0.8,
    angle: 270,
  };
  return {
    poses,
    puck: { x: mid, y: pitch.width / 2 },
    note: '',
    arrows: [],
    duration: STEP_DURATION.default,
  };
}

export function createRoster(): Tactic['roster'] {
  const players: PlayerIdentity[] = [];
  for (const team of TEAMS) {
    for (let n = 1; n <= SQUAD_SIZE; n++) {
      players.push({
        id: playerId(team, n),
        team,
        number: n,
        name: '',
        leftHanded: false,
      });
    }
  }
  const referees: RefereeIdentity[] = [1, 2, 3, DECK_REFEREE_NUMBER].map(n => ({
    id: refereeId(n),
    number: n,
    name: '',
  }));
  return { players, referees };
}

/**
 * Un schéma neuf montre la rencontre telle qu'elle se présente : six contre
 * six, quatre remplaçants de chaque côté, trois arbitres dans l'eau et un sur
 * la plage.
 */
export function createTactic(options: {
  id: string;
  name: string;
  now?: string;
  pitch?: Pitch;
}): Tactic {
  const now = options.now ?? new Date().toISOString();
  // UNE COPIE, pas la constante : modifier le bassin d'un schéma ne doit pas
  // changer celui de tous les schémas suivants.
  const pitch = { ...(options.pitch ?? DEFAULT_PITCH) };
  return {
    id: options.id,
    name: options.name,
    createdAt: now,
    updatedAt: now,
    pitch,
    roster: createRoster(),
    counts: {
      blanc: MAX_PLAYERS,
      noir: MAX_PLAYERS,
      substitutes: { blanc: MAX_SUBSTITUTES, noir: MAX_SUBSTITUTES },
      referees: 3,
      deckReferee: true,
    },
    display: {
      fieldOfView: false,
      refereeLine: '1-2',
      labels: true,
      ghosts: true,
      apneaLimit: DEFAULT_APNEA_LIMIT,
    },
    steps: [kickoffStep(pitch)],
  };
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Un point gardé dans le terrain (le palet). */
export function clampToPitch(point: Point, pitch: Pitch): Point {
  return {
    x: clamp(point.x, 0, pitch.length),
    y: clamp(point.y, 0, pitch.width),
  };
}

/** Un point gardé dans le bassin (joueurs, remplaçants, arbitres aquatiques). */
export function clampToPool(point: Point, pitch: Pitch): Point {
  return {
    x: clamp(point.x, -POOL_MARGIN, pitch.length + POOL_MARGIN),
    y: clamp(point.y, -POOL_MARGIN, pitch.width + POOL_MARGIN),
  };
}

/**
 * Un point gardé sur la plage : hors de l'eau, à portée du bassin. Un
 * arbitre de bord lâché dans l'eau est ramené sur le bord le plus proche.
 */
export function clampToDeck(point: Point, pitch: Pitch): Point {
  const outer = POOL_MARGIN + DECK_REACH;
  let x = clamp(point.x, -outer, pitch.length + outer);
  let y = clamp(point.y, -outer, pitch.width + outer);
  const inPool =
    x > -POOL_MARGIN &&
    x < pitch.length + POOL_MARGIN &&
    y > -POOL_MARGIN &&
    y < pitch.width + POOL_MARGIN;
  if (inPool) {
    const edge = POOL_MARGIN + 0.5;
    const gaps = [
      x + POOL_MARGIN,
      pitch.length + POOL_MARGIN - x,
      y + POOL_MARGIN,
      pitch.width + POOL_MARGIN - y,
    ];
    const nearest = gaps.indexOf(Math.min(...gaps));
    if (nearest === 0) x = -edge;
    else if (nearest === 1) x = pitch.length + edge;
    else if (nearest === 2) y = -edge;
    else y = pitch.width + edge;
  }
  return { x, y };
}

/** La règle de placement d'un jeton, selon ce qu'il est. */
export function clampFor(id: string, point: Point, pitch: Pitch): Point {
  if (id === PUCK_ID) return clampToPitch(point, pitch);
  if (id === DECK_REFEREE_ID) return clampToDeck(point, pitch);
  return clampToPool(point, pitch);
}

/** Un angle ramené dans [0, 360). */
export const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;

/** Les joueurs affichés selon `counts`, dans un ordre stable. */
export function visiblePlayers(tactic: Tactic): PlayerIdentity[] {
  const { counts } = tactic;
  return tactic.roster.players.filter(p =>
    isSubstitute(p)
      ? p.number - MAX_PLAYERS <= counts.substitutes[p.team]
      : p.number <= counts[p.team]
  );
}

export function visibleReferees(tactic: Tactic): RefereeIdentity[] {
  const { counts } = tactic;
  return tactic.roster.referees.filter(r =>
    r.number === DECK_REFEREE_NUMBER
      ? counts.deckReferee
      : r.number <= counts.referees
  );
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

/**
 * MONTE UN SCHÉMA DE N'IMPORTE QUELLE VERSION ANTÉRIEURE À LA VERSION
 * COURANTE — pour le brouillon, les schémas enregistrés, les fichiers
 * exportés, les liens déjà partagés et la base distante. Une seule porte
 * d'entrée : chaque lecteur l'appelle, aucun ne connaît les versions.
 *
 * Une donnée qui n'a pas la forme attendue est rendue telle quelle, et le
 * schéma zod tranche.
 */
export function migrateTactic(data: unknown): unknown {
  return toV3(toV2(data));
}

/**
 * v1 → v2 : remplaçants et arbitre de bord. Les noms et les mains des six
 * joueurs et des trois arbitres sont gardés ; les nouveaux arrivent à leur
 * place d'engagement, MASQUÉS : un schéma ancien s'affiche comme avant.
 */
function toV2(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const old = data as {
    pitch?: Pitch;
    roster?: { players?: PlayerIdentity[]; referees?: RefereeIdentity[] };
    counts?: Record<string, unknown>;
    steps?: Step[];
  };
  const players = old.roster?.players;
  if (!Array.isArray(players) || players.length !== MAX_PLAYERS * 2)
    return data;
  if (!old.pitch || !Array.isArray(old.steps)) return data;

  const roster = createRoster();
  for (const player of roster.players) {
    const before = players.find(p => p.id === player.id);
    if (before) {
      player.name = before.name;
      player.leftHanded = before.leftHanded;
    }
  }
  for (const referee of roster.referees) {
    const before = old.roster?.referees?.find(r => r.id === referee.id);
    if (before) referee.name = before.name;
  }
  const kickoff = kickoffStep(old.pitch);
  return {
    ...old,
    roster,
    counts: {
      ...old.counts,
      substitutes: { blanc: 0, noir: 0 },
      deckReferee: false,
    },
    steps: old.steps.map(step => ({
      ...step,
      poses: { ...kickoff.poses, ...step.poses },
    })),
  };
}

/**
 * v2 → v3 : des étapes sans flèches, d'une durée par défaut ; ni fantôme
 * (un schéma ancien s'affiche comme avant), ni seuil autre que le défaut.
 */
function toV3(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const old = data as {
    steps?: Record<string, unknown>[];
    display?: Record<string, unknown>;
  };
  if (!Array.isArray(old.steps) || !old.display) return data;
  if ('ghosts' in old.display) return data;
  return {
    ...old,
    display: { ...old.display, ghosts: false, apneaLimit: DEFAULT_APNEA_LIMIT },
    steps: old.steps.map(step => ({
      arrows: [],
      duration: STEP_DURATION.default,
      ...step,
    })),
  };
}
