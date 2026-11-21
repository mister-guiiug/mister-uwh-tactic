import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTactic,
  TACTIC_VERSION,
  type Tactic,
} from '../features/board/model.ts';
import { createLocalBackend, schemasStore } from './local.ts';
import {
  createSupabaseSchemas,
  forgetAccountSchemas,
  parkAccountSchema,
  type SchemasClient,
} from './supabase-schemas.ts';
import {
  clearDeviceVersions,
  dropVersion,
  schemaHistory,
  VERSIONS_BUDGET,
  VERSIONS_PER_SCHEMA,
  versionsOf,
} from './versions.ts';

/**
 * Ce que ces tests figent : CHAQUE ENREGISTREMENT GARDE LA VERSION D'AVANT,
 * SUR L'APPAREIL, DANS LA CASE DE LA BIBLIOTHÈQUE QUI L'A ÉCRITE (ADR 0034).
 *
 * Le local et la synchronisation par compte sont construits POUR DE VRAI,
 * avec l'historique branché comme dans `index.ts` ; le serveur est un
 * comptoir, comme dans `supabase-schemas.test.ts`.
 */

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const A = '0f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';
const B = '1f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';

/** La n-ième version de `A` : un nom et une date de plus à chaque fois. */
const version = (n: number, id = A): Tactic =>
  createTactic({
    id,
    name: `Version ${n}`,
    now: new Date(Date.UTC(2026, 10, 21, 8, n)).toISOString(),
  });

const noms = (liste: Tactic[]) => liste.map(t => t.name);

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('les versions, en local', () => {
  const local = () => createLocalBackend(schemaHistory).schemas;

  it('un enregistrement qui change le schéma range la version d’avant', async () => {
    const schemas = local();
    await schemas.save(version(1));
    expect(versionsOf(null, A)).toEqual([]);

    await schemas.save(version(2));
    await schemas.save(version(3));

    expect(noms(versionsOf(null, A))).toEqual(['Version 2', 'Version 1']);
    // Le schéma, lui, est le dernier enregistré : l'historique est à part.
    expect(noms(await schemas.list())).toEqual(['Version 3']);
    expect(schemasStore.load().schemas).toHaveLength(1);
  });

  it('ni un geste défait, ni une étiquette ne font une version', async () => {
    const schemas = local();
    const v1 = version(1);
    await schemas.save(v1);
    // Redaté, inchangé : un déplacement défait puis refait.
    await schemas.save({ ...v1, updatedAt: '2026-11-21T09:00:00.000Z' });
    // Une étiquette range le schéma, elle ne le change pas (ADR 0029).
    await schemas.save({
      ...v1,
      tags: ['attack'],
      updatedAt: '2026-11-21T09:01:00.000Z',
    });

    expect(versionsOf(null, A)).toEqual([]);
  });

  it(`dix au plus par schéma : les plus anciennes tombent`, async () => {
    const schemas = local();
    for (let n = 1; n <= VERSIONS_PER_SCHEMA + 3; n += 1) {
      await schemas.save(version(n));
    }
    await schemas.save(version(1, B));
    await schemas.save(version(2, B));

    const gardees = versionsOf(null, A);
    expect(gardees).toHaveLength(VERSIONS_PER_SCHEMA);
    expect(gardees[0]!.name).toBe(`Version ${VERSIONS_PER_SCHEMA + 2}`);
    expect(gardees.at(-1)!.name).toBe('Version 3');
    // La limite est PAR schéma : celles de B ne prennent pas leur place.
    expect(noms(versionsOf(null, B))).toEqual(['Version 1']);
  });

  it('une suppression emporte ses versions ; « Annuler » les rend', async () => {
    const schemas = local();
    await schemas.save(version(1));
    await schemas.save(version(2));
    await schemas.save(version(1, B));
    await schemas.save(version(2, B));

    await schemas.remove(A);
    expect(versionsOf(null, A)).toEqual([]);
    expect(noms(versionsOf(null, B))).toEqual(['Version 1']);

    // « Annuler » remet le schéma tel qu'il était (ADR 0008) : ses versions
    // reviennent avec lui.
    await schemas.save(version(2));
    expect(noms(versionsOf(null, A))).toEqual(['Version 1']);
  });

  it('la dernière version partie, la clé disparaît', async () => {
    const schemas = local();
    await schemas.save(version(1));
    await schemas.save(version(2));
    await schemas.remove(A);

    expect(
      Object.keys(localStorage).filter(k => k.includes('schemas-versions'))
    ).toEqual([]);
  });

  it('la version reprise quitte l’historique', async () => {
    const schemas = local();
    await schemas.save(version(1));
    await schemas.save(version(2));
    await schemas.save(version(3));
    const [, premiere] = versionsOf(null, A);

    dropVersion(null, premiere!);

    expect(noms(versionsOf(null, A))).toEqual(['Version 2']);
  });
});

