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
  shelfIn,
  type DocumentHistory,
  type Shelf,
  type Shelves,
} from './local.ts';
import { supabase, type ErreurBase, type SupabaseLike } from './supabase.ts';
import type { AdoptResult, LibraryRepository } from './ports.ts';

/**
 * UN DOCUMENT QU'ON REMPLACE EN ENTIER : un schéma (ADR 0015), une séance
 * (ADR 0018). Un identifiant choisi par le client, un nom que la ligne
 * recopie, et une date qui départage deux versions.
 */
export interface Document {
  id: string;
  name: string;
  /** ISO 8601. */
  updatedAt: string;
}

/** Ce que l'adaptateur demande au client — de quoi en écrire un faux sans le SDK. */
export type DocumentsClient = Pick<SupabaseLike, 'from'>;

/**
 * UNE SORTE DE DOCUMENT : sa table, ses étagères sur l'appareil, et comment
 * relire une ligne. La table a la forme de `0006_schemas.sql` — `id`,
 * `owner` posé par la base, `name`, `version`, `data`, `updated_at` — et la
 * pierre tombale de `0008_pierres_tombales.sql`, `deleted_at`.
 */
export interface DocumentKind<T extends Document> {
  /** Le nom de la table, du journal, et des deux magasins de suivi. */
  table: string;
  shelves: Shelves<T>;
  /** La version du modèle qui écrit `data`. */
  version: number;
  /**
   * Une ligne lue → le document, monté jusqu'au modèle courant et validé ;
   * `null` s'il est illisible.
   */
  read(data: unknown): T | null;
  /**
   * Ce qui suit un document sur l'appareil sans partir avec lui : les
   * versions d'un schéma (ADR 0034). Prévenu de chaque geste fait ici, d'une
   * suppression venue d'ailleurs, d'un passage d'une case à l'autre, de
   * l'effacement d'un compte. Facultatif : les séances n'en ont pas.
   */
  history?: DocumentHistory<T>;
}

export interface SupabaseDocumentsOptions {
  /** Défaut : le client de la fabrique, chargé au premier envoi. */
  client?: () => Promise<DocumentsClient>;
  /** Défaut : le compte de la session rangée sur l'appareil. */
  owner?: () => string | null;
  /** Défaut : `navigator.onLine !== false`. */
  isOnline?: () => boolean;
  /** L'horloge de l'appareil, en ISO 8601 ; défaut : `new Date()`. */
  now?: () => string;
}

const maintenant = () => new Date().toISOString();

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
 * La colonne `id` est un `uuid` (0006, 0007), et `createUuid()` en produit un
 * pour chaque document. Un fichier importé, retouché à la main, peut porter
 * autre chose : la base le refuserait, et ce refus n'aurait rien à dire à
 * l'utilisateur. Un tel document reste sur l'appareil. En minuscules, comme
 * Postgres le rend — sinon la fusion le verrait deux fois.
 */
const synchronisable = (id: string) => isUuid(id) && id === id.toLowerCase();

/** Les dates d'un document sont des ISO 8601, avec ou sans millisecondes. */
function instant(date: string): number {
  const t = Date.parse(date);
  return Number.isNaN(t) ? 0 : t;
}

const parRecence = (a: Document, b: Document) =>
  instant(b.updatedAt) - instant(a.updatedAt);

/** `a` est strictement plus récent que `b` ; à égalité, non. */
const plusRecent = (a: string, b: string) => instant(a) > instant(b);

/**
 * L'INSTANT D'UN GESTE, JAMAIS AVANT LA VERSION QU'IL TOUCHE.
 *
 * Les dates comparées viennent d'appareils différents. Une horloge en retard
 * sur celle qui a écrit un document daterait sinon sa suppression d'AVANT
 * lui : la fusion la croirait dépassée, et le document reviendrait sous les
 * yeux de qui vient de le jeter. Une suppression passe donc toujours, d'une
 * milliseconde au moins, la version qu'elle efface ; un enregistrement n'est
 * jamais plus vieux que la version qu'il écrit.
 */
function apres(horloge: string, version: Document | undefined, ecart: number) {
  const plancher = version ? instant(version.updatedAt) + ecart : 0;
  return instant(horloge) >= plancher
    ? horloge
    : new Date(plancher).toISOString();
}

