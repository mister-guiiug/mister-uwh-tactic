import { z } from 'zod';
import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import { classifyBackendError } from '@mister-guiiug/dev-pwa-config/backend';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
import { isUuid } from '@mister-guiiug/dev-pwa-config/id';
import {
  navigateurHorsLigne,
  storedSupabaseSession,
} from '@mister-guiiug/dev-pwa-config/auth/stored-session';
import {
  migrateTactic,
  tacticSchema,
  TACTIC_VERSION,
  type Tactic,
} from '../features/board/model.ts';
import { createLocalBackend, schemasStore } from './local.ts';
import { supabase, type ErreurBase, type SupabaseLike } from './supabase.ts';
import type { SchemasRepository } from './ports.ts';

const log = createLogger('schemas');

/** Ce que l'adaptateur demande au client — de quoi en écrire un faux sans le SDK. */
export type SchemasClient = Pick<SupabaseLike, 'from'>;

/**
 * CE QUE LE SERVEUR N'A PAS ENCORE REÇU, et le compte à qui c'est.
 *
 * Une opération par schéma et par compte — la dernière gagne, comme la file
 * des notes (ADR 0010) : enregistré puis supprimé hors ligne, seule la
 * suppression part. Le schéma lui-même n'est pas recopié ici : sa dernière
 * version est dans `schemasStore`, et c'est elle qui partira.
 *
 * LE COMPTE EST NOTÉ AVEC L'OPÉRATION. La file des notes ne le fait pas, et
 * l'ADR 0013 l'écrit comme une dette : rejouée après qu'un autre compte s'est
 * connecté sur l'appareil, une écriture partirait chez lui. Ici, une
 * opération ne part que sous le compte qui l'a faite — les autres attendent
 * qu'il revienne.
 */
const attenteSchema = z.object({
  ops: z.array(
    z.object({
      owner: z.string().min(1),
      id: z.string().min(1),
      kind: z.enum(['save', 'remove']),
    })
  ),
});

type Attente = z.infer<typeof attenteSchema>;
type Operation = Attente['ops'][number];

export const schemasSyncStore = createVersionedStore<Attente>({
  store: 'mister-uwh-tactic',
  key: 'schemas-sync',
  version: 1,
  validate: data => attenteSchema.parse(data),
  seed: () => ({ ops: [] }),
});

function noter(op: Operation): void {
  const { ops } = schemasSyncStore.load();
  schemasSyncStore.save({
    ops: [...ops.filter(o => !(o.owner === op.owner && o.id === op.id)), op],
  });
}

/**
 * Retire une opération tenue — SI ELLE EST TOUJOURS LA MÊME. Un schéma
 * supprimé pendant que son enregistrement était en route porte désormais une
 * suppression : la réponse de l'enregistrement ne doit pas l'effacer.
 */
function oublier(op: Operation): void {
  const { ops } = schemasSyncStore.load();
  const reste = ops.filter(
    o => !(o.owner === op.owner && o.id === op.id && o.kind === op.kind)
  );
  if (reste.length !== ops.length) schemasSyncStore.save({ ops: reste });
}

/**
 * LE COMPTE CONNECTÉ SUR CET APPAREIL, LU SANS RÉSEAU NI SDK.
 *
 * `auth.getUser()` interroge le serveur, et `auth.getSession()` renouvelle un
 * jeton périmé contre lui : hors ligne, le premier rend « personne » et le
 * second attend une demi-minute (mesuré sur mister-doc, cf. le socle). Un
 * coach au bord du bassin depuis plus d'une heure passerait alors pour
 * déconnecté, et ses schémas ne partiraient jamais. `storedSupabaseSession`
 * lit la session telle qu'elle est rangée, même périmée — sous la case de CE
 * projet : toute la famille partage l'origine, donc le `localStorage`.
 */
function compteSurAppareil(): string | null {
  const session = storedSupabaseSession({
    auth: { storageKey: supabase.storageKey() },
  }) as { user?: { id?: unknown } } | null;
  const id = session?.user?.id;
  return typeof id === 'string' && id !== '' ? id : null;
}

/**
 * La colonne `id` est un `uuid` (0006_schemas.sql), et `createUuid()` en
 * produit un pour chaque schéma. Un fichier importé, retouché à la main, peut
 * porter autre chose : la base le refuserait, et ce refus n'aurait rien à dire
 * à l'utilisateur. Un tel schéma reste sur l'appareil. En minuscules, comme
 * Postgres le rend — sinon la fusion le verrait deux fois.
 */
