import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import {
  schemasSnapshotSchema,
  type Backend,
  type NotesSnapshot,
  type SchemasSnapshot,
} from './ports.ts';
import { notesStoreOptions } from './notes-file.ts';
import { migrateTactic } from '../features/board/model.ts';

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
  store: 'mister-uwh-tactic',
  ...notesStoreOptions,
});

/**
 * Les schémas tactiques, dans le même espace que les notes mais sous leur
 * propre clé : effacer les notes ne touche pas aux schémas, et inversement.
 */
export const schemasStore = createVersionedStore<SchemasSnapshot>({
  store: 'mister-uwh-tactic',
  key: 'schemas',
  version: 2,
  // v1 → v2 : chaque schéma gagne remplaçants et arbitre de bord, masqués.
  migrations: {
    1: data => {
      const snapshot = data as { schemas?: unknown[] };
      return Array.isArray(snapshot?.schemas)
        ? { ...snapshot, schemas: snapshot.schemas.map(migrateTactic) }
        : data;
    },
  },
  validate: data => schemasSnapshotSchema.parse(data),
  seed: () => ({ schemas: [] }),
});

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
    schemas: {
      list: async () => schemasStore.load().schemas,
      save: async tactic => {
        const { schemas } = schemasStore.load();
        const rest = schemas.filter(s => s.id !== tactic.id);
        schemasStore.save({ schemas: [tactic, ...rest] });
      },
      remove: async id => {
        const { schemas } = schemasStore.load();
        schemasStore.save({ schemas: schemas.filter(s => s.id !== id) });
      },
    },
  };
}
