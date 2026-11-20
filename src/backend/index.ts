import { createBackendSelector } from '@mister-guiiug/dev-pwa-config/backend';
import { createIdb } from '@mister-guiiug/dev-pwa-config/idb';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { createLocalBackend } from './local.ts';
import { createSupabaseNotes } from './supabase.ts';
import {
  compteSurAppareil,
  createSupabaseSchemas,
  forgetAccountSchemas,
  leaveAccountSchemas,
  parkAccountSchema,
  schemasHeldFor,
} from './supabase-schemas.ts';
import {
  createSupabaseSeances,
  forgetAccountSeances,
  leaveAccountSeances,
} from './supabase-seances.ts';
import { createQueuedNotes, type QueuedNotes } from './queued-notes.ts';
import { createCachedNotes, type CachedNotes } from './cached-notes.ts';
import type { Backend } from './ports.ts';
import type { Tactic } from '../features/board/model.ts';

const log = createLogger('backend');

/**
 * LA FILE D'ÉCRITURES HORS LIGNE, s'il y a un réseau à traverser.
 *
 * Elle n'existe qu'en mode distant : entre l'application et `localStorage`,
 * il n'y a pas de réseau à attendre. `null` en local, et l'écran d'accueil
 * n'affiche alors aucun indicateur — il n'a rien à dire.
 */
let file: QueuedNotes | null = null;

/**
 * LA COPIE DE LECTURE, même règle : il n'y a qu'en mode distant qu'une
 * lecture peut manquer de réseau. `null` en local — le magasin versionné EST
 * déjà la vérité, sur l'appareil.
 */
let lecture: CachedNotes | null = null;

/**
 * LE COMPTE DONT LA BIBLIOTHÈQUE DE SCHÉMAS EST OUVERTE SUR CET APPAREIL —
 * lu dans la session rangée au démarrage, puis à chaque entrée ou sortie de
 * compte. Il faut s'en souvenir : à `SIGNED_OUT`, Supabase a DÉJÀ effacé la
 * session, et plus rien ne nomme celui qui vient de partir. `null` en local.
 */
let compteOuvert: string | null = null;

/**
 * LE SÉLECTEUR DE BACKEND, DÉCLARÉ EN UNE FOIS.
 *
 * Trois règles, dans cet ordre : un choix explicite (`VITE_BACKEND`) gagne
 * toujours ; sinon la présence de toutes les variables requises décide ; sinon
 * on retombe sur le repli. Un choix explicite INCONNU est ignoré — mieux vaut
 * démarrer en local qu'échouer sur une faute de frappe dans un `.env`.
 *
 * **Le repli local n'est pas un détail.** Une app qui exige sa configuration
 * pour démarrer ne tourne ni hors ligne, ni en test, ni dans une CI sans
 * secrets, ni sur la page publique que quelqu'un ouvre sans compte.
 *
 * AJOUTER UN BACKEND DISTANT se fait ici, et seulement ici :
 *
 *     backends: {
 *       supabase: {
 *         requires: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
 *         create: (env, base) => ({ notes: createSupabaseNotes(env, base) }),
 *       },
 *     }
 *
 * `create` rend un objet PARTIEL : les ports non fournis restent ceux du repli.
 * C'est ce qui permet de migrer une app en production port par port, sans
 * attendre que tous les adaptateurs soient écrits.
 */