const synchronisable = (id: string) => isUuid(id) && id === id.toLowerCase();

/** Les dates d'un schéma sont des ISO 8601, avec ou sans millisecondes. */
function instant(date: string): number {
  const t = Date.parse(date);
  return Number.isNaN(t) ? 0 : t;
}

const parRecence = (a: Tactic, b: Tactic) =>
  instant(b.updatedAt) - instant(a.updatedAt);

/**
 * LA LIGNE, et la version du modèle qui l'a écrite. `owner` n'y est pas : la
 * base le pose (`default auth.uid()`) et la RLS le vérifie — le client n'a pas
 * à prétendre qui il est.
 */
const ligne = (tactic: Tactic) => ({
  id: tactic.id,
  name: tactic.name,
  version: TACTIC_VERSION,
  data: tactic,
});

/** Un envoi abouti, ou pourquoi il ne l'est pas. */
type Verdict = { ok: true } | { ok: false; refus: boolean; message: string };

export interface SupabaseSchemasOptions {
  /** Défaut : le client de la fabrique, chargé au premier envoi. */
  client?: () => Promise<SchemasClient>;
  /** Défaut : le compte de la session rangée sur l'appareil. */
  owner?: () => string | null;
  /** Défaut : `navigator.onLine !== false`. */
  isOnline?: () => boolean;
}

/**
 * LES SCHÉMAS D'UN COMPTE, RETROUVÉS SUR CHAQUE APPAREIL.
 *
 * L'APPAREIL RESTE LA VÉRITÉ. À l'inverse des notes, dont la lecture vient du
 * serveur et la copie d'IndexedDB (ADR 0013), les schémas vivent d'abord dans
 * le magasin local — celui du mode local, inchangé. Supabase n'est qu'un
 * second endroit où les ranger, que chaque appareil vient fusionner. Un
 * entraîneur prépare ses schémas au bord du bassin, où le réseau manque : le
 * tableau ne doit jamais attendre le serveur pour enregistrer ni pour relire.
 *
 * C'EST POURQUOI CE PORT N'A NI FILE NI COPIE DE LECTURE. Le magasin local
 * est déjà la copie ; `schemasSyncStore` tient ce qui reste à envoyer, et la
 * prochaine lecture en ligne l'envoie. Une seconde file aurait demandé un
 * second indicateur et une seconde lettre morte à l'écran, pour des gestes
 * qui ne se perdent pas : le schéma est sur l'appareil, quoi qu'il arrive.
 *
 * TROIS ISSUES À UN ENVOI, ET UNE SEULE LÈVE.
 *
 *  - il passe : l'opération est oubliée ;
 *  - le réseau manque : elle est GARDÉE, journalisée, et la promesse se tient
 *    — l'écriture locale a eu lieu, l'écran n'a rien à annuler ;
 *  - la base REFUSE (RLS, contrainte) : on lève, pour que l'écran le dise.
 *    La copie locale reste — c'est le travail de l'utilisateur —, mais un
 *    refus ne réussit pas mieux la deuxième fois : il n'est pas rejoué.
 *
 * SANS SESSION, C'EST LE LOCAL, À L'OCTET PRÈS : aucune requête, et le SDK
 * n'est même pas chargé pour un visiteur sans compte.
 *
 * LA FUSION est celle d'un compte personnel, sans concurrence réelle : par
 * identifiant, le plus récent (`updatedAt`) gagne. Ce que le serveur a et pas
 * l'appareil s'ajoute ; ce que l'appareil a et pas le serveur reste — un
 * schéma d'avant le compte, ou écrit hors ligne, ne se perd jamais sur une
 * déduction. Une suppression faite ailleurs ne revient donc pas effacer un
 * appareil qui l'ignore : c'est le prix, et il est payé du côté qui ne perd
 * rien.
 *
 * LA RLS FAIT LE FILTRAGE, comme pour les notes : aucune requête ne porte de
 * `where owner = …`.
 */
