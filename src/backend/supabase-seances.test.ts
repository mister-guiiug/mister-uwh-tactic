import { beforeEach, describe, expect, it } from 'vitest';
import { SEANCE_VERSION, type Seance } from '../features/seances/model.ts';
import {
  accountSeancesStore,
  accountsWithSeances,
  seancesStore,
} from './local.ts';
import {
  createSupabaseSeances,
  forgetAccountSeances,
  leaveAccountSeances,
  seancesRecusStore,
  seancesSyncStore,
} from './supabase-seances.ts';
import { schemasSyncStore } from './supabase-schemas.ts';
import type { DocumentsClient } from './supabase-documents.ts';
import type { ErreurBase } from './supabase.ts';

/**
 * Ce que ces tests figent : LES SÉANCES SUIVENT LE COMPTE PAR LA MÊME RÈGLE
 * QUE LES SCHÉMAS — l'appareil d'abord, une écriture hors ligne qui attend
 * et part à la lecture suivante, une copie par compte réduite à la
 * déconnexion à ce qui n'est pas parti. La règle elle-même est éprouvée en
 * détail par `supabase-schemas.test.ts` (elle est écrite une fois, dans
 * `supabase-documents.ts`) ; ici, c'est son branchement sur la table
 * `seances`, ses clés et son modèle.
 */

const ALICE = '11111111-1111-4111-8111-111111111111';
const A = '0f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';
const B = '1f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';
const T1 = '2026-11-20T08:00:00.000Z';
const T2 = '2026-11-20T09:00:00.000Z';
const MAINTENANT = '2026-11-20T12:00:00.000Z';

const COUPURE: ErreurBase = { message: 'TypeError: Load failed', code: '' };

const seance = (id: string, name: string, at = T1): Seance => ({
  id,
  name,
  items: [{ schemaId: 'un-schema', minutes: 5, note: '' }],
  updatedAt: at,
});

interface Ligne {
  id: string;
  name: string;
  version: number;
  data: unknown;
  deleted_at?: string | null;
}

