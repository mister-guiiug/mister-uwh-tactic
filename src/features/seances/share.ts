import { createUuid } from '@mister-guiiug/dev-pwa-config/id';
import {
  decodeJson,
  decodeJsonCompressed,
  encodeJson,
  encodeJsonCompressed,
  fromCompact,
  toCompact,
  type Compact,
} from '../board/share.ts';
import type { Tactic } from '../board/model.ts';
import { useSchemas } from '../schemas/store.ts';
import { SEANCE_LIMITS, seanceSchema, type Seance } from './model.ts';
import { SEANCE_PREFIX, SEANCE_PREFIX_COMPRESSED } from './link.ts';
import { useSeances } from './store.ts';

/**
 * PARTAGER UNE SÉANCE PAR UN LIEN (ADR 0018, suivi du 20/11/2026).
 *
 * Une séance désigne ses schémas par identifiant : seule, elle n'aurait rien
 * à présenter chez qui la reçoit. LE LIEN EMPORTE DONC LES SCHÉMAS, chacun
 * une fois — une séance peut revenir deux fois au même —, sous la forme
 * compacte d'un lien de schéma (`board/share.ts`) ; chaque phase y renvoie
 * par sa place dans la liste. Le tout est compressé d'un bloc : d'un schéma
 * à l'autre, les positions se ressemblent, et deflate le voit.
 *
 * Une phase dont le schéma a disparu ne part pas : il n'y a rien à montrer.
 *
 * À L'OUVERTURE, TOUT ENTRE SOUS DE NOUVEAUX IDENTIFIANTS, et les phases sont
 * recâblées vers eux. Reprendre ceux de l'expéditeur ferait d'un second envoi
 * un écrasement — et, avec un compte, réclamerait au serveur des lignes qui
 * sont à quelqu'un d'autre.
 */
export const SEANCE_SHARE_VERSION = 1;

interface CompactSeance {
  v: typeof SEANCE_SHARE_VERSION;
  n: string;
  /** Les phases : [place du schéma dans `t`, minutes, consigne]. */
  p: [number, number, string][];
  /** Les schémas, chacun une fois, à la forme d'un lien de schéma. */
  t: Compact[];
}

const illisible = () => new Error('lien de séance illisible');

/**
 * L'ENVELOPPE, VÉRIFIÉE À LA MAIN — pas par zod. Ce qu'elle contient l'est
 * ensuite par les schémas zod de la séance et du tableau ; la décrire en zod
 * aurait tiré `z.tuple` et `z.literal`, que rien d'autre n'emploie, dans le
 * morceau de zod que l'accueil précharge (+0,8 kB gzip, mesuré le
 * 20/11/2026).
 */
function lireEnveloppe(raw: unknown): CompactSeance {
  const c = raw as Partial<CompactSeance> | null;
  if (
    !c ||
    c.v !== SEANCE_SHARE_VERSION ||
    typeof c.n !== 'string' ||
    !Array.isArray(c.p) ||
    !Array.isArray(c.t) ||
    c.p.length > SEANCE_LIMITS.items ||
    c.t.length > SEANCE_LIMITS.items
  ) {
    throw illisible();
  }
  for (const phase of c.p as unknown[]) {
    if (
      !Array.isArray(phase) ||
      !Number.isInteger(phase[0]) ||
      (phase[0] as number) < 0 ||
      typeof phase[1] !== 'number' ||
      typeof phase[2] !== 'string'
    ) {
      throw illisible();
    }
  }
  return c as CompactSeance;
}

/** Ce qu'apporte un lien de séance : elle, et les schémas qu'elle présente. */
export interface SharedSeance {
  seance: Seance;
  schemas: Tactic[];
}

export function toCompactSeance(
  seance: Seance,
  library: ReadonlyMap<string, Tactic>
): CompactSeance {
  const ordre: Tactic[] = [];
  const p: CompactSeance['p'] = [];
  for (const item of seance.items) {
    const schema = library.get(item.schemaId);
    if (!schema) continue;
    let place = ordre.indexOf(schema);
    if (place < 0) place = ordre.push(schema) - 1;
    p.push([place, item.minutes, item.note]);
  }
  return {
    v: SEANCE_SHARE_VERSION,
    n: seance.name,
    p,
    t: ordre.map(toCompact),
  };
}

/**
 * Relit une séance partagée. Tout est validé — la séance par son schéma zod,
 * chaque schéma par celui du tableau : un lien tronqué ou forgé est refusé
 * en entier, sans rien laisser dans la bibliothèque.
 */
export function fromCompactSeance(
  raw: unknown,
  meta: { newId: () => string; now: string }
): SharedSeance {
  const compact = lireEnveloppe(raw);
  const utiles = new Set(compact.p.map(([place]) => place));
  const relus = compact.t.map((entry, place) =>
    utiles.has(place)
      ? fromCompact(entry, { id: meta.newId(), now: meta.now })
      : null
  );
  const seance = seanceSchema.parse({
    id: meta.newId(),
    name: compact.n.slice(0, SEANCE_LIMITS.name),
    items: compact.p.map(([place, minutes, note]) => {
      const schema = relus[place];
      if (!schema) throw new Error(`phase sans schéma : ${place}`);
      return { schemaId: schema.id, minutes, note };
    }),
    updatedAt: meta.now,
  });
  return {
    seance,
    schemas: relus.filter((schema): schema is Tactic => schema !== null),
  };
}

/** Le lien le plus court que sait fabriquer ce navigateur. */
export async function seanceShareUrl(
  seance: Seance,
  library: ReadonlyMap<string, Tactic>,
  base: string
): Promise<string> {
  const compact = toCompactSeance(seance, library);
  const compressed = await encodeJsonCompressed(compact);
  return compressed
    ? `${base}${SEANCE_PREFIX_COMPRESSED}${compressed}`
    : `${base}${SEANCE_PREFIX}${encodeJson(compact)}`;
}

export async function decodeSharedSeance(
  shared: { code: string; compressed: boolean },
  meta: { newId: () => string; now: string }
): Promise<SharedSeance> {
  const raw = shared.compressed
    ? await decodeJsonCompressed(shared.code)
    : decodeJson(shared.code);
  return fromCompactSeance(raw, meta);
}

/**
 * UNE SÉANCE REÇUE ENTRE DANS LA BIBLIOTHÈQUE, ses schémas d'abord — par les
 * magasins, donc par les ports : avec un compte, ils le suivent. Un schéma
 * que la base refuserait reste sur l'appareil (le port l'y a écrit), et le
 * magasin des schémas le dit ; la séance entre quand même.
 */
export async function receiveSeance(
  shared: { code: string; compressed: boolean },
  now = new Date().toISOString()
): Promise<Seance> {
  const { seance, schemas } = await decodeSharedSeance(shared, {
    newId: createUuid,
    now,
  });
  for (const schema of schemas) {
    try {
      await useSchemas.getState().save(schema);
    } catch {
      // Dit par le magasin des schémas (`error`) ; la copie est sur l'appareil.
    }
  }
  useSeances.getState().restore(seance);
  return seance;
}
