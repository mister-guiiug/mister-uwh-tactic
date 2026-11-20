import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Ce que ces tests figent : À LA DÉCONNEXION, LE BROUILLON DU TABLEAU QUITTE
 * L'ÉCRAN SANS RIEN PERDRE (ADR 0015, suivi du 20/11/2026) — c'est le
 * BRANCHEMENT qui est éprouvé ici, la règle l'est dans
 * `features/board/leaveDraft.test.ts`.
 *
 * Supabase a déjà effacé la session quand il émet `SIGNED_OUT` : le backend
 * se souvient du compte qui part, prévient le tableau AVANT de réduire sa
 * copie, et le brouillon rangé comme écriture en attente survit à cette
 * réduction. Le backend est construit POUR DE VRAI en mode distant, comme
 * dans `purge-schemas.test.ts`, avec le vrai magasin du tableau.
 */
const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const A = '0f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';
const T1 = '2026-11-17T08:00:00.000Z';

const session = (id: string) =>
  JSON.stringify({
    access_token: 'entete.charge.signature',
    refresh_token: 'jeton-de-rafraichissement',
    expires_at: 1,
    user: { id },
  });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
  localStorage.clear();
});

async function demarrerEnModeDistant(compte: string) {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://exemple.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'cle-anon-de-test');
  vi.resetModules();
  const { supabase } = await import('./supabase.ts');
  const caseDeSession = supabase.storageKey()!;
  localStorage.setItem(caseDeSession, session(compte));

  const backend = await import('./index.ts');
  expect(backend.coverage.kind).toBe('supabase');
  const local = await import('./local.ts');
  const sync = await import('./supabase-schemas.ts');
  const model = await import('../features/board/model.ts');
  const board = await import('../features/board/store.ts');
  const { followAccountWithDraft } =
    await import('../features/board/leaveDraft.ts');
  const { onAuthEvent } = await import('../auth/index.ts');
  followAccountWithDraft();

  return {
    backend,
    local,
    sync,
    model,
    board,
    brouillon: () => board.boardStore.getState().tactic,
    copie: (owner: string) =>
      local
        .accountSchemasStore(owner)
        .load()
        .schemas.map(t => t.id),
    deconnecter() {
      localStorage.removeItem(caseDeSession);
      onAuthEvent('SIGNED_OUT');
    },
    connecter(owner: string) {
      localStorage.setItem(caseDeSession, session(owner));
      onAuthEvent('SIGNED_IN');
    },
  };
}

describe('le brouillon à la déconnexion', () => {
  it('un travail non parti est rangé, en attente, dans la copie du compte', async () => {
    const t = await demarrerEnModeDistant(ALICE);
    t.board.boardStore
      .getState()
      .load(t.model.createTactic({ id: A, name: '' }));
    t.board.boardStore.getState().setName('Sortie de mur, mardi');
    const travail = t.brouillon();

    t.deconnecter();

    // Gardé par la réduction de la copie : il attend de partir.
    expect(t.copie(ALICE)).toEqual([A]);
    expect(t.local.accountSchemasStore(ALICE).load().schemas[0]).toEqual(
      travail
    );
    expect(t.sync.schemasSyncStore.load().ops).toEqual([
      { owner: ALICE, id: A, kind: 'save', at: expect.any(String) },
    ]);
    // Et l'écran repart à neuf, sur l'appareil aussi.
    expect(t.brouillon().id).not.toBe(A);
    expect(t.brouillon().name).toBe('');
    expect(t.board.draftStore.load().id).toBe(t.brouillon().id);
    // Rien de lui dans la bibliothèque de l'appareil.
    expect(t.local.schemasStore.load().schemas).toEqual([]);
  });

  it('identique à un schéma que le serveur a, il est simplement remplacé', async () => {
    const t = await demarrerEnModeDistant(ALICE);
    const sur = t.model.createTactic({ id: A, name: 'confirmé', now: T1 });
    t.local.accountSchemasStore(ALICE).save({ schemas: [sur] });
    t.sync.schemasRecusStore.save({
      recus: [{ owner: ALICE, id: A, updatedAt: T1 }],
    });
    t.board.boardStore.getState().load(sur);

    t.deconnecter();

    // Le serveur le rendra : la copie se vide, rien n'attend.
    expect(t.local.accountsWithSchemas()).toEqual([]);
    expect(t.sync.schemasSyncStore.load().ops).toEqual([]);
    expect(t.brouillon().id).not.toBe(A);
  });

  it('un compte qui prend la place d’un autre emporte aussi le brouillon', async () => {
    const t = await demarrerEnModeDistant(ALICE);
    // Né à T1, touché maintenant. Le brouillon neuf du démarrage, touché
    // dans la même milliseconde, garderait `updatedAt === createdAt` : il
    // passerait pour vierge, et le test échouait une fois sur trois.
    t.board.boardStore
      .getState()
      .load(t.model.createTactic({ id: A, name: '', now: T1 }));
    t.board.boardStore.getState().setName('À Alice');

    t.connecter(BOB);

    expect(t.copie(ALICE)).toHaveLength(1);
    expect(t.copie(BOB)).toEqual([]);
    expect(t.brouillon().name).toBe('');
  });

  it('un compte effacé ne laisse rien : ni copie, ni brouillon', async () => {
    const t = await demarrerEnModeDistant(ALICE);
    t.board.boardStore.getState().setName('À effacer');

    t.backend.forgetAccount(ALICE);
    t.deconnecter();

    expect(t.local.accountsWithSchemas()).toEqual([]);
    expect(t.sync.schemasSyncStore.load().ops).toEqual([]);
    expect(t.brouillon().name).toBe('');
  });

  it('en mode local, il n’y a pas de compte : le brouillon reste', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.resetModules();
    const backend = await import('./index.ts');
    expect(backend.coverage.kind).not.toBe('supabase');
    const board = await import('../features/board/store.ts');
    const { followAccountWithDraft } =
      await import('../features/board/leaveDraft.ts');
    const { onAuthEvent } = await import('../auth/index.ts');
    followAccountWithDraft();
    board.boardStore.getState().setName('Sur l’appareil');

    onAuthEvent('SIGNED_OUT');

    expect(board.boardStore.getState().tactic.name).toBe('Sur l’appareil');
  });
});
