import { beforeEach, describe, expect, it } from 'vitest';
import { tacticV1 } from '../features/board/fixtures.ts';
import {
  createTactic,
  TACTIC_VERSION,
  type Tactic,
} from '../features/board/model.ts';
import {
  accountSchemasStore,
  accountsWithSchemas,
  schemasStore,
} from './local.ts';
import {
  createSupabaseSchemas,
  forgetAccountSchemas,
  leaveAccountSchemas,
  schemasRecusStore,
  schemasSyncStore,
  type SchemasClient,
} from './supabase-schemas.ts';
import type { ErreurBase } from './supabase.ts';

/**
 * Ce que ces tests figent : LES SCHÉMAS D'UN COMPTE SE RETROUVENT D'UN
 * APPAREIL À L'AUTRE, SANS QUE L'APPAREIL N'ATTENDE JAMAIS LE SERVEUR.
 *
 * Le client Supabase est un comptoir : il range les lignes dans une `Map`, et
 * tombe de la façon qu'on lui dit — avec les erreurs telles que PostgREST les
 * rend : une coupure SANS code, un refus de la base AVEC le sien.
 */

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';

const A = '0f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';
const B = '1f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';
const C = '2f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';
const D = '3f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';

const T1 = '2026-11-17T08:00:00.000Z';
const T2 = '2026-11-17T09:00:00.000Z';
const T3 = '2026-11-17T10:00:00.000Z';

/** Ce que rend postgrest-js quand `fetch` échoue : un message, aucun code. */
const COUPURE: ErreurBase = { message: 'TypeError: Failed to fetch', code: '' };
/** La même, sous Safari — que `classifyBackendError` ne reconnaît pas. */
const COUPURE_SAFARI: ErreurBase = {
  message: 'TypeError: Load failed',
  code: '',
};

const schema = (id: string, name: string, at: string): Tactic =>
  createTactic({ id, name, now: at });

interface Ligne {
  id: string;
  name: string;
  version: number;
  data: unknown;
}

const ligneDe = (t: Tactic): Ligne => ({
  id: t.id,
  name: t.name,
  version: TACTIC_VERSION,
  data: t,
});

function serveur(initiales: Ligne[] = []) {
  const lignes = new Map(initiales.map(l => [l.id, structuredClone(l)]));
  let panne: ErreurBase | null = null;
  let leve: Error | null = null;
  let connexions = 0;
  let retenue: Promise<void> | null = null;
  let pendant: (() => void) | null = null;
  const repondre = (): ErreurBase | null => {
    if (leve) throw leve;
    return panne;
  };
  const client: SchemasClient = {
    from: () => ({
      select: () => ({
        order: async () => {
          if (retenue) await retenue;
          const error = repondre();
          return error
            ? { data: null, error }
            : {
                data: [...lignes.values()].map(l => structuredClone(l)),
                error,
              };
        },
      }),
      delete: () => ({
        eq: async (_colonne: string, id: string) => {
          const error = repondre();
          if (!error) lignes.delete(id);
          return { error };
        },
      }),
      insert: async () => ({ error: null }),
      upsert: async (rows: unknown[]) => {
        pendant?.();
        const error = repondre();
        if (!error) {
          for (const row of rows as Ligne[]) {
            lignes.set(row.id, structuredClone(row));
          }
        }
        return { error };
      },
    }),
  };
  return {
    lignes,
    /** Combien de fois l'adaptateur a demandé le client — donc le réseau. */
    connexions: () => connexions,
    obtenir: async () => {
      connexions += 1;
      return client;
    },
    tomber(erreur: ErreurBase | null) {
      panne = erreur;
    },
    lever(erreur: Error | null) {
      leve = erreur;
    },
    /** La prochaine lecture attend qu'on la relâche. */
    retenirLecture() {
      let relacher = () => {};
      retenue = new Promise<void>(resolve => (relacher = resolve));
      return () => {
        retenue = null;
        relacher();
      };
    },
    /** Joué au début de chaque enregistrement : la requête est déjà partie. */
    pendantEnvoi(geste: (() => void) | null) {
      pendant = geste;
    },
  };
}

