import { createStore } from '@mister-guiiug/dev-pwa-config/storage';
import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import {
  schemasSnapshotSchema,
  type Backend,
  type NotesSnapshot,
  type SchemasRepository,
  type SchemasSnapshot,
} from './ports.ts';
import { notesStoreOptions } from './notes-file.ts';
import { migrateTactic, type Tactic } from '../features/board/model.ts';

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
 * La forme d'une bibliothèque de schémas, quelle qu'en soit la case : version,
 * migrations, validation. Celle de l'appareil et celle de chaque compte la
 * partagent — un schéma se relit pareil où qu'il soit rangé.
 */
const schemasStoreOptions = {
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
};

/**
 * LES SCHÉMAS DE L'APPAREIL — ceux qu'on enregistre sans compte. Dans le même
 * espace que les notes mais sous leur propre clé : effacer les notes ne
 * touche pas aux schémas, et inversement.
 *
 * Avant l'ADR 0015 (suivi du 18/11/2026), c'était l'unique bibliothèque :
 * ceux d'un compte s'y mêlaient, et le compte suivant les voyait. Ils ont
 * désormais leur case (`accountSchemasStore`), et la première lecture d'un
 * compte vient y reprendre les siens (`supabase-schemas.ts`).
 */
export const schemasStore = createVersionedStore<SchemasSnapshot>({
  store: ESPACE,
  key: 'schemas',
  ...schemasStoreOptions,
});

/** La clé d'un compte : `schemas@` et son identifiant (un UUID). */
const CLE_COMPTE = /^schemas@([^.]+)$/;
const cleDuCompte = (owner: string) => `schemas@${owner}`;

type SchemasStore = typeof schemasStore;

const parCompte = new Map<string, SchemasStore>();

/**
 * LES SCHÉMAS D'UN COMPTE, SUR CET APPAREIL : sa copie hors ligne, et ce qui
 * attend d'être envoyé. Une case par compte, jamais lue sous un autre — le
 * compte suivant ne voit rien du précédent (ADR 0013), et le précédent,
 * revenu au bord du bassin sans réseau, retrouve sa bibliothèque.
 */
export function accountSchemasStore(owner: string): SchemasStore {
  let magasin = parCompte.get(owner);
  if (!magasin) {
    magasin = createVersionedStore<SchemasSnapshot>({
      store: ESPACE,
      key: cleDuCompte(owner),
      ...schemasStoreOptions,
    });
    parCompte.set(owner, magasin);
  }
  return magasin;
}

/**
 * NE GARDE DE LA COPIE D'UN COMPTE QUE CE QUE `garder` RETIENT — à sa
 * déconnexion, où `supabase-schemas.ts` sait ce que le serveur a déjà. Rien
 * de retenu, la clé disparaît, et `accountsWithSchemas()` ne le nomme plus.
 *
 * LES COPIES DE CÔTÉ RESTENT (`schemas@<compte>.backup-…`). Le magasin n'en
 * écrit que devant une donnée qu'il n'a pas su lire, ou avant une migration :
 * c'est son filet contre la perte, et ce qu'elles tiennent, cette version ne
 * le sait pas. Seul l'effacement du compte les emporte (`clear()`).
 */
export function keepAccountSchemas(
  owner: string,
  garder: (tactic: Tactic) => boolean
): void {
  const magasin = accountSchemasStore(owner);
  const { schemas } = magasin.load();
  const reste = schemas.filter(garder);
  if (reste.length === 0) magasin.store.remove(cleDuCompte(owner));
  else if (reste.length < schemas.length) magasin.save({ schemas: reste });
}

/** Les comptes qui ont une bibliothèque sur cet appareil. */
export function accountsWithSchemas(): string[] {
  return createStore(ESPACE)
    .keys()
    .map(cle => CLE_COMPTE.exec(cle)?.[1])
    .filter((owner): owner is string => owner !== undefined);
}

/**
 * Lire, enregistrer, retirer dans UNE bibliothèque : celle de l'appareil en
 * mode local, celle du compte connecté pour l'adaptateur Supabase. Le local
 * ne sait pas toucher une ligne : il relit, modifie, réécrit.
 */
export function schemasIn(store: SchemasStore) {
  return {
    list: (): Tactic[] => store.load().schemas,
    save(tactic: Tactic): void {
      const { schemas } = store.load();
      const rest = schemas.filter(s => s.id !== tactic.id);
      store.save({ schemas: [tactic, ...rest] });
    },
    remove(id: string): void {
      const { schemas } = store.load();
      store.save({ schemas: schemas.filter(s => s.id !== id) });
    },
  };
}

/**
 * SANS COMPTE, RIEN N'EST HORS DU COMPTE : la bibliothèque de l'appareil est
 * toute la bibliothèque, et il n'y a nulle part où ranger ses schémas.
 */
function localSchemas(): SchemasRepository {
  const appareil = schemasIn(schemasStore);
  return {
    list: async () => appareil.list(),
    save: async tactic => appareil.save(tactic),
    remove: async id => appareil.remove(id),
    outside: async () => [],
    adopt: async () => ({ adopted: 0, refused: [] }),
  };
}

/**
 * Le magasin versionné est synchrone ; le port ne l'est pas. L'adaptateur
 * local se contente donc d'envelopper — il ne gagne rien à l'être, mais le
 * port doit rester implémentable par un adaptateur distant, et c'est lui qui
 * commande.
 */
export function createLocalBackend(): Backend {
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
    schemas: localSchemas(),
  };
}
