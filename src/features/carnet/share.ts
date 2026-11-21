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
import {
  CARNET_PREFIX,
  CARNET_PREFIX_COMPRESSED,
  type CarnetArrival,
} from './link.ts';

/**
 * LE CARNET DE JEU PAR UN LIEN (ADR 0023) : les schémas cochés dans la
 * bibliothèque, un nom s'il en a un, compressés d'un bloc — d'un schéma à
 * l'autre, les positions se ressemblent, et deflate le voit. Chaque schéma
 * voyage à la forme compacte d'un lien de schéma (`board/share.ts`), comme
 * dans le lien d'une séance.
 *
 * À L'OUVERTURE, TOUT ENTRE SOUS DE NOUVEAUX IDENTIFIANTS : reprendre ceux de
 * l'entraîneur ferait du carnet de la semaine suivante un écrasement de
 * celui-ci — et, avec un compte, réclamerait au serveur des lignes qui sont
 * à quelqu'un d'autre.
 */
export const CARNET_SHARE_VERSION = 1;

export const CARNET_LIMITS = {
  /** Comme le nom d'un schéma. */
  name: 60,
  /**
   * La relecture ne s'engage pas sur une liste sans fin. Trente schémas,
   * c'est un mois de séances, et un lien d'une quinzaine de kilo-octets —
   * un message WhatsApp porte 65 536 caractères (ADR 0023).
   */
  schemas: 30,
} as const;

/**
 * AU-DELÀ, LA FEUILLE LE DIT : 4 096 caractères, la longueur d'un message
 * Telegram ; d'autres messageries replient ou coupent un texte plus long, et
 * un lien coupé est refusé à l'ouverture. Le lien est en base64url : un
 * octet, un caractère.
 */
export const MESSAGE_LIMIT = 4096;

interface CompactCarnet {
  v: typeof CARNET_SHARE_VERSION;
  /** Le nom du carnet ; absent quand il n'en a pas. */
  n?: string;
  /** Les schémas, dans l'ordre de la bibliothèque, à la forme d'un lien. */
  t: Compact[];
}

const illisible = () => new Error('lien de carnet illisible');

/**
 * L'ENVELOPPE, VÉRIFIÉE À LA MAIN — pas par zod, pour la raison que donne
 * `lireEnveloppe` dans `seances/share.ts` : chaque schéma l'est ensuite par
 * celui du tableau, et décrire l'enveloppe en zod tirerait dans l'accueil
 * des morceaux de zod que rien d'autre n'y emploie. Une clé inconnue est
 * ignorée : un carnet d'une version future qui en ajouterait une reste
 * lisible ici.
 */
function lireEnveloppe(raw: unknown): CompactCarnet {
  const c = raw as Partial<CompactCarnet> | null;
  if (
    !c ||
    typeof c !== 'object' ||
    c.v !== CARNET_SHARE_VERSION ||
    (c.n !== undefined && typeof c.n !== 'string') ||
    !Array.isArray(c.t) ||
    c.t.length === 0 ||
    c.t.length > CARNET_LIMITS.schemas ||
    c.t.some(entry => !entry || typeof entry !== 'object')
  ) {
    throw illisible();
  }
  return c as CompactCarnet;
}

/** Ce qu'apporte un lien de carnet : son nom, et ses schémas. */
export interface SharedCarnet {
  name: string;
  schemas: Tactic[];
}

export function toCompactCarnet(
  schemas: readonly Tactic[],
  name = ''
): CompactCarnet {
  const n = name.trim().slice(0, CARNET_LIMITS.name);
  return {
    v: CARNET_SHARE_VERSION,
    ...(n ? { n } : {}),
    t: schemas.slice(0, CARNET_LIMITS.schemas).map(toCompact),
  };
}

/**
 * Relit un carnet partagé. TOUT EST VALIDÉ AVANT QUE RIEN N'ENTRE — chaque
 * schéma par le schéma zod du tableau : un lien tronqué ou forgé est refusé
 * en entier, sans laisser la moitié d'un carnet dans la bibliothèque.
 *
 * Le premier schéma reçoit l'heure de l'ouverture, le suivant une
 * milliseconde de moins, et ainsi de suite : la bibliothèque, rangée par
 * date, les montre dans l'ordre du carnet.
 */
export function fromCompactCarnet(
  raw: unknown,
  meta: { newId: () => string; now: string }
): SharedCarnet {
  const compact = lireEnveloppe(raw);
  const start = Date.parse(meta.now);
  return {
    name: (compact.n ?? '').slice(0, CARNET_LIMITS.name),
    schemas: compact.t.map((entry, i) =>
      fromCompact(entry, {
        id: meta.newId(),
        now: new Date(start - i).toISOString(),
      })
    ),
  };
}

/** Le lien le plus court que sait fabriquer ce navigateur. */
export async function carnetShareUrl(
  schemas: readonly Tactic[],
  name: string,
  base: string
): Promise<string> {
  const compact = toCompactCarnet(schemas, name);
  const compressed = await encodeJsonCompressed(compact);
  return compressed
    ? `${base}${CARNET_PREFIX_COMPRESSED}${compressed}`
    : `${base}${CARNET_PREFIX}${encodeJson(compact)}`;
}

export async function decodeSharedCarnet(
  shared: { code: string; compressed: boolean },
  meta: { newId: () => string; now: string }
): Promise<SharedCarnet> {
  const raw = shared.compressed
    ? await decodeJsonCompressed(shared.code)
    : decodeJson(shared.code);
  return fromCompactCarnet(raw, meta);
}

/**
 * UN CARNET REÇU ENTRE DANS LA BIBLIOTHÈQUE, par le magasin, donc par le
 * port : sur l'appareil d'abord — c'est ce qui le laisse relire au bord du
 * bassin, sans réseau —, et avec un compte, il le suit. Un schéma que la base
 * refuserait reste sur l'appareil (le port l'y a écrit), et le magasin des
 * schémas le dit ; les autres entrent quand même.
 */
export async function receiveCarnet(
  shared: { code: string; compressed: boolean },
  now = new Date().toISOString()
): Promise<CarnetArrival> {
  const { name, schemas } = await decodeSharedCarnet(shared, {
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
  return { name, ids: schemas.map(schema => schema.id) };
}