function adaptateur(
  distant: ReturnType<typeof serveur>,
  depart: { compte?: string | null; enLigne?: boolean } = {}
) {
  const etat = {
    compte: depart.compte === undefined ? ALICE : depart.compte,
    enLigne: depart.enLigne ?? true,
  };
  const schemas = createSupabaseSchemas({
    client: distant.obtenir,
    owner: () => etat.compte,
    isOnline: () => etat.enLigne,
  });
  return { schemas, etat };
}

/** La bibliothèque d'un compte, sur cet appareil (Alice par défaut). */
const ici = async (compte = ALICE) =>
  accountSchemasStore(compte).load().schemas;
/** Celle de l'appareil : ce qu'on a enregistré sans compte. */
const appareil = () => schemasStore.load().schemas;
const ids = (liste: Tactic[]) => liste.map(s => s.id);
const noms = (liste: Tactic[]) =>
  Object.fromEntries(liste.map(s => [s.id, s.name]));

beforeEach(() => localStorage.clear());

describe('les schémas d’un compte, sur Supabase', () => {
  it('sans session, c’est le local — et pas une requête', async () => {
    const distant = serveur([ligneDe(schema(B, 'distant', T1))]);
    const { schemas } = adaptateur(distant, { compte: null });

    await schemas.save(schema(A, 'ici', T1));
    expect((await schemas.list()).map(s => s.id)).toEqual([A]);
    await schemas.remove(A);
    expect(await schemas.list()).toEqual([]);

    expect(distant.connexions()).toBe(0);
  });

  it('enregistre sur le serveur, avec la version du modèle qui a écrit', async () => {
    const distant = serveur();
    const { schemas } = adaptateur(distant);

    await schemas.save(schema(A, 'Premier', T1));

    expect(distant.lignes.get(A)).toMatchObject({
      id: A,
      name: 'Premier',
      version: TACTIC_VERSION,
    });
    expect(schemasSyncStore.load().ops).toEqual([]);
  });

  it('fusionne : le plus récent gagne, le distant s’ajoute, ce qui n’est pas au compte reste à l’appareil', async () => {
    // L'appareil tel que l'a laissé la version d'avant le cloisonnement :
    // une seule bibliothèque, où ce que le compte avait synchronisé se
    // mêlait à ce qu'on avait écrit sans lui.
    schemasStore.save({
      schemas: [
        schema(B, 'B ici', T3),
        schema(A, 'A ici', T1),
        // D'avant le compte, jamais envoyé : il reste, et ne part pas tout
        // seul — sur un appareil partagé, il pourrait être à quelqu'un d'autre.
        schema(D, 'D ici seulement', T1),
      ],
    });
    const distant = serveur([
      ligneDe(schema(A, 'A distant', T2)),
      ligneDe(schema(B, 'B distant', T2)),
      ligneDe(schema(C, 'C distant', T1)),
    ]);
    const { schemas } = adaptateur(distant);

    const liste = await schemas.list();

    const attendu = {
      [A]: 'A distant',
      [B]: 'B ici',
      [C]: 'C distant',
    };
    expect(noms(liste)).toEqual(attendu);
    expect(liste[0]!.id).toBe(B);
    // La fusion est RÉÉCRITE dans la case du compte : hors ligne demain,
    // elle y est.
    expect(noms(await ici())).toEqual(attendu);
    // A et B, que le serveur range sous ce compte, ont quitté l'appareil ;
    // D y reste, montré à part, et n'est pas donné au serveur.
    expect(ids(appareil())).toEqual([D]);
    expect(ids(await schemas.outside())).toEqual([D]);
    expect(distant.lignes.get(B)?.name).toBe('B ici');
    expect(distant.lignes.has(D)).toBe(false);
  });

  it('hors ligne, l’enregistrement reste sur l’appareil, ne lève pas, et part au retour du réseau', async () => {
    const distant = serveur();
    const { schemas, etat } = adaptateur(distant, { enLigne: false });

    await expect(
      schemas.save(schema(A, 'au bord du bassin', T1))
    ).resolves.toBeUndefined();
    // Hors ligne déclaré : pas même une tentative.
    expect(distant.connexions()).toBe(0);
    expect((await ici()).map(s => s.id)).toEqual([A]);
    expect(await schemas.list()).toHaveLength(1);

    etat.enLigne = true;
    await schemas.list();
    expect(distant.lignes.get(A)?.name).toBe('au bord du bassin');
    expect(schemasSyncStore.load().ops).toEqual([]);
  });

  it('une coupure que le navigateur ne voit pas ne lève pas non plus — Safari compris', async () => {
    const distant = serveur();
    const { schemas } = adaptateur(distant);

    distant.tomber(COUPURE_SAFARI);
    await expect(schemas.save(schema(A, 'A', T1))).resolves.toBeUndefined();
    distant.tomber(COUPURE);
    await expect(schemas.save(schema(B, 'B', T1))).resolves.toBeUndefined();
    distant.tomber(null);
    // Le SDK lui-même qui ne se charge pas, hors ligne : il LÈVE.
    distant.lever(new TypeError('Failed to fetch dynamically imported module'));
    await expect(schemas.remove(A)).resolves.toBeUndefined();

    expect((await ici()).map(s => s.id)).toEqual([B]);
    expect(schemasSyncStore.load().ops).toEqual([
      { owner: ALICE, id: B, kind: 'save' },
      { owner: ALICE, id: A, kind: 'remove' },
    ]);

    distant.lever(null);
    await schemas.list();
    expect([...distant.lignes.keys()]).toEqual([B]);
    expect(schemasSyncStore.load().ops).toEqual([]);
  });

  it.each([
    {
      cas: 'la RLS',
      refus: {
        message:
          'new row violates row-level security policy for table "schemas"',
        code: '42501',
      },
    },
    {
      cas: 'une contrainte',
      refus: {
        message:
          'new row for relation "schemas" violates check constraint "schemas_data_plafond"',
        code: '23514',
      },
    },
  ])(
    'un refus de la base — $cas — lève, pour que l’écran le dise ; la copie locale reste',
    async ({ refus }) => {
      const distant = serveur();
      const { schemas } = adaptateur(distant);
      distant.tomber(refus);

      await expect(schemas.save(schema(A, 'refusé', T1))).rejects.toThrow(
        refus.message
      );
      expect((await ici()).map(s => s.id)).toEqual([A]);
      // Un refus ne réussit pas mieux la deuxième fois : il n'attend pas.
      expect(schemasSyncStore.load().ops).toEqual([]);
    }
  );

  it('écarte une ligne distante invalide sans perdre la liste', async () => {
    const distant = serveur([
      { id: A, name: 'abîmé', version: TACTIC_VERSION, data: { id: A } },
      ligneDe(schema(B, 'sain', T1)),
      // Une ligne dont les données disent un autre identifiant qu'elle.
      { ...ligneDe(schema(D, 'menteur', T1)), id: C },
    ]);
    const { schemas } = adaptateur(distant);

    const liste = await schemas.list();
    expect(liste.map(s => s.id)).toEqual([B]);
  });

  it('n’écrase pas une ligne qu’il ne sait pas lire — une version future', async () => {
    const future = { id: A, name: 'v-suivante', formeInconnue: true };
    const distant = serveur([
      { id: A, name: 'v-suivante', version: TACTIC_VERSION + 1, data: future },
    ]);
    const { schemas, etat } = adaptateur(distant, { enLigne: false });
    await schemas.save(schema(A, 'ancienne version', T3));

    etat.enLigne = true;
    await schemas.list();
    expect(distant.lignes.get(A)?.data).toEqual(future);
    // L'envoi attend une version de l'application qui saura comparer.
    expect(schemasSyncStore.load().ops).toEqual([
      { owner: ALICE, id: A, kind: 'save' },
    ]);
  });

  it('une suppression faite hors ligne ne ressuscite pas au retour du réseau', async () => {
    const distant = serveur([ligneDe(schema(A, 'à jeter', T1))]);
    const { schemas, etat } = adaptateur(distant);
    expect(await schemas.list()).toHaveLength(1);

    etat.enLigne = false;
    await schemas.remove(A);
    etat.enLigne = true;

    expect(await schemas.list()).toEqual([]);
    expect(distant.lignes.has(A)).toBe(false);
  });

  it('ce qu’un compte a écrit hors ligne ne part pas sous un autre', async () => {
    const distant = serveur();
    const { schemas, etat } = adaptateur(distant, { enLigne: false });
    await schemas.save(schema(A, 'à Alice', T1));

    etat.enLigne = true;
    etat.compte = BOB;
    await schemas.list();
    expect(distant.lignes.has(A)).toBe(false);

    etat.compte = ALICE;
    await schemas.list();
    expect(distant.lignes.get(A)?.name).toBe('à Alice');
  });

  it('monte une ligne écrite par une version antérieure du modèle', async () => {
    const ancien = tacticV1();
    const distant = serveur([
      {
        id: String(ancien.id),
        name: 'Schéma de la v1',
        version: 1,
        data: ancien,
      },
    ]);
    const { schemas } = adaptateur(distant);

    const [lu] = await schemas.list();
    expect(lu?.name).toBe('Schéma de la v1');
  });

  it('garde sur l’appareil un schéma dont l’identifiant n’est pas un UUID', async () => {
    const distant = serveur();
    const { schemas } = adaptateur(distant);

    await schemas.save(schema('retouche-a-la-main', 'importé', T1));
    expect(distant.connexions()).toBe(0);
    expect((await ici()).map(s => s.id)).toEqual(['retouche-a-la-main']);
  });
});