describe('le poids des versions', () => {
  /** Un schéma de trente étapes : 42 000 caractères environ. */
  const lourd = (n: number): Tactic => {
    const base = version(n);
    return { ...base, steps: Array.from({ length: 30 }, () => base.steps[0]!) };
  };

  it(`une case ne dépasse pas ${VERSIONS_BUDGET} caractères : les plus anciennes tombent, tous schémas confondus`, async () => {
    const schemas = createLocalBackend(schemaHistory).schemas;
    for (let n = 1; n <= 8; n += 1) await schemas.save(lourd(n));
    for (let n = 1; n <= 8; n += 1) {
      await schemas.save({ ...lourd(n + 20), id: B });
    }

    const cle = Object.keys(localStorage).find(k =>
      k.endsWith('schemas-versions')
    )!;
    expect(localStorage.getItem(cle)!.length).toBeLessThanOrEqual(
      VERSIONS_BUDGET + 100
    );
    // Les plus récentes restent : celles de B, écrites après.
    expect(versionsOf(null, B)).toHaveLength(7);
    expect(versionsOf(null, A).length).toBeLessThan(7);
  });

  it('le stockage plein : l’historique cède la place, jamais le schéma', async () => {
    const schemas = createLocalBackend(schemaHistory).schemas;
    await schemas.save(version(1));
    await schemas.save(version(2));
    await schemas.save(version(3));
    // Le `localStorage` de l'origine est presque plein : plus de deux
    // versions (3 300 caractères chacune) n'y tiennent pas.
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (key.includes('schemas-versions') && value.length > 8_000) {
        throw new DOMException('plein', 'QuotaExceededError');
      }
      setItem.call(this, key, value);
    });

    await schemas.save(version(4));

    expect(noms(await schemas.list())).toEqual(['Version 4']);
    expect(noms(versionsOf(null, A))).toEqual(['Version 3', 'Version 2']);
  });
});

/** Le serveur d'un compte : des lignes, et rien qui tombe. */
function serveur() {
  const lignes = new Map<string, Record<string, unknown>>();
  const client: SchemasClient = {
    from: () => ({
      select: () => ({
        order: async () => ({
          data: [...lignes.values()].map(l => structuredClone(l)),
          error: null,
        }),
      }),
      delete: () => ({ eq: async () => ({ error: null }) }),
      update: (valeurs: Record<string, unknown>) => ({
        eq: async (_colonne: string, id: string) => {
          const ligne = lignes.get(id);
          if (ligne) lignes.set(id, { ...ligne, ...structuredClone(valeurs) });
          return { error: null };
        },
      }),
      insert: async () => ({ error: null }),
      upsert: async (rows: unknown[]) => {
        for (const row of rows as Record<string, unknown>[]) {
          lignes.set(String(row.id), structuredClone(row));
        }
        return { error: null };
      },
    }),
  };
  return {
    obtenir: async () => client,
    /** Ce qu'un autre appareil du compte a fait : poser une pierre tombale. */
    supprimerAilleurs(id: string, at: string) {
      const ligne = lignes.get(id);
      if (ligne) {
        lignes.set(id, { ...ligne, name: '', data: {}, deleted_at: at });
      }
    },
  };
}

function compte(distant = serveur()) {
  const etat = { compte: ALICE as string | null };
  const schemas = createSupabaseSchemas({
    client: distant.obtenir,
    owner: () => etat.compte,
    isOnline: () => true,
    now: () => '2026-11-21T12:00:00.000Z',
  });
  return { schemas, etat, distant };
}