function serveur(initiales: Ligne[] = []) {
  const lignes = new Map(initiales.map(l => [l.id, structuredClone(l)]));
  const tables: string[] = [];
  let panne: ErreurBase | null = null;
  let connexions = 0;
  const client: DocumentsClient = {
    from: (table: string) => {
      tables.push(table);
      return {
        select: () => ({
          order: async () =>
            panne
              ? { data: null, error: panne }
              : {
                  data: [...lignes.values()].map(l => structuredClone(l)),
                  error: null,
                },
        }),
        delete: () => ({
          eq: async (_colonne: string, id: string) => {
            if (!panne) lignes.delete(id);
            return { error: panne };
          },
        }),
        update: (valeurs: Record<string, unknown>) => ({
          eq: async (_colonne: string, id: string) => {
            const ligne = lignes.get(id);
            if (!panne && ligne) {
              lignes.set(id, { ...ligne, ...structuredClone(valeurs) });
            }
            return { error: panne };
          },
        }),
        insert: async () => ({ error: null }),
        upsert: async (rows: unknown[]) => {
          if (!panne) {
            for (const row of rows as Ligne[]) {
              lignes.set(row.id, structuredClone(row));
            }
          }
          return { error: panne };
        },
      };
    },
  };
  return {
    lignes,
    tables,
    connexions: () => connexions,
    obtenir: async () => {
      connexions += 1;
      return client;
    },
    tomber(erreur: ErreurBase | null) {
      panne = erreur;
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
    maintenant: MAINTENANT,
  };
  const seances = createSupabaseSeances({
    client: distant.obtenir,
    owner: () => etat.compte,
    isOnline: () => etat.enLigne,
    now: () => etat.maintenant,
  });
  return { seances, etat };
}

const copie = (compte = ALICE) =>
  accountSeancesStore(compte)
    .load()
    .seances.map(s => s.id);

beforeEach(() => localStorage.clear());

describe('les séances d’un compte, sur Supabase', () => {
  it('sans session, c’est l’appareil — sous la clé de toujours, sans requête', async () => {
    const distant = serveur();
    const { seances } = adaptateur(distant, { compte: null });

    await seances.save(seance(A, 'ici'));
    expect((await seances.list()).map(s => s.id)).toEqual([A]);
    expect(seancesStore.load().seances.map(s => s.id)).toEqual([A]);
    expect(distant.connexions()).toBe(0);
  });

  it('enregistre dans la table des séances, avec la version du modèle', async () => {
    const distant = serveur();
    const { seances } = adaptateur(distant);

    await seances.save(seance(A, 'Mardi'));

    expect(distant.tables).toEqual(['seances']);
    expect(distant.lignes.get(A)).toMatchObject({
      id: A,
      name: 'Mardi',
      version: SEANCE_VERSION,
    });
    expect(copie()).toEqual([A]);
    expect(seancesStore.load().seances).toEqual([]);
    expect(seancesSyncStore.load().ops).toEqual([]);
    // Les deux files ne se mêlent pas : celle des schémas n'a rien vu.
    expect(schemasSyncStore.load().ops).toEqual([]);
  });

  it('hors ligne, l’écriture attend, puis part à la lecture suivante', async () => {
    const distant = serveur();
    const { seances, etat } = adaptateur(distant, { enLigne: false });

    await seances.save(seance(A, 'Au bord du bassin'));
    expect(distant.connexions()).toBe(0);
    expect(seancesSyncStore.load().ops).toEqual([
      { owner: ALICE, id: A, kind: 'save', at: MAINTENANT },
    ]);

    etat.enLigne = true;
    await seances.list();
    expect(distant.lignes.get(A)?.name).toBe('Au bord du bassin');
    expect(seancesSyncStore.load().ops).toEqual([]);
  });

  it('une coupure se tait et garde l’écriture ; la copie est sur l’appareil', async () => {
    const distant = serveur();
    distant.tomber(COUPURE);
    const { seances } = adaptateur(distant);

    await expect(seances.save(seance(A, 'Gardée'))).resolves.toBeUndefined();
    expect(copie()).toEqual([A]);
    expect(seancesSyncStore.load().ops).toHaveLength(1);
  });

  it('fusionne avec le serveur : le plus récent gagne, une ligne illisible est écartée', async () => {
    accountSeancesStore(ALICE).save({ seances: [seance(A, 'A ici', T1)] });
    const distant = serveur([
      { id: A, name: 'A', version: 1, data: seance(A, 'A distant', T2) },
      { id: B, name: 'B', version: 9, data: { venue: 'du futur' } },
    ]);
    const { seances } = adaptateur(distant);

    const liste = await seances.list();

    expect(liste.map(s => s.name)).toEqual(['A distant']);
  });

  it('à la déconnexion, la copie ne garde que ce qui n’est pas parti', async () => {
    const distant = serveur();
    const { seances, etat } = adaptateur(distant);
    await seances.save(seance(A, 'confirmée'));
    etat.enLigne = false;
    await seances.save(seance(B, 'en attente'));

    leaveAccountSeances(ALICE);

    expect(copie()).toEqual([B]);
    expect(seancesRecusStore.load().recus).toEqual([]);
    expect(seancesSyncStore.load().ops).toEqual([
      { owner: ALICE, id: B, kind: 'save', at: MAINTENANT },
    ]);
  });

  it('sans rien en attente, la clé du compte disparaît ; l’effacement oublie tout', async () => {
    const distant = serveur();
    const { seances, etat } = adaptateur(distant);
    await seances.save(seance(A, 'confirmée'));
    leaveAccountSeances(ALICE);
    expect(accountsWithSeances()).toEqual([]);

    etat.enLigne = false;
    await seances.save(seance(B, 'en attente'));
    forgetAccountSeances(ALICE);
    expect(accountsWithSeances()).toEqual([]);
    expect(seancesSyncStore.load().ops).toEqual([]);
  });

  it('ce qui est sur l’appareil hors du compte attend un geste, puis monte', async () => {
    seancesStore.save({ seances: [seance(A, 'd’avant le compte')] });
    const distant = serveur();
    const { seances } = adaptateur(distant);

    expect(await seances.list()).toEqual([]);
    expect((await seances.outside()).map(s => s.id)).toEqual([A]);

    const { adopted, refused } = await seances.adopt([A]);

    expect(adopted).toBe(1);
    expect(refused).toEqual([]);
    expect(distant.lignes.has(A)).toBe(true);
    expect(await seances.outside()).toEqual([]);
    expect(copie()).toEqual([A]);
  });
});

describe('une séance supprimée suit le compte (ADR 0018, suivi du 20/11/2026)', () => {
  it('supprimer pose une pierre tombale dans la table des séances : la ligne reste, vide', async () => {
    const distant = serveur();
    const { seances } = adaptateur(distant);
    await seances.save(seance(A, 'Mardi'));

    await seances.remove(A);

    expect(distant.tables.every(t => t === 'seances')).toBe(true);
    expect(distant.lignes.get(A)).toMatchObject({
      name: '',
      data: {},
      deleted_at: MAINTENANT,
    });
    expect(seancesSyncStore.load().ops).toEqual([]);
  });

  it('une séance supprimée ailleurs quitte la copie de cet appareil', async () => {
    const distant = serveur([
      { id: A, name: 'A', version: 1, data: seance(A, 'A') },
      { id: B, name: 'B', version: 1, data: seance(B, 'B') },
    ]);
    const { seances } = adaptateur(distant);
    expect(await seances.list()).toHaveLength(2);

    distant.lignes.set(A, {
      id: A,
      name: '',
      version: 1,
      data: {},
      deleted_at: T2,
    });

    expect((await seances.list()).map(s => s.id)).toEqual([B]);
    expect(copie()).toEqual([B]);
  });

  it('retouchée hors ligne après la suppression, elle revient — et la ligne avec elle', async () => {
    const distant = serveur([
      { id: A, name: 'A', version: 1, data: seance(A, 'A') },
    ]);
    const { seances, etat } = adaptateur(distant);
    await seances.list();
    etat.enLigne = false;
    await seances.save(seance(A, 'A retouchée', MAINTENANT));
    distant.lignes.set(A, {
      id: A,
      name: '',
      version: 1,
      data: {},
      deleted_at: T2,
    });

    etat.enLigne = true;
    expect((await seances.list()).map(s => s.name)).toEqual(['A retouchée']);
    expect(distant.lignes.get(A)?.deleted_at).toBeNull();
  });
});