describe('une bibliothèque par compte (ADR 0015, suivi du 18/11/2026)', () => {
  it('le compte suivant ne voit rien du précédent, ni l’appareil sans compte', async () => {
    const distant = serveur();
    const { schemas, etat } = adaptateur(distant);
    await schemas.save(schema(A, 'à Alice', T1));
    expect(ids(await schemas.list())).toEqual([A]);

    // Alice se déconnecte : l'appareil n'a rien.
    etat.compte = null;
    expect(await schemas.list()).toEqual([]);
    expect(await schemas.outside()).toEqual([]);

    // Bob se connecte sur la même tablette : rien d'Alice, hors ligne
    // compris — sa case n'est pas lue sous un autre nom.
    etat.compte = BOB;
    etat.enLigne = false;
    expect(await schemas.list()).toEqual([]);
    expect(await schemas.outside()).toEqual([]);

    // Alice revenue au bord du bassin, sans réseau : sa bibliothèque est là.
    etat.compte = ALICE;
    expect(ids(await schemas.list())).toEqual([A]);
  });

  it('ce qu’on écrit sans compte reste à l’appareil, montré à part une fois connecté', async () => {
    const distant = serveur();
    const { schemas, etat } = adaptateur(distant, { compte: null });
    await schemas.save(schema(D, 'sans compte', T1));

    etat.compte = ALICE;
    expect(await schemas.list()).toEqual([]);
    expect(ids(await schemas.outside())).toEqual([D]);
    // Rien n'est parti tout seul.
    expect(distant.lignes.has(D)).toBe(false);

    etat.compte = null;
    expect(ids(await schemas.list())).toEqual([D]);
  });

  it('« Ajouter à mon compte » range, envoie, et retire de l’appareil', async () => {
    const distant = serveur();
    const { schemas, etat } = adaptateur(distant, { compte: null });
    await schemas.save(schema(D, 'D', T1));
    await schemas.save(schema(C, 'C', T2));
    etat.compte = ALICE;

    await expect(schemas.adopt([D])).resolves.toEqual({
      adopted: 1,
      refused: [],
    });
    expect(distant.lignes.get(D)?.name).toBe('D');
    expect(ids(await ici())).toEqual([D]);
    expect(ids(appareil())).toEqual([C]);
    expect(ids(await schemas.outside())).toEqual([C]);
    expect(schemasSyncStore.load().ops).toEqual([]);
  });

  it('hors ligne, l’ajout attend le réseau — sous le compte qui l’a voulu', async () => {
    const distant = serveur();
    const { schemas, etat } = adaptateur(distant, { compte: null });
    await schemas.save(schema(D, 'D', T1));
    etat.compte = ALICE;
    etat.enLigne = false;

    await expect(schemas.adopt([D])).resolves.toEqual({
      adopted: 1,
      refused: [],
    });
    expect(distant.connexions()).toBe(0);
    expect(schemasSyncStore.load().ops).toEqual([
      { owner: ALICE, id: D, kind: 'save' },
    ]);

    etat.enLigne = true;
    await schemas.list();
    expect(distant.lignes.get(D)?.name).toBe('D');
  });

  it('ce que la base refuse retourne sur l’appareil, avec sa raison', async () => {
    const distant = serveur();
    const { schemas, etat } = adaptateur(distant, { compte: null });
    await schemas.save(schema(D, 'à un autre', T1));
    etat.compte = ALICE;
    const refus = {
      message: 'new row violates row-level security policy for table "schemas"',
      code: '42501',
    };
    distant.tomber(refus);

    await expect(schemas.adopt([D])).resolves.toEqual({
      adopted: 0,
      refused: [{ id: D, message: refus.message }],
    });
    expect(await ici()).toEqual([]);
    expect(ids(appareil())).toEqual([D]);
    expect(schemasSyncStore.load().ops).toEqual([]);
  });

  it('sans compte, l’ajout ne trouve rien à faire', async () => {
    const distant = serveur();
    const { schemas } = adaptateur(distant, { compte: null });
    await schemas.save(schema(D, 'D', T1));

    await expect(schemas.adopt([D])).resolves.toEqual({
      adopted: 0,
      refused: [],
    });
    expect(ids(appareil())).toEqual([D]);
  });

  it('ce qu’un compte avait en attente sur l’appareil d’avant le cloisonnement le rejoint, même hors ligne', async () => {
    schemasStore.save({ schemas: [schema(A, 'écrit par Alice', T1)] });
    schemasSyncStore.save({ ops: [{ owner: ALICE, id: A, kind: 'save' }] });
    const distant = serveur();
    const { schemas, etat } = adaptateur(distant, { enLigne: false });

    expect(ids(await schemas.list())).toEqual([A]);
    expect(appareil()).toEqual([]);

    etat.enLigne = true;
    await schemas.list();
    expect(distant.lignes.get(A)?.name).toBe('écrit par Alice');
  });

  it('effacer un compte oublie sa case et ses envois, pas ceux des autres', async () => {
    const distant = serveur();
    const { schemas, etat } = adaptateur(distant, { enLigne: false });
    await schemas.save(schema(A, 'à Alice', T1));
    etat.compte = BOB;
    await schemas.save(schema(B, 'à Bob', T1));
    expect(accountsWithSchemas().sort()).toEqual([ALICE, BOB].sort());

    forgetAccountSchemas(ALICE);

    expect(await ici(ALICE)).toEqual([]);
    expect(ids(await ici(BOB))).toEqual([B]);
    expect(schemasSyncStore.load().ops).toEqual([
      { owner: BOB, id: B, kind: 'save' },
    ]);
    expect(accountsWithSchemas()).toEqual([BOB]);
  });
});

