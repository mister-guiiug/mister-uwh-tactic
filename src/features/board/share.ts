import {
  ARROW_KINDS,
  createRoster,
  DECISION_KINDS,
  DECK_REFEREE_NUMBER,
  migrateTactic,
  playerId,
  refereeId,
  tacticSchema,
  TEAMS,
  MAX_PLAYERS,
  MAX_WORDS,
  MAX_ZONES,
  SQUAD_SIZE,
  ZONE_SHAPES,
  type Arrow,
  type Point,
  type Pose,
  type Tactic,
  type Word,
  type Zone,
} from './model.ts';
import { cleanTags } from './tags.ts';
import { markText } from './marks.ts';

/**
 * PARTAGER UN SCHÉMA PAR UN LIEN, sans serveur.
 *
 * Le schéma voyage dans le FRAGMENT de l'adresse : le navigateur ne l'envoie
 * jamais au serveur, il n'apparaît dans aucun journal de GitHub Pages. Le
 * lien EST la donnée — ce qui le rend aussi durable que le message qui le
 * porte.
 *
 * Deux formes. `#s=…` : le schéma compact en base64url, lisible partout.
 * `#z=…` : le même, COMPRESSÉ (deflate), deux à trois fois plus court — c'est
 * ce qui le fait tenir dans un QR code, plafonné à 2 953 octets. Un lien se
 * fabrique compressé quand le navigateur sait le faire, et les deux formes
 * s'ouvrent toujours.
 *
 * Le format est compact parce qu'un lien se colle dans une messagerie : des
 * tableaux plutôt que des objets, les positions en décimètres entiers, les
 * angles en degrés entiers. Ce qui revient est validé par le même schéma zod
 * que ce qui sort du stockage : un lien tronqué ou forgé est refusé.
 *
 * VERSION 3 : chaque étape porte sa durée et ses flèches, l'affichage le
 * fantôme et le seuil d'apnée. Les liens des versions 1 et 2, déjà partis,
 * sont relus à leur forme d'origine, puis montés par `migrateTactic`.
 */
export const SHARE_VERSION = 3;
export const SHARE_PREFIX = '#s=';
export const SHARE_PREFIX_COMPRESSED = '#z=';
/** La capacité d'un QR code (version 40, correction L), en octets. */
export const QR_CAPACITY = 2953;

type CompactPose = [number, number, number, number];
type CompactArrow = [number, number, number, number, number];
type CompactStep =
  | [CompactPose[], [number, number], string]
  | [CompactPose[], [number, number], string, number, CompactArrow[]];
/** Un schéma à la forme d'un lien — que le lien d'une séance embarque aussi. */
export interface Compact {
  v: number;
  n: string;
  p: [number, number, number];
  /** v1 : [blancs, noirs, arbitres] ; v2+ : + [remplaçants blancs, noirs, bord]. */
  c: number[];
  /** [champ de vision, ligne, noms] ; v3 : + [fantômes, seuil d'apnée]. */
  d: (number | string)[];
  r: [string, number][];
  a: string[];
  s: CompactStep[];
  /**
   * LES AJOUTS DU 20/11/2026, À PART : porteur du palet et arrêt de jeu par
   * étape, apnée de chaque joueur, vitesse maximale. Une clé que les
   * lecteurs plus anciens IGNORENT — un élément de plus dans une étape leur
   * aurait fait sauter durée et flèches. Absente quand rien n'est posé.
   * Les nages courbes y sont entrées le 21/11/2026 (`cv`), les zones et
   * les mots ensuite (`zn`, `mt`, ADR 0026).
   */
  x?: CompactExtras;
}