const selectBackend = createBackendSelector<Backend>({
  fallback: createLocalBackend,
  backends: {
    supabase: {
      // Les deux clés que le socle nomme lui-même (`SUPABASE_ENV_KEYS`).
      // Absente l'une des deux, ce backend n'est pas retenu et l'application
      // s'ouvre en local — sans erreur, et en le disant dans les réglages.
      requires: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
      // Un objet PARTIEL : tout ce qui n'est pas nommé ici reste servi par le
      // repli. C'est ce qui a permis de migrer cette application port par
      // port — les notes d'abord, les schémas ensuite.
      //
      // L'ADAPTATEUR EST ENVELOPPÉ, PAS MODIFIÉ — deux fois, et l'ordre compte.
      //
      //  - `createCachedNotes` au plus près du réseau : chaque lecture réussie
      //    est copiée dans IndexedDB, et resservie, datée, quand le réseau
      //    manque (ADR 0013). Les écritures qu'il voit passer sont celles que
      //    le serveur a ACCEPTÉES : ce sont elles qui retouchent la copie ;
      //  - `createQueuedNotes` par-dessus : la file du socle enfile les
      //    mutations et les rejoue au retour du réseau (ADR 0010), et pose ce
      //    qui attend encore sur ce que la lecture rend.
      //
      // L'adaptateur Supabase, lui, ignore les deux — il ne sait qu'écrire et
      // lire une ligne. La base IndexedDB porte le nom de l'application :
      // toutes les apps du parc partagent l'origine, donc l'espace de noms.
      //
      // LES SCHÉMAS ET LES SÉANCES N'ONT NI L'UNE NI L'AUTRE ENVELOPPE, et
      // c'est voulu : leur vérité reste le magasin local, que Supabase vient
      // seulement compléter d'un appareil à l'autre. Le magasin local est leur
      // copie, et ce qui reste à envoyer part à la lecture suivante
      // (`supabase-documents.ts`).
      create: () => {
        lecture = createCachedNotes(createSupabaseNotes(), {
          idb: createIdb('mister-uwh-tactic-lecture'),
        });
        file = createQueuedNotes(lecture.notes);
        void file.start();
        // Lu MAINTENANT, avant que le SDK ne soit chargé : un jeton révoqué,
        // découvert au démarrage, efface la session avant d'émettre.
        compteOuvert = compteSurAppareil();
        return {
          notes: file.notes,
          schemas: createSupabaseSchemas(),
          seances: createSupabaseSeances(),
        };
      },
    },
  },
  onFallback: ({ kind, missing, error }) => {
    log.warn('repli sur le backend local', { kind, missing, error });
  },
});

const selected = selectBackend(import.meta.env);

/** Le backend de l'application. */
export const backend = selected.backend;

/**
 * Où en est la migration : quels ports sont distants, lesquels sont restés
 * locaux. Une app à moitié migrée doit pouvoir le DIRE — c'est ce que l'écran
 * de réglages affiche, au lieu de laisser croire qu'un compte distant
 * fonctionne alors que tout est encore sur l'appareil.
 */
export const coverage = {
  kind: selected.kind,
  remote: selected.remote,
  local: selected.local,
};

/**
 * La file d'écritures du backend retenu, ou `null` quand il n'y a pas de
 * réseau à traverser. C'est ce que l'accueil observe pour dire « hors ligne »,
 * « N en attente » ou « refusée ».
 */
export const notesSync: QueuedNotes | null = file;

/**
 * La copie de lecture du backend retenu, ou `null` en local. L'accueil
 * l'observe pour dire « copie enregistrée il y a… » quand il en montre une.
 */
export const notesCache: CachedNotes | null = lecture;

/**
 * EFFACE LA COPIE DE LECTURE — appelé à la déconnexion (`SIGNED_OUT`) et à
 * l'effacement du compte. Sur un appareil partagé, le compte suivant ne doit
 * rien relire du précédent, même hors ligne. Sans backend distant, il n'y a
 * pas de copie : l'appel ne fait rien.
 *
 * LA FILE N'EST PAS VIDÉE ICI, et c'est délibéré : jeter des écritures en
 * attente sans prévenir est le défaut que l'audit du 05/11/2026 relève chez
 * deux applications. Les compter et le demander est une autre décision.
 */
export async function purgeReadCache(): Promise<void> {
  await lecture?.purge();
}

const suiveurs = new Set<() => void>();

/**
 * CE QUI DÉPEND DU COMPTE CONNECTÉ s'abonne ici : les bibliothèques de schémas
 * et de séances sont celles du compte, ou celles de l'appareil (ADR 0015,
 * 0018). Le backend est la couche que l'authentification et les écrans
 * connaissent tous deux — aucun des deux n'a à importer l'autre.
 */
export function onAccountChange(listener: () => void): () => void {
  suiveurs.add(listener);
  return () => suiveurs.delete(listener);
}