describe('à la déconnexion, la copie ne garde que ce qui n’est pas parti (ADR 0015)', () => {
  /** Ce que fait la session à `SIGNED_OUT` : plus de compte, sa copie se referme. */
  const deconnecter = (etat: { compte: string | null }, compte = ALICE) => {
    etat.compte = null;
    leaveAccountSchemas(compte);
  };

  const REFUS: ErreurBase = {
    message: 'new row violates row-level security policy for table "schemas"',
    code: '42501',
  };

  it('ce que le serveur a déjà quitte l’appareil ; sans attente, la clé disparaît', async () => {
    const distant = serveur([ligneDe(schema(C, 'C distant', T1))]);
    const { schemas, etat } = adaptateur(distant);
    await schemas.save(schema(A, 'A', T1));
    await schemas.save(schema(B, 'B', T2));
    expect(ids(await schemas.list()).sort()).toEqual([A, B, C].sort());

    deconnecter(etat);

    expect(accountsWithSchemas()).toEqual([]);
    expect(schemasRecusStore.load().recus).toEqual([]);
    expect(schemasSyncStore.load().ops).toEqual([]);

    // À la reconnexion, la copie se reconstruit depuis le serveur.
    etat.compte = ALICE;
    expect(noms(await schemas.list())).toEqual({
      [A]: 'A',
      [B]: 'B',
      [C]: 'C distant',
    });
    expect(ids(await ici()).sort()).toEqual([A, B, C].sort());
  });

  it('un schéma modifié hors ligne survit à la déconnexion, et part à la reconnexion du même compte', async () => {
    const distant = serveur([
      ligneDe(schema(A, 'A', T1)),
      ligneDe(schema(B, 'B', T1)),
    ]);
    const { schemas, etat } = adaptateur(distant);
    await schemas.list();

    // Au bord du bassin, sans réseau : A est retouché, rien ne part.
    etat.enLigne = false;
    await schemas.save(schema(A, 'A retouché', T2));
    deconnecter(etat);

    // B, que le serveur a, est parti de l'appareil ; A attend.
    expect(noms(await ici())).toEqual({ [A]: 'A retouché' });
    expect(schemasSyncStore.load().ops).toEqual([
      { owner: ALICE, id: A, kind: 'save' },
    ]);
    expect(distant.lignes.get(A)?.name).toBe('A');

    etat.compte = ALICE;
    etat.enLigne = true;
    expect(noms(await schemas.list())).toEqual({
      [A]: 'A retouché',
      [B]: 'B',
    });
    expect(distant.lignes.get(A)?.name).toBe('A retouché');
    expect(schemasSyncStore.load().ops).toEqual([]);
  });

  it('une suppression en attente attend aussi, et part à la reconnexion', async () => {
    const distant = serveur([
      ligneDe(schema(A, 'à jeter', T1)),
      ligneDe(schema(B, 'B', T1)),
    ]);
    const { schemas, etat } = adaptateur(distant);
    await schemas.list();
    etat.enLigne = false;
    await schemas.remove(A);

    deconnecter(etat);

    // Plus aucun schéma à garder : la clé est partie, la suppression attend.
    expect(accountsWithSchemas()).toEqual([]);
    expect(schemasSyncStore.load().ops).toEqual([
      { owner: ALICE, id: A, kind: 'remove' },
    ]);

    etat.compte = ALICE;
    etat.enLigne = true;
    expect(ids(await schemas.list())).toEqual([B]);
    expect(distant.lignes.has(A)).toBe(false);
  });

  it('ce que le serveur n’a pas confirmé reste, même sans attente : un refus, un identifiant hors UUID, une version plus récente restée en route', async () => {
    // L'appareil d'avant le cloisonnement tenait de B une version plus
    // récente que celle du serveur : la lecture la reprend, et la renvoie.
    schemasStore.save({ schemas: [schema(B, 'B ici', T3)] });
    const distant = serveur([
      ligneDe(schema(B, 'B distant', T1)),
      ligneDe(schema(C, 'C', T1)),
    ]);
    const { schemas, etat } = adaptateur(distant);
    // La coupure tombe pendant ce renvoi.
    distant.pendantEnvoi(() => distant.tomber(COUPURE));
    await schemas.list();
    distant.pendantEnvoi(null);
    distant.tomber(null);

    await schemas.save(schema('retouche-a-la-main', 'importé', T1));
    distant.tomber(REFUS);
    await expect(schemas.save(schema(A, 'refusé', T1))).rejects.toThrow(
      REFUS.message
    );
    distant.tomber(null);
    // Aucun des trois n'attend dans la file : elle seule les perdrait.
    expect(schemasSyncStore.load().ops).toEqual([]);

    deconnecter(etat);

    expect(noms(await ici())).toEqual({
      [A]: 'refusé',
      [B]: 'B ici',
      'retouche-a-la-main': 'importé',
    });
  });

  it('les autres comptes de l’appareil et sa bibliothèque sans compte ne bougent pas', async () => {
    const distant = serveur();
    const { schemas, etat } = adaptateur(distant, { compte: null });
    await schemas.save(schema(D, 'sans compte', T1));
    // Bob : un schéma envoyé, un autre écrit hors ligne qui attend.
    etat.compte = BOB;
    await schemas.save(schema(C, 'à Bob, envoyé', T1));
    etat.enLigne = false;
    await schemas.save(schema(B, 'à Bob, en attente', T2));
    etat.enLigne = true;
    etat.compte = ALICE;
    await schemas.save(schema(A, 'à Alice', T1));

    const avant = {
      bob: await ici(BOB),
      appareil: appareil(),
      ops: schemasSyncStore.load().ops,
      recusDeBob: schemasRecusStore.load().recus.filter(r => r.owner === BOB),
    };
    expect(ids(avant.bob)).toEqual([B, C]);

    deconnecter(etat);

    expect(await ici(BOB)).toEqual(avant.bob);
    expect(appareil()).toEqual(avant.appareil);
    expect(schemasSyncStore.load().ops).toEqual(avant.ops);
    expect(schemasRecusStore.load().recus).toEqual(avant.recusDeBob);
    expect(accountsWithSchemas()).toEqual([BOB]);
  });

  it('une lecture partie avant la déconnexion ne regarnit pas la copie', async () => {
    const distant = serveur([ligneDe(schema(A, 'A', T1))]);
    const { schemas, etat } = adaptateur(distant);
    await schemas.list();

    const relacher = distant.retenirLecture();
    const lecture = schemas.list();
    deconnecter(etat);
    relacher();
    await lecture;

    expect(accountsWithSchemas()).toEqual([]);
    expect(schemasRecusStore.load().recus).toEqual([]);
  });

  it('déconnecté pendant le rattrapage : la suite attend le compte, ce qui est arrivé quitte la copie', async () => {
    const distant = serveur();
    const { schemas, etat } = adaptateur(distant, { enLigne: false });
    await schemas.save(schema(A, 'A', T1));
    await schemas.save(schema(B, 'B', T2));
    etat.enLigne = true;
    // La déconnexion tombe pendant le premier envoi, parti avec le jeton.
    distant.pendantEnvoi(() => {
      distant.pendantEnvoi(null);
      deconnecter(etat);
    });
    await schemas.list();

    const partis = [...distant.lignes.keys()];
    expect(partis).toHaveLength(1);
    const reste = partis[0] === A ? B : A;
    expect(schemasSyncStore.load().ops).toEqual([
      { owner: ALICE, id: reste, kind: 'save' },
    ]);
    expect(ids(await ici())).toEqual([reste]);

    etat.compte = ALICE;
    await schemas.list();
    expect([...distant.lignes.keys()].sort()).toEqual([A, B].sort());
    expect(schemasSyncStore.load().ops).toEqual([]);
  });
});