interface CompactExtras {
  /** Par étape : l'index du porteur dans l'ordre des joueurs, ou −1. */
  k?: number[];
  /** Par étape : [genre, équipe] (équipe −1 pour un temps mort), ou 0. */
  e?: ([number, number] | 0)[];
  /** Par joueur, dans l'ordre du roster : son apnée, ou 0. */
  ap?: number[];
  /** La vitesse maximale, en dixièmes de m/s. */
  ms?: number;
  /** La récupération en surface, en pour cent du temps au fond. */
  rr?: number;
  /** La hauteur d'un flick, en centimètres. */
  fh?: number;
  /**
   * LES NAGES COURBES (21/11/2026) : [étape, index du joueur, x, y], le
   * point de contrôle en décimètres (`curve.ts`), une entrée par courbe.
   * Un lecteur plus ancien l'ignore : la phase s'y joue en lignes droites.
   */
  cv?: [number, number, number, number][];
  /**
   * LES ÉTIQUETTES (ADR 0029), telles que le schéma les range :
   * l'identifiant neutre d'une proposée, le texte d'une libre. Un lecteur
   * plus ancien l'ignore : le schéma s'y ouvre sans étiquettes.
   */
  tg?: string[];
  /**
   * LES ZONES (ADR 0026) : [étape, forme, x, y, largeur, hauteur] en
   * décimètres, et l'étiquette en septième place s'il y en a une ; une
   * entrée par zone, dans l'ordre de l'étape.
   */
  zn?: CompactZone[];
  /** LES MOTS (ADR 0026) : [étape, x, y, texte], en décimètres. */
  mt?: [number, number, number, string][];
}

type CompactZone =
  | [number, number, number, number, number, number]
  | [number, number, number, number, number, number, string];

interface Layout {
  squad: number;
  referees: number;
}
const LAYOUTS: Record<number, Layout> = {
  1: { squad: MAX_PLAYERS, referees: 3 },
  2: { squad: SQUAD_SIZE, referees: DECK_REFEREE_NUMBER },
  3: { squad: SQUAD_SIZE, referees: DECK_REFEREE_NUMBER },
};

/** L'ordre fixe des jetons dans une étape compacte, pour une version. */
function tokenOrder(layout: Layout): string[] {
  const ids: string[] = [];
  for (const team of TEAMS) {
    for (let n = 1; n <= layout.squad; n++) ids.push(playerId(team, n));
  }
  for (let n = 1; n <= layout.referees; n++) ids.push(refereeId(n));
  return ids;
}

const dm = (metres: number) => Math.round(metres * 10);
const fromDm = (value: number) => value / 10;

function compactPose(pose: Pose | undefined): CompactPose {
  if (!pose) return [0, 0, 0, 1];
  return [
    dm(pose.x),
    dm(pose.y),
    Math.round(pose.angle),
    pose.surface === false ? 0 : 1,
  ];
}

function compactArrow(arrow: Arrow): CompactArrow {
  return [
    ARROW_KINDS.indexOf(arrow.kind),
    dm(arrow.from.x),
    dm(arrow.from.y),
    dm(arrow.to.x),
    dm(arrow.to.y),
  ];
}

export function toCompact(tactic: Tactic): Compact {
  const order = tokenOrder(LAYOUTS[SHARE_VERSION]!);
  const { counts, display } = tactic;
  return {
    v: SHARE_VERSION,
    n: tactic.name,
    p: [tactic.pitch.length, tactic.pitch.width, tactic.pitch.depth],
    c: [
      counts.blanc,
      counts.noir,
      counts.referees,
      counts.substitutes.blanc,
      counts.substitutes.noir,
      counts.deckReferee ? 1 : 0,
    ],
    d: [
      display.fieldOfView ? 1 : 0,
      display.refereeLine ?? '',
      display.labels ? 1 : 0,
      display.ghosts ? 1 : 0,
      display.apneaLimit,
    ],
    r: tactic.roster.players.map(p => [p.name, p.leftHanded ? 1 : 0]),
    a: tactic.roster.referees.map(r => r.name),
    s: tactic.steps.map(step => [
      order.map(id => compactPose(step.poses[id])),
      [dm(step.puck.x), dm(step.puck.y)],
      step.note,
      step.duration,
      step.arrows.map(compactArrow),
    ]),
    ...extrasOf(tactic, order),
  };
}