export function createSupabaseSchemas(
  options: SupabaseSchemasOptions = {}
): SchemasRepository {
  const local = createLocalBackend().schemas;
  const client = options.client ?? (() => supabase.getClient());
  const owner = options.owner ?? compteSurAppareil;
  const isOnline = options.isOnline ?? (() => !navigateurHorsLigne());

  /**
   * UN REFUS OU UNE COUPURE ? `classifyBackendError` du socle reconnaît
   * « Failed to fetch » (Chromium) et « NetworkError » (Firefox), pas le
   * « Load failed » de Safari — celui d'un iPad au bord du bassin. On tranche
   * donc d'abord sur le code : la base formule les siens, une requête qui ne
   * l'a pas atteinte revient sans (`ErreurBase`). Une réponse de passerelle
   * illisible (502 en HTML) n'en a pas non plus : elle attendra, comme une
   * coupure, plutôt que de passer pour un refus.
   */
  function estUnRefus(error: unknown): boolean {
    if (!isOnline()) return false;
    const { message = '', code = '' } = (error ?? {}) as Partial<ErreurBase>;
    const genre = classifyBackendError(String(message));
    if (genre === 'permission') return true;
    if (genre === 'network') return false;
    return typeof code === 'string' && code !== '';
  }

  async function envoyer(
    geste: (db: SchemasClient) => Promise<{ error: ErreurBase | null }>
  ): Promise<Verdict> {
    try {
      const { error } = await geste(await client());
      if (!error) return { ok: true };
      return { ok: false, refus: estUnRefus(error), message: error.message };
    } catch (error) {
      // Le SDK qui ne se charge pas (son morceau, hors ligne) LÈVE au lieu de
      // rendre une erreur : même verdict, même règle.
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, refus: estUnRefus(error), message };
    }
  }

  const transmettre = (op: Operation, tactic?: Tactic) =>
    envoyer(db =>
      op.kind === 'save' && tactic
        ? db.from('schemas').upsert([ligne(tactic)], { onConflict: 'id' })
        : // Pas de `owner` ici non plus : `schemas_delete_own` ne laisse
          // passer que les lignes du compte, et une autre ligne portant cet
          // identifiant ne serait simplement pas touchée.
          db.from('schemas').delete().eq('id', op.id)
    );

  /** Écrit d'abord ICI, puis envoie ; ne lève que sur un refus de la base. */
  async function apresEcriture(op: Omit<Operation, 'owner'>, tactic?: Tactic) {
    const compte = owner();
    if (!compte || !synchronisable(op.id)) return;
    const tenue: Operation = { ...op, owner: compte };
    // NOTÉE AVANT D'ENVOYER : un onglet fermé pendant la requête laisse une
    // opération à reprendre, pas un schéma que le serveur n'aura jamais.
    noter(tenue);
    // Hors ligne déclaré, aucune requête : le SDK la ferait attendre une
    // demi-minute avant d'échouer.
    if (!isOnline()) return;
    const verdict = await transmettre(tenue, tactic);
    if (verdict.ok) {
      oublier(tenue);
    } else if (!verdict.refus) {
      log.warn('envoi reporté, le réseau manque', {
        id: op.id,
        kind: op.kind,
        message: verdict.message,
      });
    } else {
      oublier(tenue);
      log.error('envoi refusé par la base', {
        id: op.id,
        kind: op.kind,
        message: verdict.message,
      });
      throw new Error(verdict.message);
    }
  }

  /**
   * Les lignes du serveur, validées une à une : une ligne illisible — écrite
   * par une version future, ou abîmée — est ÉCARTÉE et journalisée, jamais
   * une raison de perdre toute la liste. Son identifiant est gardé : rien ne
   * doit l'écraser tant qu'on ne sait pas la lire. `null` quand le serveur ne
   * répond pas.
   */
  async function lireDistant(): Promise<{
    lues: Tactic[];
    illisibles: Set<string>;
  } | null> {
    let reponse: { data: unknown[] | null; error: ErreurBase | null };
    try {
      const db = await client();
      reponse = await db
        .from('schemas')
        .select('id, version, data')
        .order('updated_at', { ascending: false });
    } catch (error) {
      log.warn('lecture des schémas impossible', { error });
      return null;
    }
    if (reponse.error) {
      // Ni la coupure ni le refus ne doivent vider l'écran : l'appareil a ses
      // schémas, il les montre. Le refus, lui, est un défaut à voir.
      const niveau = estUnRefus(reponse.error) ? 'error' : 'warn';
      log[niveau]('lecture des schémas', { message: reponse.error.message });
      return null;
    }

    const lues: Tactic[] = [];
    const illisibles = new Set<string>();
    for (const brute of reponse.data ?? []) {
      const row = brute as { id?: unknown; version?: unknown; data?: unknown };
      // Toujours monté avant d'être validé : `migrateTactic` amène une ligne
      // de N'IMPORTE QUELLE version antérieure jusqu'au modèle courant.
      const lu = tacticSchema.safeParse(migrateTactic(row.data));
      if (lu.success && lu.data.id === row.id) {
        lues.push(lu.data);
        continue;
      }
      if (typeof row.id === 'string') illisibles.add(row.id);
      log.warn('schéma distant écarté', {
        id: row.id,
        version: row.version,
        modele: TACTIC_VERSION,
      });
    }
    return { lues, illisibles };
  }

  return {
    async list() {
      const compte = owner();
      if (!compte || !isOnline()) return local.list();

      const distant = await lireDistant();
      if (!distant) return local.list();

      // Relu APRÈS la réponse : un schéma enregistré pendant la requête doit
      // compter dans la fusion, et rien n'attend entre cette lecture et
      // l'écriture de la fusion.
      const ici = schemasStore.load().schemas;
      const attente = schemasSyncStore
        .load()
        .ops.filter(o => o.owner === compte);
      const retraits = new Set(
        attente.filter(o => o.kind === 'remove').map(o => o.id)
      );
      const enregistrements = new Set(
        attente.filter(o => o.kind === 'save').map(o => o.id)
      );

      const fusion = new Map(ici.map(t => [t.id, t]));
      const surServeur = new Set(distant.lues.map(t => t.id));
      const envois: Tactic[] = [];

      for (const lu of distant.lues) {
        // Supprimé ici hors ligne : il ne revient pas parce que le serveur
        // l'a encore. C'est la suppression qui va partir.
        if (retraits.has(lu.id)) continue;
        const mien = fusion.get(lu.id);
        if (!mien || instant(lu.updatedAt) > instant(mien.updatedAt)) {
          fusion.set(lu.id, lu);
        } else if (instant(mien.updatedAt) > instant(lu.updatedAt)) {
          // Le serveur est en retard sur l'appareil : modifié hors ligne, ou
          // un envoi perdu. La ligne est à ce compte — la RLS ne lui montre
          // que les siennes —, elle peut repartir.
          envois.push(mien);
        }
      }
      for (const mien of ici) {
        if (
          enregistrements.has(mien.id) &&
          !surServeur.has(mien.id) &&
          !distant.illisibles.has(mien.id)
        ) {
          envois.push(mien);
        }
      }

      const schemas = [...fusion.values()].sort(parRecence);
      schemasStore.save({ schemas });

      // CE QUE LA FUSION A RÉSOLU N'ATTEND PLUS : un enregistrement dépassé
      // par une version plus récente venue du serveur, ou déjà à jour.
      const aEnvoyer = new Set(envois.map(t => t.id));
      for (const op of attente) {
        const resolue =
          op.kind === 'save'
            ? !aEnvoyer.has(op.id) && !distant.illisibles.has(op.id)
            : !surServeur.has(op.id) && !distant.illisibles.has(op.id);
        if (resolue) oublier(op);
      }

      // UNE REQUÊTE PAR SCHÉMA : une ligne refusée n'emporte pas les autres.
      // La première coupure arrête tout — le reste attend la prochaine fois.
      const restants: { op: Operation; tactic?: Tactic }[] = [
        ...[...retraits]
          .filter(id => surServeur.has(id) || distant.illisibles.has(id))
          .map(id => ({ op: { owner: compte, id, kind: 'remove' as const } })),
        ...envois.map(tactic => ({
          op: { owner: compte, id: tactic.id, kind: 'save' as const },
          tactic,
        })),
      ];
      for (const { op, tactic } of restants) {
        const verdict = await transmettre(op, tactic);
        if (verdict.ok) {
          oublier(op);
          continue;
        }
        if (!verdict.refus) {
          log.warn('rattrapage reporté, le réseau manque', {
            id: op.id,
            kind: op.kind,
            message: verdict.message,
          });
          break;
        }
        // La lecture n'a personne à qui dire un refus : elle le journalise,
        // et ne le rejoue pas.
        oublier(op);
        log.error('rattrapage refusé par la base', {
          id: op.id,
          kind: op.kind,
          message: verdict.message,
        });
      }

      return schemas;
    },

    async save(tactic) {
      await local.save(tactic);
      await apresEcriture({ id: tactic.id, kind: 'save' }, tactic);
    },

    async remove(id) {
      await local.remove(id);
      await apresEcriture({ id, kind: 'remove' });
    },
  };
}