/**
 * CE QUE VOIT CE QUI ACCOMPAGNE À L'ÉCRAN UN COMPTE QUI S'EN VA — le
 * brouillon du tableau (ADR 0015, suivi du 20/11/2026).
 */
export interface AccountLeaving {
  owner: string;
  /**
   * Le compte vient d'être effacé : rien de lui ne doit rester sur
   * l'appareil, et `keep` ne range plus rien.
   */
  erased: boolean;
  /**
   * Ce que l'appareil tient pour ce compte : sa copie — dont ce que le
   * serveur a déjà —, puis la bibliothèque de l'appareil.
   */
  held: readonly Tactic[];
  /**
   * Range un schéma dans la copie de ce compte, comme une écriture en
   * attente : il partira à sa prochaine connexion, sur cet appareil.
   */
  keep(tactic: Tactic): void;
}

const departs = new Set<(leaving: AccountLeaving) => void>();

/**
 * S'ABONNER AU DÉPART D'UN COMPTE. Le rappel est appelé AVANT que la copie
 * du compte ne soit réduite à ce qui n'est pas parti : ce qu'il range avec
 * `keep` est une écriture en attente, que la réduction garde.
 *
 * C'est le point de rencontre du tableau et du backend : le tableau sait ce
 * que vaut son brouillon (`features/board/leaveDraft.ts`), le backend sait
 * qui part et où ranger. Le backend n'importe pas le tableau.
 */
export function onAccountLeave(
  listener: (leaving: AccountLeaving) => void
): () => void {
  departs.add(listener);
  return () => departs.delete(listener);
}

/** Les comptes effacés sur cet appareil, dont la sortie n'a pas encore eu lieu. */
const effaces = new Set<string>();

/**
 * L'EFFACEMENT D'UN COMPTE, CÔTÉ APPAREIL : ses copies de schémas et de
 * séances, et ce qu'elles avaient à envoyer. Les autres comptes de l'appareil
 * gardent les leurs. Sa sortie (`SIGNED_OUT`, qui suit) le saura effacé :
 * rien de lui n'y sera rangé de nouveau.
 */
export function forgetAccount(owner: string): void {
  forgetAccountSchemas(owner);
  forgetAccountSeances(owner);
  effaces.add(owner);
}

function quitter(owner: string): void {
  const erased = effaces.delete(owner);
  const leaving: AccountLeaving = {
    owner,
    erased,
    held: erased ? [] : schemasHeldFor(owner),
    keep: tactic => {
      if (!erased) parkAccountSchema(owner, tactic);
    },
  };
  for (const depart of departs) {
    try {
      depart(leaving);
    } catch (error) {
      // Un abonné qui lève n'empêche pas la copie du compte d'être réduite :
      // c'est elle que le compte suivant ne doit pas pouvoir lire.
      log.error('départ du compte : un abonné a échoué', { error });
    }
  }
  leaveAccountSchemas(owner);
  leaveAccountSeances(owner);
}

/**
 * Appelé par la session (`SIGNED_IN`, `SIGNED_OUT`). LE COMPTE QUI VIENT DE
 * PARTIR referme d'abord ses bibliothèques : ce qui l'accompagnait à l'écran
 * est rangé ou remis à neuf (`onAccountLeave`), puis sa copie de schémas et
 * de séances ne garde que ce qui n'est pas encore parti (ADR 0015,
 * `leaveAccount`). C'est aussi vrai quand un autre compte prend sa place sans
 * déconnexion visible. Puis chacun se relit.
 *
 * Le compte d'après se lit dans la session rangée — seulement en mode
 * distant : sans case nommée, la lecture prendrait la session `sb-*` d'une
 * autre application de la famille.
 */
export function accountChanged(): void {
  if (selected.kind === 'supabase') {
    const actuel = compteSurAppareil();
    if (compteOuvert && compteOuvert !== actuel) quitter(compteOuvert);
    compteOuvert = actuel;
  }
  for (const suiveur of suiveurs) suiveur();
}

export type { Backend, Note, NotesSnapshot } from './ports.ts';
export { supabase } from './supabase.ts';