function extrasOf(tactic: Tactic, order: string[]): { x?: CompactExtras } {
  const x: CompactExtras = {};
  if (tactic.steps.some(s => s.carrier)) {
    x.k = tactic.steps.map(s => (s.carrier ? order.indexOf(s.carrier) : -1));
  }
  if (tactic.steps.some(s => s.decision)) {
    x.e = tactic.steps.map(s =>
      s.decision
        ? [
            DECISION_KINDS.indexOf(s.decision.kind),
            s.decision.team ? TEAMS.indexOf(s.decision.team) : -1,
          ]
        : 0
    );
  }
  if (tactic.roster.players.some(p => p.apnea)) {
    x.ap = tactic.roster.players.map(p => p.apnea ?? 0);
  }
  if (tactic.display.maxSpeed !== undefined) {
    x.ms = dm(tactic.display.maxSpeed);
  }
  if (tactic.display.recoveryRatio !== undefined) {
    x.rr = Math.round(tactic.display.recoveryRatio * 100);
  }
  if (tactic.display.flickHeight !== undefined) {
    x.fh = Math.round(tactic.display.flickHeight * 100);
  }
  const curves = tactic.steps.flatMap((s, i) =>
    Object.entries(s.curves ?? {}).flatMap(([id, c]) => {
      const index = order.indexOf(id);
      return index < 0
        ? []
        : [[i, index, dm(c.x), dm(c.y)] as [number, number, number, number]];
    })
  );
  if (curves.length > 0) x.cv = curves;
  if (tactic.tags && tactic.tags.length > 0) x.tg = tactic.tags;
  const zones = tactic.steps.flatMap((s, i) =>
    (s.zones ?? []).map((z): CompactZone => {
      const box = [i, ZONE_SHAPES.indexOf(z.shape), dm(z.x), dm(z.y)] as const;
      return z.label
        ? [...box, dm(z.w), dm(z.h), z.label]
        : [...box, dm(z.w), dm(z.h)];
    })
  );
  if (zones.length > 0) x.zn = zones;
  const words = tactic.steps.flatMap((s, i) =>
    (s.words ?? []).map((w): [number, number, number, string] => [
      i,
      dm(w.x),
      dm(w.y),
      w.text,
    ])
  );
  if (words.length > 0) x.mt = words;
  return Object.keys(x).length > 0 ? { x } : {};
}

/** Les ajouts relus, posés sur le schéma ; ce qui est illisible est ignoré. */
function applyExtras(
  tactic: Record<string, unknown>,
  extras: CompactExtras | undefined,
  order: string[]
) {
  if (!extras) return;
  const steps = tactic.steps as Record<string, unknown>[];
  extras.k?.forEach((index, i) => {
    const id = order[index];
    if (steps[i] && id) steps[i].carrier = id;
  });
  extras.e?.forEach((entry, i) => {
    if (!steps[i] || entry === 0) return;
    const kind = DECISION_KINDS[entry[0]];
    const team = TEAMS[entry[1]];
    if (kind) steps[i].decision = team ? { kind, team } : { kind };
  });
  const players = (tactic.roster as { players: Record<string, unknown>[] })
    .players;
  extras.ap?.forEach((seconds, i) => {
    if (players[i] && seconds > 0) players[i].apnea = seconds;
  });
  const display = tactic.display as Record<string, unknown>;
  if (typeof extras.ms === 'number') display.maxSpeed = fromDm(extras.ms);
  if (typeof extras.rr === 'number') display.recoveryRatio = extras.rr / 100;
  if (typeof extras.fh === 'number') display.flickHeight = extras.fh / 100;
  // Une courbe illisible, ou sur la première étape — qui n'a pas de
  // départ —, est ignorée ; le reste du lien s'ouvre.
  extras.cv?.forEach(entry => {
    if (!Array.isArray(entry)) return;
    const [i, index, cx, cy] = entry;
    const step = steps[i];
    const id = order[index];
    if (!step || !id || i === 0) return;
    if (typeof cx !== 'number' || typeof cy !== 'number') return;
    const curves = (step.curves ?? {}) as Record<string, Point>;
    curves[id] = { x: fromDm(cx), y: fromDm(cy) };
    step.curves = curves;
  });
  // Des étiquettes illisibles tombent une à une ; le lien s'ouvre.
  const tags = cleanTags(extras.tg);
  if (tags.length > 0) tactic.tags = tags;
  // Une zone ou un mot illisible, ou de trop pour son étape, est ignoré ;
  // le reste du lien s'ouvre (ADR 0026).
  const finite = (...values: unknown[]) =>
    values.every(v => typeof v === 'number' && Number.isFinite(v));
  extras.zn?.forEach(entry => {
    if (!Array.isArray(entry)) return;
    const [i, kind, zx, zy, zw, zh, label] = entry;
    const step = typeof i === 'number' ? steps[i] : undefined;
    const shape = typeof kind === 'number' ? ZONE_SHAPES[kind] : undefined;
    if (!step || !shape || !finite(zx, zy, zw, zh)) return;
    if (zw <= 0 || zh <= 0) return;
    const zones = (step.zones ?? []) as Zone[];
    if (zones.length >= MAX_ZONES) return;
    const zone: Zone = {
      shape,
      x: fromDm(zx),
      y: fromDm(zy),
      w: fromDm(zw),
      h: fromDm(zh),
    };
    if (typeof label === 'string' && label) zone.label = markText(label);
    step.zones = [...zones, zone];
  });
  extras.mt?.forEach(entry => {
    if (!Array.isArray(entry)) return;
    const [i, wx, wy, text] = entry;
    const step = typeof i === 'number' ? steps[i] : undefined;
    if (!step || !finite(wx, wy) || typeof text !== 'string') return;
    const words = (step.words ?? []) as Word[];
    if (!text.trim() || words.length >= MAX_WORDS) return;
    step.words = [
      ...words,
      { x: fromDm(wx), y: fromDm(wy), text: markText(text) },
    ];
  });
}

