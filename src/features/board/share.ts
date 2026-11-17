import {
  createRoster,
  playerId,
  refereeId,
  tacticSchema,
  TEAMS,
  MAX_PLAYERS,
  type Pose,
  type Step,
  type Tactic,
} from './model.ts';

/**
 * PARTAGER UN SCHÉMA PAR UN LIEN, sans serveur.
 *
 * Le schéma voyage dans le FRAGMENT de l'adresse (`#s=…`) : le navigateur ne
 * l'envoie jamais au serveur, il n'apparaît dans aucun journal de GitHub
 * Pages. Le lien EST la donnée — ce qui le rend aussi durable que le message
 * qui le porte.
 *
 * Le format est compact parce qu'un lien se colle dans une messagerie : des
 * tableaux plutôt que des objets, les positions en décimètres entiers, les
 * angles en degrés entiers. Six étapes de quinze jetons tiennent en environ
 * deux kilo-octets. Ce qui revient est validé par le même schéma zod que ce
 * qui sort du stockage : un lien tronqué ou forgé est refusé, pas « réparé ».
 */
export const SHARE_VERSION = 1;
export const SHARE_PREFIX = '#s=';

type CompactPose = [number, number, number, number];
type CompactStep = [CompactPose[], [number, number], string];
interface Compact {
  v: number;
  n: string;
  p: [number, number, number];
  c: [number, number, number];
  d: [number, string, number];
  r: [string, number][];
  a: string[];
  s: CompactStep[];
}

/** L'ordre fixe des jetons dans une étape compacte. */
function tokenOrder(): string[] {
  const ids: string[] = [];
  for (const team of TEAMS) {
    for (let n = 1; n <= MAX_PLAYERS; n++) ids.push(playerId(team, n));
  }
  for (let n = 1; n <= 3; n++) ids.push(refereeId(n));
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

export function toCompact(tactic: Tactic): Compact {
  const order = tokenOrder();
  return {
    v: SHARE_VERSION,
    n: tactic.name,
    p: [tactic.pitch.length, tactic.pitch.width, tactic.pitch.depth],
    c: [tactic.counts.blanc, tactic.counts.noir, tactic.counts.referees],
    d: [
      tactic.display.fieldOfView ? 1 : 0,
      tactic.display.refereeLine ?? '',
      tactic.display.labels ? 1 : 0,
    ],
    r: tactic.roster.players.map(p => [p.name, p.leftHanded ? 1 : 0]),
    a: tactic.roster.referees.map(r => r.name),
    s: tactic.steps.map(step => [
      order.map(id => compactPose(step.poses[id])),
      [dm(step.puck.x), dm(step.puck.y)],
      step.note,
    ]),
  };
}

export function fromCompact(
  compact: Compact,
  meta: { id: string; now: string }
): Tactic {
  if (compact.v !== SHARE_VERSION) {
    throw new Error(`version de lien inconnue : ${String(compact.v)}`);
  }
  const order = tokenOrder();
  const roster = createRoster();
  roster.players.forEach((player, i) => {
    const entry = compact.r[i];
    if (entry) {
      player.name = entry[0];
      player.leftHanded = entry[1] === 1;
    }
  });
  roster.referees.forEach((referee, i) => {
    referee.name = compact.a[i] ?? '';
  });
  const steps: Step[] = compact.s.map(([poses, puck, note]) => {
    const record: Record<string, Pose> = {};
    order.forEach((id, i) => {
      const pose = poses[i];
      if (!pose) return;
      const base = { x: fromDm(pose[0]), y: fromDm(pose[1]), angle: pose[2] };
      record[id] = id.startsWith('arbitre')
        ? base
        : { ...base, surface: pose[3] === 1 };
    });
    return {
      poses: record,
      puck: { x: fromDm(puck[0]), y: fromDm(puck[1]) },
      note,
    };
  });
  return tacticSchema.parse({
    id: meta.id,
    name: compact.n,
    createdAt: meta.now,
    updatedAt: meta.now,
    pitch: { length: compact.p[0], width: compact.p[1], depth: compact.p[2] },
    roster,
    counts: { blanc: compact.c[0], noir: compact.c[1], referees: compact.c[2] },
    display: {
      fieldOfView: compact.d[0] === 1,
      refereeLine: compact.d[1] === '' ? null : compact.d[1],
      labels: compact.d[2] === 1,
    },
    steps,
  });
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeTactic(tactic: Tactic): string {
  return toBase64Url(JSON.stringify(toCompact(tactic)));
}

export function decodeTactic(
  code: string,
  meta: { id: string; now: string }
): Tactic {
  return fromCompact(JSON.parse(fromBase64Url(code)) as Compact, meta);
}

/** Le code porté par un fragment `#s=…`, ou `null`. */
export function sharedCodeFromHash(hash: string): string | null {
  return hash.startsWith(SHARE_PREFIX) ? hash.slice(SHARE_PREFIX.length) : null;
}

export function shareUrl(tactic: Tactic, base: string): string {
  return `${base}${SHARE_PREFIX}${encodeTactic(tactic)}`;
}