/**
 * CE QUE LE SERVEUR N'A PAS ENCORE REÇU, et le compte à qui c'est.
 *
 * Une opération par document et par compte — la dernière gagne, comme la
 * file des notes (ADR 0010) : enregistré puis supprimé hors ligne, seule la
 * suppression part. Le document lui-même n'est pas recopié ici : sa dernière
 * version est sur l'étagère du compte, et c'est elle qui partira.
 *
 * LE COMPTE EST NOTÉ AVEC L'OPÉRATION. La file des notes ne le fait pas, et
 * l'ADR 0013 l'écrit comme une dette : rejouée après qu'un autre compte s'est
 * connecté sur l'appareil, une écriture partirait chez lui. Ici, une
 * opération ne part que sous le compte qui l'a faite — les autres attendent
 * qu'il revienne.
 *
 * L'INSTANT DU GESTE AUSSI (`at`, version 2 — suivi du 20/11/2026). Une
 * suppression faite ailleurs laisse une pierre tombale datée ; une écriture
 * en attente la défait si elle est plus récente. La date du document ne
 * suffit pas à le dire : « Annuler » une suppression remet le document tel
 * qu'il était, avec sa date d'avant — c'est pourtant le dernier geste.
 */
const operationSchema = z.object({
  owner: z.string().min(1),
  id: z.string().min(1),
  kind: z.enum(['save', 'remove']),
  /** ISO 8601 : quand le geste a eu lieu, à l'horloge de cet appareil. */
  at: z.string().min(1),
});

const attenteSchema = z.object({ ops: z.array(operationSchema) });

type Attente = z.infer<typeof attenteSchema>;
type Operation = Attente['ops'][number];

/**
 * v1 → v2 : une opération d'avant la pierre tombale n'a pas de date. Elle
 * prend celle de la mise à jour — postérieure au geste, donc : elle garde
 * l'avantage qu'elle avait. Une suppression en attente l'emportait sur le
 * serveur, une écriture en attente aussi (rien ne la défaisait) ; elles
 * l'emportent encore sur tout ce qui s'est fait avant la mise à jour.
 */
function dater(data: unknown): unknown {
  const v1 = data as { ops?: unknown };
  if (!Array.isArray(v1?.ops)) return data;
  const at = maintenant();
  return {
    ...v1,
    ops: v1.ops.map((op: unknown) =>
      op && typeof op === 'object' ? { at, ...op } : op
    ),
  };
}

/**
 * CE QUE LE SERVEUR A DÉJÀ, compte par compte et document par document : la
 * date (`updatedAt`) de la version qu'il a rendue à la dernière lecture, ou
 * acceptée depuis.
 *
 * C'EST LA SEULE PREUVE QUE LA DÉCONNEXION ACCEPTE pour retirer un document
 * de l'appareil (`leaveAccount`). La file ne suffit pas : elle dit ce qui
 * attend, pas tout ce qui manque au serveur. Un enregistrement refusé quitte
 * la file mais reste dans la copie — c'est le travail de l'utilisateur ; un
 * identifiant qui n'est pas un UUID n'y entre jamais ; une version plus
 * récente que celle du serveur, revenue de la bibliothèque de l'appareil,
 * n'y est pas notée. Purger sur la file seule les perdrait. Ce qui n'est pas
 * prouvé reste.
 */
const recusSchema = z.object({
  recus: z.array(
    z.object({
      owner: z.string().min(1),
      id: z.string().min(1),
      updatedAt: z.string(),
    })
  ),
});

type Recus = z.infer<typeof recusSchema>;

/** Un envoi abouti, ou pourquoi il ne l'est pas. */
type Verdict = { ok: true } | { ok: false; refus: boolean; message: string };

/**
 * LA SYNCHRONISATION PAR COMPTE D'UNE SORTE DE DOCUMENT.
 *
 * Écrite pour les schémas (ADR 0015) et rendue générique quand les séances
 * ont dû suivre le compte à leur tour (ADR 0018, suivi du 20/11/2026) : la
 * même règle — l'appareil d'abord, une file d'envois marqués du compte, un
 * relevé de ce que le serveur a, une copie par compte purgée à la
 * déconnexion de ce qui est parti — et les mêmes pièges déjà payés (le
 * « Load failed » de Safari, la session qui s'en va pendant une requête, la
 * ligne illisible venue d'une version future). Les recopier aurait fait deux
 * endroits où corriger le prochain.
 *
 * Les deux magasins de suivi portent le nom de la table : `schemas-sync` et
 * `schemas-recus` sont ceux d'avant la généralisation, inchangés — la file
 * a seulement gagné, en version 2, l'instant de chaque geste.
 */