export function fromCompact(
  compact: Compact,
  meta: { id: string; now: string }
): Tactic {
  const layout = LAYOUTS[compact.v];
  if (!layout) {
    throw new Error(`version de lien inconnue : ${String(compact.v)}`);
  }
  const order = tokenOrder(layout);

  // Relu à la forme de SA version : un roster de cette taille-là.
  const full = createRoster();
  const players = full.players.filter(p => p.number <= layout.squad);
  const referees = full.referees.filter(r => r.number <= layout.referees);
  players.forEach((player, i) => {
    const entry = compact.r[i];
    if (entry) {
      player.name = entry[0];
      player.leftHanded = entry[1] === 1;
    }
  });
  referees.forEach((referee, i) => {
    referee.name = compact.a[i] ?? '';
  });

  const steps = compact.s.map(entry => {
    const [poses, puck, note] = entry;
    const record: Record<string, Pose> = {};
    order.forEach((id, i) => {
      const pose = poses[i];
      if (!pose) return;
      const base = { x: fromDm(pose[0]), y: fromDm(pose[1]), angle: pose[2] };
      record[id] = id.startsWith('arbitre')
        ? base
        : { ...base, surface: pose[3] === 1 };
    });
    const step: Record<string, unknown> = {
      poses: record,
      puck: { x: fromDm(puck[0]), y: fromDm(puck[1]) },
      note,
    };
    if (entry.length === 5) {
      step.duration = entry[3];
      step.arrows = entry[4].map(([k, fx, fy, tx, ty]) => ({
        kind: ARROW_KINDS[k] ?? 'move',
        from: { x: fromDm(fx), y: fromDm(fy) },
        to: { x: fromDm(tx), y: fromDm(ty) },
      }));
    }
    return step;
  });

  const [blanc, noir, refs, subsBlanc, subsNoir, deck] = compact.c;
  const [fov, line, labels, ghosts, apneaLimit] = compact.d;
  const display: Record<string, unknown> = {
    fieldOfView: fov === 1,
    refereeLine: line === '' ? null : line,
    labels: labels === 1,
  };
  if (compact.v >= 3) {
    display.ghosts = ghosts === 1;
    display.apneaLimit = apneaLimit;
  }
  const tactic = {
    id: meta.id,
    name: compact.n,
    createdAt: meta.now,
    updatedAt: meta.now,
    pitch: { length: compact.p[0], width: compact.p[1], depth: compact.p[2] },
    roster: { players, referees },
    counts:
      compact.v === 1
        ? { blanc, noir, referees: refs }
        : {
            blanc,
            noir,
            referees: refs,
            substitutes: { blanc: subsBlanc, noir: subsNoir },
            deckReferee: deck === 1,
          },
    display,
    steps,
  };
  applyExtras(tactic, compact.x, order);
  return tacticSchema.parse(migrateTactic(tactic));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(code: string): Uint8Array {
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

const textToBase64Url = (text: string) =>
  bytesToBase64Url(new TextEncoder().encode(text));
const base64UrlToText = (code: string) =>
  new TextDecoder().decode(base64UrlToBytes(code));

/**
 * N'IMPORTE QUEL OBJET EN BASE64URL — la forme `#s=`, lisible partout. Le
 * lien d'un schéma et celui d'une séance (`features/seances/share.ts`)
 * passent par les mêmes quatre fonctions.
 */
export function encodeJson(value: unknown): string {
  return textToBase64Url(JSON.stringify(value));
}

export function decodeJson(code: string): unknown {
  return JSON.parse(base64UrlToText(code));
}

export function encodeTactic(tactic: Tactic): string {
  return encodeJson(toCompact(tactic));
}

/** Pour les tests : encode un objet compact quelconque (un lien v1, par ex.). */
export function encodeCompact(compact: unknown): string {
  return encodeJson(compact);
}

export function decodeTactic(
  code: string,
  meta: { id: string; now: string }
): Tactic {
  return fromCompact(decodeJson(code) as Compact, meta);
}

const canCompress = () =>
  typeof CompressionStream !== 'undefined' &&
  typeof DecompressionStream !== 'undefined';

async function pipe(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream
): Promise<Uint8Array> {
  // Écrit à la main plutôt que par `Blob.stream()`, absent de certains
  // environnements (jsdom, de vieux Safari).
  const writer = stream.writable.getWriter();
  // Un flux corrompu (lien tronqué) rejette AUSSI ces deux promesses : la
  // lecture ci-dessous porte déjà l'erreur, qui fait refuser le lien. Sans
  // ces deux `catch`, chaque lien abîmé laissait deux rejets non gérés —
  // « Uncaught (in promise) » à la console, et autant d'évènements d'erreur.
  writer.write(bytes as BufferSource).catch(() => {});
  writer.close().catch(() => {});
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

/**
 * Le même objet COMPRESSÉ (deflate) — la forme `#z=` —, ou `null` si le
 * navigateur ne sait pas compresser.
 */
export async function encodeJsonCompressed(
  value: unknown
): Promise<string | null> {
  if (!canCompress()) return null;
  const raw = new TextEncoder().encode(JSON.stringify(value));
  return bytesToBase64Url(
    await pipe(raw, new CompressionStream('deflate-raw'))
  );
}

export async function decodeJsonCompressed(code: string): Promise<unknown> {
  if (!canCompress()) throw new Error('décompression indisponible');
  const bytes = await pipe(
    base64UrlToBytes(code),
    new DecompressionStream('deflate-raw')
  );
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Le schéma compressé, ou `null` si le navigateur ne sait pas compresser. */
export async function encodeTacticCompressed(
  tactic: Tactic
): Promise<string | null> {
  return encodeJsonCompressed(toCompact(tactic));
}

export async function decodeTacticCompressed(
  code: string,
  meta: { id: string; now: string }
): Promise<Tactic> {
  return fromCompact((await decodeJsonCompressed(code)) as Compact, meta);
}

/** Le code porté par le fragment, et s'il est compressé ; ou `null`. */
export function sharedCodeFromHash(
  hash: string
): { code: string; compressed: boolean } | null {
  if (hash.startsWith(SHARE_PREFIX)) {
    return { code: hash.slice(SHARE_PREFIX.length), compressed: false };
  }
  if (hash.startsWith(SHARE_PREFIX_COMPRESSED)) {
    return {
      code: hash.slice(SHARE_PREFIX_COMPRESSED.length),
      compressed: true,
    };
  }
  return null;
}

/** Relit un lien partagé, quelle que soit sa forme. */
export async function decodeShared(
  shared: { code: string; compressed: boolean },
  meta: { id: string; now: string }
): Promise<Tactic> {
  return shared.compressed
    ? decodeTacticCompressed(shared.code, meta)
    : decodeTactic(shared.code, meta);
}

/** Le lien lisible partout (non compressé), synchrone. */
export function shareUrl(tactic: Tactic, base: string): string {
  return `${base}${SHARE_PREFIX}${encodeTactic(tactic)}`;
}

/** Le lien le plus court que sait fabriquer ce navigateur. */
export async function shortShareUrl(
  tactic: Tactic,
  base: string
): Promise<string> {
  const compressed = await encodeTacticCompressed(tactic);
  return compressed
    ? `${base}${SHARE_PREFIX_COMPRESSED}${compressed}`
    : shareUrl(tactic, base);
}
