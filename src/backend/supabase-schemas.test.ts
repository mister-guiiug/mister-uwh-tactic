import { beforeEach, describe, expect, it } from 'vitest';
import { tacticV1 } from '../features/board/fixtures.ts';
import {
  createTactic,
  TACTIC_VERSION,
  type Tactic,
} from '../features/board/model.ts';
import { createLocalBackend, schemasStore } from './local.ts';
import {
  createSupabaseSchemas,
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
  const repondre = (): ErreurBase | null => {
    if (leve) throw leve;
    return panne;
  };
  const client: SchemasClient = {
    from: () => ({
      select: () => ({
        order: async () => {
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

const ici = async () => createLocalBackend().schemas.list();
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

  it('fusionne : le plus récent gagne, le distant s’ajoute, l’appareil garde le sien', async () => {
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
      [D]: 'D ici seulement',
    };
    expect(noms(liste)).toEqual(attendu);
    expect(liste[0]!.id).toBe(B);
    // La fusion est RÉÉCRITE sur l'appareil : hors ligne demain, elle y est.
    expect(noms(await ici())).toEqual(attendu);
    // Le serveur, en retard sur B, est rattrapé ; D ne lui est pas donné.
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
