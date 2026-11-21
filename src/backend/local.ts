import { createStore } from '@mister-guiiug/dev-pwa-config/storage';
import {
  createVersionedStore,
  type SeededVersionedStore,
} from '@mister-guiiug/dev-pwa-config/versioned-store';
import {
  schemasSnapshotSchema,
  type Backend,
  type LibraryRepository,
  type NotesSnapshot,
  type SchemasSnapshot,
} from './ports.ts';
import { notesStoreOptions } from './notes-file.ts';
import { migrateTactic, type Tactic } from '../features/board/model.ts';
import {
  SEANCE_VERSION,
  seancesSnapshotSchema,
  type Seance,
  type SeancesSnapshot,
} from '../features/seances/model.ts';

/** L'espace de l'application dans le `localStorage` que la famille partage. */
const ESPACE = 'mister-uwh-tactic';

/**
 * L'adaptateur local : `versioned-store` du socle, pas `localStorage` nu.
 *
 * La différence tient en une garantie : ce magasin enveloppe la donnée dans
 * `{ v, data }`, applique une chaîne de migrations qui montent d'un cran, et
 * **copie de côté avant toute perte possible** — donnée illisible, version
 * venue du futur, schéma refusé. Sept apps du parc avaient chacune leur
 * `storage.ts` maison ; aucune n'avait cette copie de sauvegarde, et c'est
 * exactement ce qui manque le jour où un utilisateur ouvre une version
 * antérieure de l'app.
 *
 * `validate` reçoit le schéma zod de l'application : le socle ne dépend
 * d'aucun validateur, il appelle celui qu'on lui donne. Version, migrations et
 * validation viennent de `notes-file.ts`, partagé avec l'adaptateur distant :
 * les deux relisent les mêmes fichiers exportés.
 */
export const notesStore = createVersionedStore<NotesSnapshot>({
  store: ESPACE,
  ...notesStoreOptions,
});

/**
 * UNE ÉTAGÈRE : une liste de documents rangée sur l'appareil, qu'on relit et
 * qu'on réécrit en entier. C'est tout ce que la synchronisation par compte
 * (`supabase-documents.ts`) demande à une bibliothèque, qu'elle tienne des
 * schémas ou des séances.
 */
export interface Shelf<T> {
  load(): T[];
  save(items: T[]): void;
}

/**
 * LES ÉTAGÈRES D'UNE SORTE DE DOCUMENT : celle de l'appareil — ce qu'on
 * enregistre sans compte — et une par compte, sa copie hors ligne.
 */
export interface Shelves<T> {
  device: Shelf<T>;
  account(owner: string): Shelf<T>;
  /**
   * Ne garde de la copie d'un compte que ce que `garder` retient ; rien de
   * retenu, la clé disparaît. Les copies de côté restent.
   */
  keep(owner: string, garder: (item: T) => boolean): void;
  /** Oublie la copie d'un compte, copies de côté comprises. */
  forget(owner: string): void;
}

/**
 * CE QUI SUIT UN DOCUMENT SUR L'APPAREIL SANS PARTIR AVEC LUI — les versions
 * d'un schéma (ADR 0034). Le local et la synchronisation par compte le
 * préviennent de ce qu'ils font au document, case par case (`null` : la
 * bibliothèque de l'appareil, un UUID : la copie de ce compte), sans savoir
 * ce qu'il range. Facultatif : les séances n'en ont pas.
 */
export interface DocumentHistory<T> {
  /**
   * Un geste fait ICI remplace `previous` par `next` — enregistrer, ou le
   * brouillon rangé au départ de son compte. `previous` absent : le document
   * n'était pas dans la case.
   */
  saved(owner: string | null, previous: T | undefined, next: T): void;
  /** Ces documents ont quitté la case : supprimés ici, ou ailleurs. */
  removed(owner: string | null, removed: readonly T[]): void;
  /** Ces documents sont passés d'une case à l'autre. */
  moved(ids: readonly string[], from: string | null, to: string | null): void;
  /** Le compte est effacé : ce qu'il gardait sur l'appareil part avec lui. */
  forget(owner: string): void;
}

interface CasesOptions<S, T> {
  /** La clé de l'appareil ; celle d'un compte y ajoute `@` et son UUID. */
  key: string;
  version: number;
  migrations?: Record<number, (data: unknown) => unknown>;
  validate: (data: unknown) => S;
  seed: () => S;
  items: (snapshot: S) => T[];
  wrap: (items: T[]) => S;
}

