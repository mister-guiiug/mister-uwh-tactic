import { z } from 'zod';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { casesOf, type DocumentHistory } from './local.ts';
import {
  migrateTactic,
  tacticSchema,
  type Tactic,
} from '../features/board/model.ts';

const log = createLogger('versions');

/** Au plus dix versions par schéma : les plus anciennes tombent. */
export const VERSIONS_PER_SCHEMA = 10;

/**
 * CE QU'UNE CASE PEUT TENIR, en caractères de JSON : un dixième des 5 Mo du
 * `localStorage`, que les vingt applications de la famille se partagent —
 * une seule origine. Un schéma de trois à cinq étapes pèse de 6 000 à
 * 9 000 caractères, un schéma de trente étapes 42 000 : soixante-dix
 * versions ordinaires. Au-delà, les plus anciennes tombent, tous schémas
 * confondus.
 */
export const VERSIONS_BUDGET = 500_000;

const CLE = 'schemas-versions';

const versionsSnapshotSchema = z.object({ versions: z.array(tacticSchema) });

type VersionsSnapshot = z.infer<typeof versionsSnapshotSchema>;

/**
 * Une version garde le modèle de l'application qui l'a rangée : elle monte à
 * la lecture, comme un schéma — `migrateTactic` est la seule porte d'entrée.
 */
function monter(data: unknown): unknown {
  const snapshot = data as { versions?: unknown };
  return Array.isArray(snapshot?.versions)
    ? { ...snapshot, versions: snapshot.versions.map(migrateTactic) }
    : data;
}

/**
 * LES VERSIONS DES SCHÉMAS (ADR 0034), SUR L'APPAREIL SEULEMENT : une case
 * pour la bibliothèque de l'appareil (`schemas-versions`), une par compte
 * (`schemas-versions@<compte>`), comme les schémas eux-mêmes. Jamais dans le
 * document synchronisé : la ligne d'un schéma resterait d'un seul tenant, et
 * dix fois plus lourde, à chaque envoi.
 *
 * Chaque version est un schéma entier, tel qu'il était enregistré : son
 * identifiant est celui du schéma, sa date (`updatedAt`) celle de la version.
 */
const cases = casesOf<VersionsSnapshot, Tactic>({
  key: CLE,
  version: 1,
  validate: data => versionsSnapshotSchema.parse(monter(data)),
  seed: () => ({ versions: [] }),
  items: snapshot => snapshot.versions,
  wrap: versions => ({ versions }),
});

const magasin = (owner: string | null) =>
  owner ? cases.account(owner) : cases.device;
const cleDe = (owner: string | null) => (owner ? `${CLE}@${owner}` : CLE);
const lire = (owner: string | null) => magasin(owner).load().versions;

function instant(date: string): number {
  const t = Date.parse(date);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * RANGE LES VERSIONS D'UNE CASE : la plus récente d'abord, sans doublon, dix
 * au plus par schéma, `VERSIONS_BUDGET` caractères au plus en tout. Rien à
 * garder, la clé disparaît.
 *
 * LE STOCKAGE PEUT REFUSER QUAND MÊME, plein de ce qu'y rangent les autres
 * applications. Refusée, l'écriture recommence sans la version la plus
 * ancienne, jusqu'à passer : l'historique cède la place, jamais le schéma —
 * écrit avant lui.
 */
function ecrire(owner: string | null, versions: readonly Tactic[]): void {
  const rangs = new Map<string, number>();
  const vues = new Map<string, Tactic[]>();
  let poids = 0;
  let liste = [...versions]
    .sort((a, b) => instant(b.updatedAt) - instant(a.updatedAt))
    .filter(version => {
      const cle = `${version.id}|${version.updatedAt}`;
      const memes = vues.get(cle) ?? [];
      if (memes.some(vue => sameVersion(vue, version))) return false;
      vues.set(cle, [...memes, version]);
      return true;
    })
    .filter(version => {
      const rang = (rangs.get(version.id) ?? 0) + 1;
      rangs.set(version.id, rang);
      return rang <= VERSIONS_PER_SCHEMA;
    })
    .filter(version => {
      poids += JSON.stringify(version).length;
      return poids <= VERSIONS_BUDGET;
    });
  const ici = magasin(owner);
  const avant = liste.length;
  while (liste.length > 0 && !ici.save({ versions: liste })) {
    liste = liste.slice(0, -1);
  }
  if (liste.length === 0) ici.store.remove(cleDe(owner));
  if (liste.length < avant) {
    log.warn('stockage plein : les versions les plus anciennes tombent', {
      retirees: avant - liste.length,
    });
  }
}

/** Deux valeurs JSON égales ; une clé `undefined` vaut une clé absente. */
function pareil(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null ||
    Array.isArray(a) !== Array.isArray(b)
  ) {
    return false;
  }
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const cles = Object.keys(ra).filter(cle => ra[cle] !== undefined);
  return (
    cles.length ===
      Object.keys(rb).filter(cle => rb[cle] !== undefined).length &&
    cles.every(cle => pareil(ra[cle], rb[cle]))
  );
}