export function createDocumentSync<T extends Document>(kind: DocumentKind<T>) {
  const { table, shelves, history } = kind;
  const log = createLogger(table);

  const syncStore = createVersionedStore<Attente>({
    store: 'mister-uwh-tactic',
    key: `${table}-sync`,
    version: 2,
    migrations: { 1: dater },
    validate: data => attenteSchema.parse(data),
    seed: () => ({ ops: [] }),
  });

  const recusStore = createVersionedStore<Recus>({
    store: 'mister-uwh-tactic',
    key: `${table}-recus`,
    version: 1,
    validate: data => recusSchema.parse(data),
    seed: () => ({ recus: [] }),
  });

  function noter(op: Operation): void {
    const { ops } = syncStore.load();
    syncStore.save({
      ops: [...ops.filter(o => !(o.owner === op.owner && o.id === op.id)), op],
    });
  }

  /**
   * Retire une opération tenue — SI ELLE EST TOUJOURS LA MÊME. Un document
   * supprimé pendant que son enregistrement était en route porte désormais
   * une suppression : la réponse de l'enregistrement ne doit pas l'effacer.
   * Ni un document enregistré DE NOUVEAU pendant ce temps : sa nouvelle
   * version attend encore.
   */
  function oublier(op: Operation): void {
    const { ops } = syncStore.load();
    const reste = ops.filter(
      o =>
        !(
          o.owner === op.owner &&
          o.id === op.id &&
          o.kind === op.kind &&
          o.at === op.at
        )
    );
    if (reste.length !== ops.length) syncStore.save({ ops: reste });
  }

  /** Une lecture a abouti : ce compte a, sur le serveur, exactement `lues`. */
  function recevoir(owner: string, lues: T[]): void {
    const { recus } = recusStore.load();
    recusStore.save({
      recus: [
        ...recus.filter(r => r.owner !== owner),
        ...lues.map(t => ({ owner, id: t.id, updatedAt: t.updatedAt })),
      ],
    });
  }

  /** Un envoi a abouti : le serveur a cette version — ou plus rien, retiré. */
  function accuser(op: Operation, doc?: T): void {
    const { recus } = recusStore.load();
    const autres = recus.filter(r => !(r.owner === op.owner && r.id === op.id));
    recusStore.save({
      recus:
        op.kind === 'save' && doc
          ? [
              ...autres,
              { owner: op.owner, id: op.id, updatedAt: doc.updatedAt },
            ]
          : autres,
    });
  }

  function oublierRecus(owner: string): void {
    const { recus } = recusStore.load();
    const reste = recus.filter(r => r.owner !== owner);
    if (reste.length !== recus.length) recusStore.save({ recus: reste });
  }

  /** La bibliothèque où écrire : celle du compte, ou celle de l'appareil. */
  const etagereDe = (compte: string | null) =>
    compte ? shelves.account(compte) : shelves.device;

  /**
   * Range des documents sur une étagère : par identifiant, le plus récent
   * gagne — la règle de la fusion, appliquée entre deux cases de l'appareil.
   */
  function ranger(etagere: Shelf<T>, arrivants: T[]): void {
    const fusion = new Map(etagere.load().map(t => [t.id, t]));
    for (const t of arrivants) {
      const deja = fusion.get(t.id);
      if (!deja || instant(t.updatedAt) > instant(deja.updatedAt)) {
        fusion.set(t.id, t);
      }
    }
    etagere.save([...fusion.values()].sort(parRecence));
  }

  /**
   * CE QUI EST DÉJÀ À CE COMPTE QUITTE LA BIBLIOTHÈQUE DE L'APPAREIL.
   *
   * Avant le cloisonnement, une seule bibliothèque tenait tout : ce qu'un
   * compte avait synchronisé s'y mêlait à ce qu'on avait écrit sans compte.
   * La lecture d'un compte vient donc y reprendre les siens — ceux que le
   * serveur range sous son nom (`connus`), ceux qu'il a écrits et qui
   * attendent de partir, ceux que sa case a déjà. Le même identifiant, c'est
   * le même document : le plus récent des deux reste. Le reste ne bouge pas,
   * et ne montera que sur un geste (« Ajouter à mon compte »).
   */
  function rapatrier(compte: string, connus: ReadonlySet<string>): void {
    const appareil = shelves.device.load();
    if (appareil.length === 0) return;
    const enAttente = new Set(
      syncStore
        .load()
        .ops.filter(o => o.owner === compte)
        .map(o => o.id)
    );
    const mien = shelves.account(compte);
    const dejaLa = new Set(mien.load().map(t => t.id));
    const siens = appareil.filter(
      t => connus.has(t.id) || enAttente.has(t.id) || dejaLa.has(t.id)
    );
    if (siens.length === 0) return;
    ranger(mien, siens);
    const partis = new Set(siens.map(t => t.id));
    shelves.device.save(appareil.filter(t => !partis.has(t.id)));
    history?.moved([...partis], null, compte);
  }

  /**
   * OUBLIE LA BIBLIOTHÈQUE D'UN COMPTE SUR CET APPAREIL, et ce qu'il avait à
   * envoyer — à l'effacement du compte. Les autres comptes gardent les leurs :
   * leurs écritures en attente n'ont rien à voir avec celui qui part.
   */
  function forgetAccount(owner: string): void {
    shelves.forget(owner);
    history?.forget(owner);
    const { ops } = syncStore.load();
    const reste = ops.filter(o => o.owner !== owner);
    if (reste.length !== ops.length) syncStore.save({ ops: reste });
    oublierRecus(owner);
  }

  /**
   * À LA DÉCONNEXION, LA COPIE D'UN COMPTE NE GARDE QUE CE QUI N'EST PAS PARTI.
   *
   * Une tablette de club passe de main en main. Aucun écran ne lit la case
   * d'un compte sous un autre, mais elle est dans le `localStorage` : tout ce
   * que le serveur a déjà en est retiré — il le rendra à la reconnexion.
   * Reste ce qui attend d'être envoyé, et ce que le serveur n'a jamais
   * confirmé (`recusStore`) : rien ne se perd sur une déconnexion. Sans
   * reste, la clé disparaît.
   *
   * LES ÉCRITURES EN ATTENTE NE BOUGENT PAS : elles partiront sous ce compte,
   * et sous lui seul, quand il reviendra. Les autres comptes de l'appareil et
   * sa bibliothèque sans compte ne sont pas touchés.
   */
  function leaveAccount(owner: string): void {
    const enAttente = new Set(
      syncStore
        .load()
        .ops.filter(o => o.owner === owner && o.kind === 'save')
        .map(o => o.id)
    );
    const surServeur = new Map(
      recusStore
        .load()
        .recus.filter(r => r.owner === owner)
        .map(r => [r.id, r.updatedAt])
    );
    shelves.keep(owner, t => {
      if (enAttente.has(t.id)) return true;
      const recu = surServeur.get(t.id);
      return recu === undefined || instant(t.updatedAt) > instant(recu);
    });
    // Ce qui reste n'est, par construction, pas confirmé : le relevé n'a plus
    // rien à en dire, et la lecture suivante du compte le refera.
    oublierRecus(owner);
  }

  /**
   * RANGE UN DOCUMENT DANS LA COPIE D'UN COMPTE, COMME UNE ÉCRITURE EN
   * ATTENTE — sans réseau ni session : il partira à la prochaine lecture de
   * ce compte, sur cet appareil, et la déconnexion le garde (il attend).
   * C'est ce que devient le brouillon du tableau quand son compte s'en va
   * (ADR 0015, suivi du 20/11/2026). Un identifiant hors UUID ne part
   * jamais, mais reste dans la copie : rien ne prouve que le serveur l'a.
   */
  function park(owner: string, doc: T): void {
    const copie = shelves.account(owner);
    const avant = copie.load().find(t => t.id === doc.id);
    ranger(copie, [doc]);
    // Il remplace la version enregistrée : elle passe dans l'historique.
    if (!avant || instant(doc.updatedAt) > instant(avant.updatedAt)) {
      history?.saved(owner, avant, doc);
    }
    if (synchronisable(doc.id)) {
      noter({
        owner,
        id: doc.id,
        kind: 'save',
        at: apres(maintenant(), doc, 0),
      });
    }
  }

  /** Ce que l'appareil tient pour ce compte : sa copie, puis l'appareil. */
  function heldFor(owner: string): T[] {
    return [...shelves.account(owner).load(), ...shelves.device.load()];
  }

  /**
   * LES DOCUMENTS D'UN COMPTE, RETROUVÉS SUR CHAQUE APPAREIL.
   *
   * L'APPAREIL RESTE LA VÉRITÉ. À l'inverse des notes, dont la lecture vient
   * du serveur et la copie d'IndexedDB (ADR 0013), les documents vivent
   * d'abord dans le magasin local — celui du mode local, inchangé. Supabase
   * n'est qu'un second endroit où les ranger, que chaque appareil vient
   * fusionner. Un entraîneur prépare ses schémas et ses séances au bord du
   * bassin, où le réseau manque : l'écran ne doit jamais attendre le serveur
   * pour enregistrer ni pour relire.
   *
   * C'EST POURQUOI CE PORT N'A NI FILE NI COPIE DE LECTURE. Le magasin local
   * est déjà la copie ; `syncStore` tient ce qui reste à envoyer, et la
   * prochaine lecture en ligne l'envoie. Une seconde file aurait demandé un
   * second indicateur et une seconde lettre morte à l'écran, pour des gestes
   * qui ne se perdent pas : le document est sur l'appareil, quoi qu'il
   * arrive.
   *
   * TROIS ISSUES À UN ENVOI, ET UNE SEULE LÈVE.
   *
   *  - il passe : l'opération est oubliée ;
   *  - le réseau manque : elle est GARDÉE, journalisée, et la promesse se
   *    tient — l'écriture locale a eu lieu, l'écran n'a rien à annuler ;
   *  - la base REFUSE (RLS, contrainte) : on lève, pour que l'écran le dise.
   *    La copie locale reste — c'est le travail de l'utilisateur —, mais un
   *    refus ne réussit pas mieux la deuxième fois : il n'est pas rejoué.
   *
   * SANS SESSION, C'EST LE LOCAL, À L'OCTET PRÈS : aucune requête, et le SDK
   * n'est même pas chargé pour un visiteur sans compte.
   *
   * LA FUSION est celle d'un compte personnel, sans concurrence réelle : par
   * identifiant, le plus récent (`updatedAt`) gagne. Ce que le serveur a et
   * pas l'appareil s'ajoute ; ce que l'appareil a et pas le serveur reste —
   * un document d'avant le compte, ou écrit hors ligne, ne se perd jamais sur
   * une déduction.
   *
   * UNE SUPPRESSION EST UNE VERSION COMME UNE AUTRE (suivi du 20/11/2026) :
   * la ligne reste sur le serveur, vidée, datée de l'instant du geste — une
   * pierre tombale (`0008_pierres_tombales.sql`). Seule elle retire un
   * document de l'appareil : une absence ne prouve rien, une pierre tombale
   * si. Entre une suppression et une écriture du même document, LA PLUS
   * RÉCENTE GAGNE, dans les deux sens ; à égalité, la suppression. Mais
   * seule une écriture que le serveur n'a JAMAIS REÇUE — en attente sur
   * l'appareil — peut défaire une pierre tombale : une copie sans écriture
   * en attente n'est qu'un reflet de ce que le serveur avait, et la
   * suppression est venue après lui.
   *
   * LA RLS FAIT LE FILTRAGE, comme pour les notes : aucune requête ne porte
   * de `where owner = …`.
   */
  function repository(
    options: SupabaseDocumentsOptions = {}
  ): LibraryRepository<T> {
    const client = options.client ?? (() => supabase.getClient());
    const owner = options.owner ?? compteSurAppareil;
    const isOnline = options.isOnline ?? (() => !navigateurHorsLigne());
    const now = options.now ?? maintenant;

    /**
     * UN REFUS OU UNE COUPURE ? `classifyBackendError` du socle reconnaît
     * « Failed to fetch » (Chromium) et « NetworkError » (Firefox), pas le
     * « Load failed » de Safari — celui d'un iPad au bord du bassin. On
     * tranche donc d'abord sur le code : la base formule les siens, une
     * requête qui ne l'a pas atteinte revient sans (`ErreurBase`). Une
     * réponse de passerelle illisible (502 en HTML) n'en a pas non plus :
     * elle attendra, comme une coupure, plutôt que de passer pour un refus.
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
      geste: (db: DocumentsClient) => Promise<{ error: ErreurBase | null }>
    ): Promise<Verdict> {
      try {
        const { error } = await geste(await client());
        if (!error) return { ok: true };
        return { ok: false, refus: estUnRefus(error), message: error.message };
      } catch (error) {
        // Le SDK qui ne se charge pas (son morceau, hors ligne) LÈVE au lieu
        // de rendre une erreur : même verdict, même règle.
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, refus: estUnRefus(error), message };
      }
    }

    /**
     * LA LIGNE, et la version du modèle qui l'a écrite. `owner` n'y est pas :
     * la base le pose (`default auth.uid()`) et la RLS le vérifie — le client
     * n'a pas à prétendre qui il est. `deleted_at` y est, à `null` : écrire
     * un document tombé ailleurs le ressuscite — c'est la fusion qui a
     * décidé que cette écriture était la plus récente.
     */
    const ligne = (doc: T) => ({
      id: doc.id,
      name: doc.name,
      version: kind.version,
      data: doc,
      deleted_at: null,
    });

    /**
     * LA PIERRE TOMBALE : rien du contenu ne reste, ni le nom recopié ni les
     * données — la base refuse une ligne tombée qui en garderait
     * (`*_tombee_vide`). Datée du geste, pas de l'envoi : une suppression
     * faite hors ligne le matin a eu lieu le matin.
     */
    const pierreTombale = (op: Operation) => ({
      name: '',
      data: {},
      deleted_at: op.at,
    });

    const transmettre = (op: Operation, doc?: T) =>
      envoyer(db =>
        op.kind === 'save' && doc
          ? db.from(table).upsert([ligne(doc)], { onConflict: 'id' })
          : // Une MISE À JOUR, pas une insertion : une suppression ne crée
            // aucune ligne. Pas de `owner` ici non plus : la politique ne
            // laisse passer que les lignes du compte, et une autre ligne
            // portant cet identifiant ne serait simplement pas touchée.
            db.from(table).update(pierreTombale(op)).eq('id', op.id)
      );

    /**
     * UN ENVOI ABOUTI : il n'attend plus, et le serveur a cette version. Le
     * compte s'est déconnecté pendant la requête ? Sa copie a été réduite
     * avec cet envoi encore en attente : elle l'est de nouveau, et ce qui
     * vient d'arriver la quitte aussi.
     */
    function abouti(op: Operation, doc?: T): void {
      oublier(op);
      accuser(op, doc);
      if (owner() !== op.owner) leaveAccount(op.owner);
    }

    /**
     * Envoie ce qui vient d'être écrit ICI ; ne lève que sur un refus de la
     * base. Le compte est celui de l'écriture, lu une fois : une session qui
     * change pendant la requête n'envoie pas sous un autre nom.
     */
    async function apresEcriture(
      compte: string | null,
      op: Omit<Operation, 'owner'>,
      doc?: T
    ) {
      if (!compte || !synchronisable(op.id)) return;
      const tenue: Operation = { ...op, owner: compte };
      // NOTÉE AVANT D'ENVOYER : un onglet fermé pendant la requête laisse une
      // opération à reprendre, pas un document que le serveur n'aura jamais.
      noter(tenue);
      // Hors ligne déclaré, aucune requête : le SDK la ferait attendre une
      // demi-minute avant d'échouer.
      if (!isOnline()) return;
      const verdict = await transmettre(tenue, doc);
      if (verdict.ok) {
        abouti(tenue, doc);
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
     * UNE REQUÊTE PAR DOCUMENT : une ligne refusée n'emporte pas les autres.
     * La première coupure arrête tout — le reste attend la prochaine lecture.
     * Rend les refus : la lecture les journalise, « Ajouter à mon compte »
     * les dit.
     *
     * LE COMPTE PARTI EN COURS DE ROUTE ARRÊTE TOUT AUSSI. Sans session, le
     * SDK envoie la suite sans jeton : la RLS refuserait l'enregistrement —
     * oublié comme un refus — et la suppression ne toucherait aucune ligne —
     * oubliée comme un succès. Ce qui reste attend que ce compte revienne.
     */
    async function rattraper(
      restants: { op: Operation; doc?: T }[]
    ): Promise<{ op: Operation; message: string }[]> {
      const refus: { op: Operation; message: string }[] = [];
      for (const { op, doc } of restants) {
        if (owner() !== op.owner) {
          log.warn('rattrapage interrompu, le compte s’est déconnecté', {
            id: op.id,
            kind: op.kind,
          });
          break;
        }
        const verdict = await transmettre(op, doc);
        if (verdict.ok) {
          abouti(op, doc);
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
     * Les lignes du serveur, validées une à une : une ligne illisible —
     * écrite par une version future, ou abîmée — est ÉCARTÉE et journalisée,
     * jamais une raison de perdre toute la liste. Son identifiant est gardé :
     * rien ne doit l'écraser tant qu'on ne sait pas la lire. `null` quand le
     * serveur ne répond pas.
     *
     * UNE PIERRE TOMBALE N'EST PAS UNE LIGNE ILLISIBLE : ses données sont
     * vides par construction. Elle se reconnaît à `deleted_at`, avant toute
     * lecture de `data`, et se rend à part — l'identifiant, et l'instant de
     * la suppression.
     */
    async function lireDistant(): Promise<{
      lues: T[];
      illisibles: Set<string>;
      tombees: Map<string, string>;
    } | null> {
      let reponse: { data: unknown[] | null; error: ErreurBase | null };
      try {
        const db = await client();
        reponse = await db
          .from(table)
          .select('id, version, data, deleted_at')
          .order('updated_at', { ascending: false });
      } catch (error) {
        log.warn('lecture impossible', { error });
        return null;
      }
      if (reponse.error) {
        // Ni la coupure ni le refus ne doivent vider l'écran : l'appareil a
        // ses documents, il les montre. Le refus, lui, est un défaut à voir.
        const niveau = estUnRefus(reponse.error) ? 'error' : 'warn';
        log[niveau]('lecture', { message: reponse.error.message });
        return null;
      }

      const lues: T[] = [];
      const illisibles = new Set<string>();
      const tombees = new Map<string, string>();
      for (const brute of reponse.data ?? []) {
        const row = brute as {
          id?: unknown;
          version?: unknown;
          data?: unknown;
          deleted_at?: unknown;
        };
        if (row.deleted_at != null) {
          if (typeof row.id === 'string') {
            tombees.set(row.id, String(row.deleted_at));
          }
          continue;
        }
        // Toujours monté avant d'être validé : `read` amène une ligne de
        // N'IMPORTE QUELLE version antérieure jusqu'au modèle courant.
        const lu = kind.read(row.data);
        if (lu && lu.id === row.id) {
          lues.push(lu);
          continue;
        }
        if (typeof row.id === 'string') illisibles.add(row.id);
        log.warn('ligne distante écartée', {
          id: row.id,
          version: row.version,
          modele: kind.version,
        });
      }
      return { lues, illisibles, tombees };
    }

    return {
      async list() {
        const compte = owner();
        // SANS COMPTE, LA BIBLIOTHÈQUE DE L'APPAREIL — et rien d'un compte :
        // celui qui vient de se déconnecter n'y a rien laissé.
        if (!compte) return shelves.device.load();

        const mien = shelves.account(compte);
        // Ce que ce compte a écrit sous son nom le rejoint, même hors ligne.
        rapatrier(compte, new Set());
        if (!isOnline()) return mien.load();

        const distant = await lireDistant();
        if (!distant) return mien.load();
        // DÉCONNECTÉ PENDANT LA REQUÊTE : rien ne s'écrit. Sa copie vient
        // d'être réduite à ce qui n'est pas parti (`leaveAccount`) ; la
        // réponse ne doit pas la regarnir. L'écran, lui, n'affiche pas une
        // lecture dépassée.
        if (owner() !== compte) return mien.load();
        recevoir(compte, distant.lues);

        // Ce que le serveur range sous ce compte est à lui — tombé compris :
        // la copie qu'en gardait l'appareil vient rejoindre sa case, où la
        // pierre tombale la retrouvera.
        rapatrier(
          compte,
          new Set([
            ...distant.lues.map(t => t.id),
            ...distant.illisibles,
            ...distant.tombees.keys(),
          ])
        );

        // Relu APRÈS la réponse : un document enregistré pendant la requête
        // doit compter dans la fusion, et rien n'attend entre cette lecture
        // et l'écriture de la fusion.
        const ici = mien.load();
        const attente = syncStore.load().ops.filter(o => o.owner === compte);
        const retraits = new Map(
          attente.filter(o => o.kind === 'remove').map(o => [o.id, o])
        );
        const enregistrements = new Map(
          attente.filter(o => o.kind === 'save').map(o => [o.id, o])
        );

        const fusion = new Map(ici.map(t => [t.id, t]));
        const surServeur = new Set(distant.lues.map(t => t.id));
        const envois: { op: Operation; doc: T }[] = [];
        const retraitsAEnvoyer: Operation[] = [];
        const tombesIci: T[] = [];

        // SUPPRIMÉ AILLEURS. La copie de l'appareil s'en va — à moins d'une
        // écriture en attente faite APRÈS la suppression : elle repart, et
        // ressuscite la ligne. Ce que le serveur avait déjà reçu, lui, ne
        // défait rien : la suppression est venue après.
        for (const [id, tombeLe] of distant.tombees) {
          const ecrit = enregistrements.get(id);
          const local = fusion.get(id);
          if (ecrit && local && plusRecent(ecrit.at, tombeLe)) {
            envois.push({ op: ecrit, doc: local });
          } else if (local) {
            fusion.delete(id);
            tombesIci.push(local);
          }
        }

        for (const lu of distant.lues) {
          const retrait = retraits.get(lu.id);
          if (retrait) {
            // SUPPRIMÉ ICI HORS LIGNE, et le serveur l'a encore. La même
            // règle, dans l'autre sens : réécrit ailleurs APRÈS la
            // suppression, il revient ; sinon, c'est la suppression qui part.
            if (plusRecent(lu.updatedAt, retrait.at)) fusion.set(lu.id, lu);
            else retraitsAEnvoyer.push(retrait);
            continue;
          }
          const local = fusion.get(lu.id);
          if (!local || instant(lu.updatedAt) > instant(local.updatedAt)) {
            fusion.set(lu.id, lu);
          } else if (instant(local.updatedAt) > instant(lu.updatedAt)) {
            // Le serveur est en retard sur l'appareil : modifié hors ligne,
            // ou un envoi perdu. La ligne est à ce compte — la RLS ne lui
            // montre que les siennes —, elle peut repartir.
            envois.push({
              op: enregistrements.get(lu.id) ?? {
                owner: compte,
                id: lu.id,
                kind: 'save',
                at: apres(now(), local, 0),
              },
              doc: local,
            });
          }
        }
        // Une ligne qu'on ne sait pas lire se supprime quand même : on n'a pas
        // à la lire pour la vider.
        for (const id of distant.illisibles) {
          const retrait = retraits.get(id);
          if (retrait) retraitsAEnvoyer.push(retrait);
        }
        for (const local of ici) {
          const ecrit = enregistrements.get(local.id);
          if (
            ecrit &&
            !surServeur.has(local.id) &&
            !distant.illisibles.has(local.id) &&
            !distant.tombees.has(local.id)
          ) {
            envois.push({ op: ecrit, doc: local });
          }
        }

        const documents = [...fusion.values()].sort(parRecence);
        mien.save(documents);
        // Supprimé ailleurs, il emporte ses versions d'ici : une suppression
        // est une suppression, quel que soit l'appareil qui l'a faite.
        if (tombesIci.length > 0) history?.removed(compte, tombesIci);

        // CE QUE LA FUSION A RÉSOLU N'ATTEND PLUS : un enregistrement dépassé
        // par une version plus récente venue du serveur, déjà à jour, ou
        // battu par une suppression plus récente ; une suppression déjà
        // faite, sans objet, ou battue par une écriture plus récente. Un
        // enregistrement sur une ligne illisible attend une version de
        // l'application qui saura comparer.
        const partent = new Set<Operation>([
          ...envois.map(e => e.op),
          ...retraitsAEnvoyer,
        ]);
        for (const op of attente) {
          if (partent.has(op)) continue;
          if (op.kind === 'save' && distant.illisibles.has(op.id)) continue;
          oublier(op);
        }

        // La lecture n'a personne à qui dire un refus : elle le journalise.
        const restants = [...retraitsAEnvoyer.map(op => ({ op })), ...envois];
        for (const { op, message } of await rattraper(restants)) {
          log.error('rattrapage refusé par la base', {
            id: op.id,
            kind: op.kind,
            message,
          });
        }

        return documents;
      },

      async save(doc) {
        const compte = owner();
        const etagere = shelfIn(etagereDe(compte));
        // La version d'avant : dans la case du compte, ou sur l'appareil —
        // un document « hors de votre compte », ouvert puis enregistré.
        const avant =
          etagere.list().find(t => t.id === doc.id) ??
          (compte
            ? shelves.device.load().find(t => t.id === doc.id)
            : undefined);
        etagere.save(doc);
        history?.saved(compte, avant, doc);
        await apresEcriture(
          compte,
          { id: doc.id, kind: 'save', at: apres(now(), doc, 0) },
          doc
        );
      },

      async remove(id) {
        const compte = owner();
        const etagere = shelfIn(etagereDe(compte));
        // La suppression est datée APRÈS la version qu'elle efface (`apres`) :
        // une horloge en retard ne doit pas la faire passer pour plus ancienne.
        const efface = etagere.list().find(t => t.id === id);
        etagere.remove(id);
        if (efface) history?.removed(compte, [efface]);
        await apresEcriture(compte, {
          id,
          kind: 'remove',
          at: apres(now(), efface, 1),
        });
      },

      async outside() {
        const compte = owner();
        if (!compte) return [];
        const siens = new Set(
          shelves
            .account(compte)
            .load()
            .map(t => t.id)
        );
        return shelves.device.load().filter(t => !siens.has(t.id));
      },

      /**
       * « AJOUTER À MON COMPTE » : le geste que la connexion ne fait pas
       * seule. Un document écrit sans compte peut être à quelqu'un d'autre —
       * un appareil de club, un enfant qui a joué avec le tableau. Celui qui
       * les range dans son compte les a vus, et l'a voulu.
       *
       * Rangés D'ABORD dans la case du compte, notés à envoyer, puis envoyés :
       * hors ligne, ils partiront à la lecture suivante. Ce que la base
       * refuse (un identifiant déjà pris par un autre compte, un plafond)
       * RETOURNE sur l'appareil — il n'est pas au compte, il ne doit pas y
       * paraître.
       */
      async adopt(ids): Promise<AdoptResult> {
        const compte = owner();
        const voulus = new Set(ids);
        const appareil = shelves.device.load();
        const choisis = appareil.filter(t => voulus.has(t.id));
        if (!compte || choisis.length === 0) return { adopted: 0, refused: [] };

        const mien = shelves.account(compte);
        const avant = new Map(mien.load().map(t => [t.id, t]));
        ranger(mien, choisis);
        shelves.device.save(appareil.filter(t => !voulus.has(t.id)));
        history?.moved(
          choisis.map(t => t.id),
          null,
          compte
        );

        const aEnvoyer = choisis
          .filter(t => synchronisable(t.id))
          .map(doc => ({
            op: {
              owner: compte,
              id: doc.id,
              kind: 'save' as const,
              at: apres(now(), doc, 0),
            },
            doc,
          }));
        for (const { op } of aEnvoyer) noter(op);
        if (!isOnline() || aEnvoyer.length === 0) {
          return { adopted: choisis.length, refused: [] };
        }

        const refus = await rattraper(aEnvoyer);
        if (refus.length > 0) {
          const rendus = new Set(refus.map(r => r.op.id));
          mien.save(
            mien.load().flatMap(t => {
              if (!rendus.has(t.id)) return [t];
              const ancien = avant.get(t.id);
              return ancien ? [ancien] : [];
            })
          );
          ranger(
            shelves.device,
            choisis.filter(t => rendus.has(t.id))
          );
          // Leurs versions reviennent avec eux — sauf celles d'un document
          // que le compte avait déjà : elles y sont mêlées, et y restent.
          history?.moved(
            [...rendus].filter(id => !avant.has(id)),
            compte,
            null
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

  return {
    syncStore,
    recusStore,
    forgetAccount,
    leaveAccount,
    park,
    heldFor,
    repository,
  };
}