/**
 * UNE CASE POUR L'APPAREIL, UNE PAR COMPTE — la même forme pour chaque sorte
 * de document : version, migrations et validation partagées, un document se
 * relit pareil où qu'il soit rangé. Écrit pour les schémas (ADR 0015), repris
 * tel quel par les séances (ADR 0018) et les versions des schémas (ADR 0034).
 */
export function casesOf<S, T>({
  key,
  items,
  wrap,
  ...options
}: CasesOptions<S, T>) {
  const device = createVersionedStore<S>({ store: ESPACE, key, ...options });
  const cleDuCompte = (owner: string) => `${key}@${owner}`;
  const motif = new RegExp(`^${key}@([^.]+)$`);
  const parCompte = new Map<string, SeededVersionedStore<S>>();

  function account(owner: string): SeededVersionedStore<S> {
    let magasin = parCompte.get(owner);
    if (!magasin) {
      magasin = createVersionedStore<S>({
        store: ESPACE,
        key: cleDuCompte(owner),
        ...options,
      });
      parCompte.set(owner, magasin);
    }
    return magasin;
  }

  function keep(owner: string, garder: (item: T) => boolean): void {
    const magasin = account(owner);
    const liste = items(magasin.load());
    const reste = liste.filter(garder);
    if (reste.length === 0) magasin.store.remove(cleDuCompte(owner));
    else if (reste.length < liste.length) magasin.save(wrap(reste));
  }

  function accounts(): string[] {
    return createStore(ESPACE)
      .keys()
      .map(cle => motif.exec(cle)?.[1])
      .filter((owner): owner is string => owner !== undefined);
  }

  const shelf = (magasin: SeededVersionedStore<S>): Shelf<T> => ({
    load: () => items(magasin.load()),
    save: liste => {
      magasin.save(wrap(liste));
    },
  });

  const shelves: Shelves<T> = {
    device: shelf(device),
    account: owner => shelf(account(owner)),
    keep,
    forget: owner => account(owner).clear(),
  };

  return { device, account, keep, accounts, shelves };
}

/**
 * La forme d'une bibliothèque de schémas, quelle qu'en soit la case : version,
 * migrations, validation. Celle de l'appareil et celle de chaque compte la
 * partagent — un schéma se relit pareil où qu'il soit rangé.
 */
const schemas = casesOf<SchemasSnapshot, Tactic>({
  key: 'schemas',
  version: 2,
  // v1 → v2 : chaque schéma gagne remplaçants et arbitre de bord, masqués.
  migrations: {
    1: (data: unknown) => {
      const snapshot = data as { schemas?: unknown[] };
      return Array.isArray(snapshot?.schemas)
        ? { ...snapshot, schemas: snapshot.schemas.map(migrateTactic) }
        : data;
    },
  },
  validate: (data: unknown) => schemasSnapshotSchema.parse(data),
  seed: (): SchemasSnapshot => ({ schemas: [] }),
  items: snapshot => snapshot.schemas,
  wrap: liste => ({ schemas: liste }),
});

/**
 * LES SCHÉMAS DE L'APPAREIL — ceux qu'on enregistre sans compte. Dans le même
 * espace que les notes mais sous leur propre clé : effacer les notes ne
 * touche pas aux schémas, et inversement.
 *
 * Avant l'ADR 0015 (suivi du 18/11/2026), c'était l'unique bibliothèque :
 * ceux d'un compte s'y mêlaient, et le compte suivant les voyait. Ils ont
 * désormais leur case (`accountSchemasStore`), et la première lecture d'un
 * compte vient y reprendre les siens (`supabase-documents.ts`).
 */
export const schemasStore = schemas.device;

/**
 * LES SCHÉMAS D'UN COMPTE, SUR CET APPAREIL : sa copie hors ligne, et ce qui
 * attend d'être envoyé. Une case par compte (`schemas@<compte>`), jamais lue
 * sous un autre — le compte suivant ne voit rien du précédent (ADR 0013), et
 * le précédent, revenu au bord du bassin sans réseau, retrouve sa
 * bibliothèque.
 */
export const accountSchemasStore = schemas.account;

/**
 * NE GARDE DE LA COPIE D'UN COMPTE QUE CE QUE `garder` RETIENT — à sa
 * déconnexion, où `supabase-documents.ts` sait ce que le serveur a déjà. Rien
 * de retenu, la clé disparaît, et `accountsWithSchemas()` ne le nomme plus.
 *
 * LES COPIES DE CÔTÉ RESTENT (`schemas@<compte>.backup-…`). Le magasin n'en
 * écrit que devant une donnée qu'il n'a pas su lire, ou avant une migration :
 * c'est son filet contre la perte, et ce qu'elles tiennent, cette version ne
 * le sait pas. Seul l'effacement du compte les emporte (`clear()`).
 */