describe('les versions suivent le compte', () => {
  it('chaque compte range les siennes, l’appareil aussi', async () => {
    const { schemas, etat } = compte();
    await schemas.save(version(1));
    await schemas.save(version(2));
    etat.compte = BOB;
    await schemas.save(version(11));
    await schemas.save(version(12));
    etat.compte = null;
    await schemas.save(version(21));
    await schemas.save(version(22));

    expect(noms(versionsOf(ALICE, A))).toEqual(['Version 1']);
    expect(noms(versionsOf(BOB, A))).toEqual(['Version 11']);
    expect(noms(versionsOf(null, A))).toEqual(['Version 21']);
  });

  it('l’effacement d’un compte efface les siennes, pas celles des autres', async () => {
    const { schemas, etat } = compte();
    await schemas.save(version(1));
    await schemas.save(version(2));
    etat.compte = BOB;
    await schemas.save(version(11));
    await schemas.save(version(12));
    etat.compte = null;
    await schemas.save(version(21));
    await schemas.save(version(22));

    forgetAccountSchemas(ALICE);

    expect(versionsOf(ALICE, A)).toEqual([]);
    expect(
      Object.keys(localStorage).filter(k => k.includes(`versions@${ALICE}`))
    ).toEqual([]);
    expect(noms(versionsOf(BOB, A))).toEqual(['Version 11']);
    expect(noms(versionsOf(null, A))).toEqual(['Version 21']);

    // `deleteMyAccount` vide aussi la bibliothèque de l'appareil.
    clearDeviceVersions();
    expect(versionsOf(null, A)).toEqual([]);
    expect(noms(versionsOf(BOB, A))).toEqual(['Version 11']);
  });

  it('« Ajouter à mon compte » emmène les versions avec le schéma', async () => {
    const { schemas, etat } = compte();
    etat.compte = null;
    await schemas.save(version(1));
    await schemas.save(version(2));
    etat.compte = ALICE;

    await expect(schemas.adopt([A])).resolves.toMatchObject({ adopted: 1 });

    expect(versionsOf(null, A)).toEqual([]);
    expect(noms(versionsOf(ALICE, A))).toEqual(['Version 1']);
  });

  it('« hors de votre compte », ouvert puis enregistré : sa version d’avant suit au compte', async () => {
    const { schemas, etat } = compte();
    etat.compte = null;
    await schemas.save(version(1));
    etat.compte = ALICE;

    await schemas.save(version(2));

    expect(noms(versionsOf(ALICE, A))).toEqual(['Version 1']);
  });

  it('supprimé sur un autre appareil, il emporte ses versions d’ici', async () => {
    const { schemas, distant } = compte();
    await schemas.save(version(1));
    await schemas.save(version(2));
    distant.supprimerAilleurs(A, '2026-11-21T11:00:00.000Z');

    await schemas.list();

    expect(versionsOf(ALICE, A)).toEqual([]);
  });

  it('le brouillon rangé au départ de son compte garde la version enregistrée', async () => {
    const { schemas } = compte();
    await schemas.save(version(1));

    parkAccountSchema(ALICE, version(2));

    expect(noms(versionsOf(ALICE, A))).toEqual(['Version 1']);
  });

  it('une ligne du serveur porte le schéma, jamais ses versions', async () => {
    const lignes: unknown[] = [];
    const distant = serveur();
    const { schemas } = compte({
      ...distant,
      obtenir: async () => {
        const client = await distant.obtenir();
        return {
          from: (table: string) => {
            const de = client.from(table);
            return {
              ...de,
              upsert: async (rows: unknown[], options?: unknown) => {
                lignes.push(...rows);
                return de.upsert(rows as never, options as never);
              },
            };
          },
        } as SchemasClient;
      },
    });
    await schemas.save(version(1));
    await schemas.save(version(2));

    expect(lignes).toHaveLength(2);
    expect(JSON.stringify(lignes.at(-1))).not.toContain('Version 1');
    expect(lignes.at(-1)).toMatchObject({ version: TACTIC_VERSION });
  });
});
