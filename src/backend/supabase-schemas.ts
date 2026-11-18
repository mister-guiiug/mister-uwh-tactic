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
import { accountSchemasStore, schemasIn, schemasStore } from './local.ts';
import { supabase, type ErreurBase, type SupabaseLike } from './supabase.ts';
import type { AdoptResult, SchemasRepository } from './ports.ts';

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
export function compteSurAppareil(): string | null {
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

/** La bibliothèque où écrire : celle du compte, ou celle de l'appareil. */
const magasinDe = (compte: string | null) =>
  compte ? accountSchemasStore(compte) : schemasStore;

/**
 * Range des schémas dans une bibliothèque : par identifiant, le plus récent
 * gagne — la règle de la fusion, appliquée entre deux cases de l'appareil.
 */
function ranger(magasin: typeof schemasStore, arrivants: Tactic[]): void {
  const fusion = new Map(magasin.load().schemas.map(t => [t.id, t]));
  for (const t of arrivants) {
    const deja = fusion.get(t.id);
    if (!deja || instant(t.updatedAt) > instant(deja.updatedAt)) {
      fusion.set(t.id, t);
    }
  }
  magasin.save({ schemas: [...fusion.values()].sort(parRecence) });
}

/**
 * CE QUI EST DÉJÀ À CE COMPTE QUITTE LA BIBLIOTHÈQUE DE L'APPAREIL.
 *
 * Avant le cloisonnement, une seule bibliothèque tenait tout : ce qu'un
 * compte avait synchronisé s'y mêlait à ce qu'on avait écrit sans compte. La
 * lecture d'un compte vient donc y reprendre les siens — ceux que le serveur
 * range sous son nom (`connus`), ceux qu'il a écrits et qui attendent de
 * partir, ceux que sa case a déjà. Le même identifiant, c'est le même
 * schéma : le plus récent des deux reste. Le reste ne bouge pas, et ne
 * montera que sur un geste (« Ajouter à mon compte »).
 */
function rapatrier(compte: string, connus: ReadonlySet<string>): void {
  const appareil = schemasStore.load().schemas;
  if (appareil.length === 0) return;
  const enAttente = new Set(
    schemasSyncStore
      .load()
      .ops.filter(o => o.owner === compte)
      .map(o => o.id)
  );
  const mien = accountSchemasStore(compte);
  const dejaLa = new Set(mien.load().schemas.map(t => t.id));
  const siens = appareil.filter(
    t => connus.has(t.id) || enAttente.has(t.id) || dejaLa.has(t.id)
  );
  if (siens.length === 0) return;
  ranger(mien, siens);
  const partis = new Set(siens.map(t => t.id));
  schemasStore.save({ schemas: appareil.filter(t => !partis.has(t.id)) });
}

/**
 * OUBLIE LA BIBLIOTHÈQUE D'UN COMPTE SUR CET APPAREIL, et ce qu'il avait à
 * envoyer — à l'effacement du compte. Les autres comptes gardent les leurs :
 * leurs écritures en attente n'ont rien à voir avec celui qui part.
 */
export function forgetAccountSchemas(owner: string): void {
  accountSchemasStore(owner).clear();
  const { ops } = schemasSyncStore.load();
  const reste = ops.filter(o => o.owner !== owner);
  if (reste.length !== ops.length) schemasSyncStore.save({ ops: reste });
}

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

  /**
   * Envoie ce qui vient d'être écrit ICI ; ne lève que sur un refus de la
   * base. Le compte est celui de l'écriture, lu une fois : une session qui
   * change pendant la requête n'envoie pas sous un autre nom.
   */
  async function apresEcriture(
    compte: string | null,
    op: Omit<Operation, 'owner'>,
    tactic?: Tactic
  ) {
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
   * UNE REQUÊTE PAR SCHÉMA : une ligne refusée n'emporte pas les autres. La
   * première coupure arrête tout — le reste attend la prochaine lecture. Rend
   * les refus : la lecture les journalise, « Ajouter à mon compte » les dit.
   */
  async function rattraper(
    restants: { op: Operation; tactic?: Tactic }[]
  ): Promise<{ op: Operation; message: string }[]> {
    const refus: { op: Operation; message: string }[] = [];
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
      // Un refus ne réussit pas mieux la deuxième fois : il n'attend pas.
      oublier(op);
      refus.push({ op, message: verdict.message });
    }
    return refus;
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
      // SANS COMPTE, LA BIBLIOTHÈQUE DE L'APPAREIL — et rien d'un compte :
      // celui qui vient de se déconnecter n'y a rien laissé.
      if (!compte) return schemasIn(schemasStore).list();

      const mien = accountSchemasStore(compte);
      // Ce que ce compte a écrit sous son nom le rejoint, même hors ligne.
      rapatrier(compte, new Set());
      if (!isOnline()) return mien.load().schemas;

      const distant = await lireDistant();
      if (!distant) return mien.load().schemas;

      // Ce que le serveur range sous ce compte est à lui : la copie qu'en
      // gardait l'appareil vient rejoindre sa case.
      rapatrier(
        compte,
        new Set([...distant.lues.map(t => t.id), ...distant.illisibles])
      );

      // Relu APRÈS la réponse : un schéma enregistré pendant la requête doit
      // compter dans la fusion, et rien n'attend entre cette lecture et
      // l'écriture de la fusion.
      const ici = mien.load().schemas;
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
      mien.save({ schemas });

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

      const restants: { op: Operation; tactic?: Tactic }[] = [
        ...[...retraits]
          .filter(id => surServeur.has(id) || distant.illisibles.has(id))
          .map(id => ({ op: { owner: compte, id, kind: 'remove' as const } })),
        ...envois.map(tactic => ({
          op: { owner: compte, id: tactic.id, kind: 'save' as const },
          tactic,
        })),
      ];
      // La lecture n'a personne à qui dire un refus : elle le journalise.
      for (const { op, message } of await rattraper(restants)) {
        log.error('rattrapage refusé par la base', {
          id: op.id,
          kind: op.kind,
          message,
        });
      }

      return schemas;
    },

    async save(tactic) {
      const compte = owner();
      schemasIn(magasinDe(compte)).save(tactic);
      await apresEcriture(compte, { id: tactic.id, kind: 'save' }, tactic);
    },

    async remove(id) {
      const compte = owner();
      schemasIn(magasinDe(compte)).remove(id);
      await apresEcriture(compte, { id, kind: 'remove' });
    },

    async outside() {
      const compte = owner();
      if (!compte) return [];
      const siens = new Set(
        accountSchemasStore(compte)
          .load()
          .schemas.map(t => t.id)
      );
      return schemasStore.load().schemas.filter(t => !siens.has(t.id));
    },

    /**
     * « AJOUTER À MON COMPTE » : le geste que la connexion ne fait pas seule.
     * Un schéma écrit sans compte peut être à quelqu'un d'autre — un appareil
     * de club, un enfant qui a joué avec le tableau. Celui qui les range dans
     * son compte les a vus, et l'a voulu.
     *
     * Rangés D'ABORD dans la case du compte, notés à envoyer, puis envoyés :
     * hors ligne, ils partiront à la lecture suivante. Ce que la base refuse
     * (un identifiant déjà pris par un autre compte, un plafond) RETOURNE
     * sur l'appareil — il n'est pas au compte, il ne doit pas y paraître.
     */
    async adopt(ids): Promise<AdoptResult> {
      const compte = owner();
      const voulus = new Set(ids);
      const appareil = schemasStore.load().schemas;
      const choisis = appareil.filter(t => voulus.has(t.id));
      if (!compte || choisis.length === 0) return { adopted: 0, refused: [] };

      const mien = accountSchemasStore(compte);
      const avant = new Map(mien.load().schemas.map(t => [t.id, t]));
      ranger(mien, choisis);
      schemasStore.save({ schemas: appareil.filter(t => !voulus.has(t.id)) });

      const aEnvoyer = choisis
        .filter(t => synchronisable(t.id))
        .map(tactic => ({
          op: { owner: compte, id: tactic.id, kind: 'save' as const },
          tactic,
        }));
      for (const { op } of aEnvoyer) noter(op);
      if (!isOnline() || aEnvoyer.length === 0) {
        return { adopted: choisis.length, refused: [] };
      }

      const refus = await rattraper(aEnvoyer);
      if (refus.length > 0) {
        const rendus = new Set(refus.map(r => r.op.id));
        mien.save({
          schemas: mien.load().schemas.flatMap(t => {
            if (!rendus.has(t.id)) return [t];
            const ancien = avant.get(t.id);
            return ancien ? [ancien] : [];
          }),
        });
        ranger(
          schemasStore,
          choisis.filter(t => rendus.has(t.id))
        );
        for (const { op, message } of refus) {
          log.error('ajout au compte refusé par la base', {
            id: op.id,
            message,
          });
        }
      }
      return {
        adopted: choisis.length - refus.length,
        refused: refus.map(({ op, message }) => ({ id: op.id, message })),
      };
    },
  };
}