export const keepAccountSchemas = schemas.keep;

/** Les comptes qui ont une bibliothèque de schémas sur cet appareil. */
export const accountsWithSchemas = schemas.accounts;

/** Les étagères des schémas, pour la synchronisation par compte. */
export const schemaShelves = schemas.shelves;

/**
 * LES SÉANCES (ADR 0018), rangées comme les schémas : `seances` pour celles
 * de l'appareil, `seances@<compte>` pour la copie de chaque compte. La clé
 * `seances` est celle d'avant le compte — le magasin des séances l'écrivait
 * déjà sous ce nom : rien ne bouge pour qui n'a pas de compte.
 */
const seances = casesOf<SeancesSnapshot, Seance>({
  key: 'seances',
  version: SEANCE_VERSION,
  validate: (data: unknown) => seancesSnapshotSchema.parse(data),
  seed: (): SeancesSnapshot => ({ seances: [] }),
  items: snapshot => snapshot.seances,
  wrap: liste => ({ seances: liste }),
});

export const seancesStore = seances.device;
export const accountSeancesStore = seances.account;
export const keepAccountSeances = seances.keep;
export const accountsWithSeances = seances.accounts;
export const seanceShelves = seances.shelves;

/**
 * Lire, enregistrer, retirer dans UNE bibliothèque : celle de l'appareil en
 * mode local, celle du compte connecté pour l'adaptateur Supabase. Le local
 * ne sait pas toucher une ligne : il relit, modifie, réécrit.
 */
export function shelfIn<T extends { id: string }>(shelf: Shelf<T>) {
  return {
    list: (): T[] => shelf.load(),
    save(item: T): void {
      const rest = shelf.load().filter(s => s.id !== item.id);
      shelf.save([item, ...rest]);
    },
    remove(id: string): void {
      shelf.save(shelf.load().filter(s => s.id !== id));
    },
  };
}

/**
 * SANS COMPTE, RIEN N'EST HORS DU COMPTE : la bibliothèque de l'appareil est
 * toute la bibliothèque, et il n'y a nulle part où ranger ses documents.
 * L'historique, s'il y en a un, est celui de l'appareil (`null`).
 */
function localLibrary<T extends { id: string }>(
  shelf: Shelf<T>,
  history?: DocumentHistory<T>
): LibraryRepository<T> {
  const appareil = shelfIn(shelf);
  return {
    list: async () => appareil.list(),
    save: async item => {
      const previous = appareil.list().find(s => s.id === item.id);
      appareil.save(item);
      history?.saved(null, previous, item);
    },
    remove: async id => {
      const gone = appareil.list().find(s => s.id === id);
      appareil.remove(id);
      if (gone) history?.removed(null, [gone]);
    },
    outside: async () => [],
    adopt: async () => ({ adopted: 0, refused: [] }),
  };
}

/**
 * Le magasin versionné est synchrone ; le port ne l'est pas. L'adaptateur
 * local se contente donc d'envelopper — il ne gagne rien à l'être, mais le
 * port doit rester implémentable par un adaptateur distant, et c'est lui qui
 * commande.
 *
 * `schemaHistory` : les versions des schémas (ADR 0034), passées par
 * `index.ts` — ce module range les étagères, il n'importe pas ce qui les
 * suit.
 */
export function createLocalBackend(
  schemaHistory?: DocumentHistory<Tactic>
): Backend {
  return {
    notes: {
      load: async () => notesStore.load(),
      // Le local ne sait pas toucher une ligne : il relit, modifie, réécrit.
      // C'est le distant qui a besoin de mutations, et c'est lui qui commande
      // la forme du port.
      add: async note => {
        const { notes } = notesStore.load();
        notesStore.save({ notes: [note, ...notes] });
      },
      remove: async id => {
        const { notes } = notesStore.load();
        notesStore.save({ notes: notes.filter(n => n.id !== id) });
      },
      clear: async () => {
        notesStore.clear();
      },
      export: async () => notesStore.export(),
      // `versioned-store.import()` : le JSON passe par `validate` — le schéma
      // zod — avant d'être écrit. Un fichier d'une autre app, ou tronqué, est
      // refusé sans rien effacer.
      import: async json => notesStore.import(json),
    },
    schemas: localLibrary(schemaShelves.device, schemaHistory),
    seances: localLibrary(seanceShelves.device),
  };
}