/**
 * DEUX VERSIONS PAREILLES, À LA DATE ET AUX ÉTIQUETTES PRÈS.
 *
 * Un geste défait puis refait redate le schéma sans le changer. Et une
 * étiquette range le schéma sans le changer (ADR 0029) : chaque case cochée
 * dans sa feuille enregistre, et trois étiquettes auraient chassé trois
 * versions de la phase.
 */
export function sameVersion(a: Tactic, b: Tactic): boolean {
  const sans = (t: Tactic) => ({ ...t, updatedAt: '', tags: undefined });
  return pareil(sans(a), sans(b));
}

/**
 * CE QU'UNE SUPPRESSION A EMPORTÉ, le temps de la page : le schéma tel qu'il
 * est parti, et ses versions. « Annuler » le remet tel quel (ADR 0008) — et
 * ses versions reviennent avec lui. Un autre schéma au même identifiant n'est
 * pas une annulation. La page fermée, la suppression ne s'annule plus, et ses
 * versions sont parties pour de bon.
 */
const emportees = new Map<string, { doc: Tactic; versions: Tactic[] }>();
const cleEmportee = (owner: string | null, id: string) =>
  `${owner ?? ''}|${id}`;

function oublierEmportees(owner: string | null): void {
  for (const cle of [...emportees.keys()]) {
    if (cle.startsWith(`${owner ?? ''}|`)) emportees.delete(cle);
  }
}

/**
 * CE QUE LE LOCAL ET LA SYNCHRONISATION PRÉVIENNENT (`DocumentHistory`).
 *
 * - un enregistrement fait ici range la version d'avant, s'il change le
 *   schéma ;
 * - une suppression emporte ses versions (et les garde pour « Annuler ») ;
 * - un schéma qui passe de l'appareil à un compte (« Ajouter à mon
 *   compte », la reprise d'une ancienne bibliothèque) les emmène ;
 * - l'effacement d'un compte efface les siennes.
 */
export const schemaHistory: DocumentHistory<Tactic> = {
  saved(owner, previous, next) {
    if (!previous) {
      const cle = cleEmportee(owner, next.id);
      const emportee = emportees.get(cle);
      if (
        emportee &&
        emportee.doc.updatedAt === next.updatedAt &&
        sameVersion(emportee.doc, next)
      ) {
        emportees.delete(cle);
        ecrire(owner, [...lire(owner), ...emportee.versions]);
      }
      return;
    }
    if (sameVersion(previous, next)) return;
    ecrire(owner, [previous, ...lire(owner)]);
  },

  removed(owner, docs) {
    const versions = lire(owner);
    const partent = new Set(docs.map(doc => doc.id));
    if (!versions.some(version => partent.has(version.id))) return;
    for (const doc of docs) {
      const siennes = versions.filter(version => version.id === doc.id);
      if (siennes.length > 0) {
        emportees.set(cleEmportee(owner, doc.id), { doc, versions: siennes });
      }
    }
    ecrire(
      owner,
      versions.filter(version => !partent.has(version.id))
    );
  },

  moved(ids, from, to) {
    if (from === to) return;
    const partent = new Set(ids);
    const depart = lire(from);
    const suivent = depart.filter(version => partent.has(version.id));
    if (suivent.length === 0) return;
    ecrire(to, [...lire(to), ...suivent]);
    ecrire(
      from,
      depart.filter(version => !partent.has(version.id))
    );
  },

  forget(owner) {
    cases.account(owner).clear();
    oublierEmportees(owner);
  },
};

/** Les versions d'un schéma dans une case, la plus récente d'abord. */
export function versionsOf(owner: string | null, id: string): Tactic[] {
  return lire(owner).filter(version => version.id === id);
}

/**
 * LA VERSION QU'ON VIENT DE REPRENDRE QUITTE L'HISTORIQUE : elle est
 * désormais le schéma, et celui d'avant y a pris sa place.
 */
export function dropVersion(owner: string | null, version: Tactic): void {
  const versions = lire(owner);
  const rang = versions.findIndex(
    v =>
      v.id === version.id &&
      v.updatedAt === version.updatedAt &&
      sameVersion(v, version)
  );
  if (rang >= 0)
    ecrire(
      owner,
      versions.filter((_, i) => i !== rang)
    );
}

/**
 * À L'EFFACEMENT DU COMPTE, celles de la bibliothèque de l'appareil aussi :
 * `deleteMyAccount` en vide les schémas, peut-être les siens d'avant la
 * connexion.
 */
export function clearDeviceVersions(): void {
  cases.device.clear();
  oublierEmportees(null);
}
