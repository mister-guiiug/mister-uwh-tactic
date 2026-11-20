import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTactic, type Tactic } from '../features/board/model.ts';

/**
 * Ce que ces tests figent : À LA DÉCONNEXION, LA COPIE DES SCHÉMAS DU COMPTE
 * QUI PART NE GARDE QUE CE QUI N'EST PAS PARTI (ADR 0015).
 *
 * Une tablette de club passe d'un entraîneur à l'autre. La règle elle-même
 * est éprouvée dans `supabase-schemas.test.ts` ; ici, c'est le BRANCHEMENT :
 * l'événement de la session atteint-il la bonne case, alors que Supabase a
 * déjà effacé la session — donc le nom du compte — quand il l'émet ?
 *
 * Le backend est construit POUR DE VRAI en mode distant, comme dans
 * `purge-lecture.test.ts` : variables posées, module réimporté, session
 * rangée sous la case de ce projet AVANT, comme au démarrage.
 */
const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';

const A = '0f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';
const B = '1f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';
const T1 = '2026-11-17T08:00:00.000Z';

const schema = (id: string, name: string): Tactic =>
  createTactic({ id, name, now: T1 });

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
  const { onAuthEvent } = await import('../auth/index.ts');

  /**
   * La copie d'un compte : `A`, que le serveur a confirmé, et `B`, écrit
   * hors ligne, qui attend de partir.
   */
  function garnir(owner: string) {
    local.accountSchemasStore(owner).save({
      schemas: [schema(A, 'confirmé'), schema(B, 'en attente')],
    });
    sync.schemasSyncStore.save({
      ops: [
        ...sync.schemasSyncStore.load().ops,
        { owner, id: B, kind: 'save', at: T1 },
      ],
    });
    sync.schemasRecusStore.save({
      recus: [
        ...sync.schemasRecusStore.load().recus,
        { owner, id: A, updatedAt: T1 },
      ],
    });
  }

  return {
    onAuthEvent,
    local,
    sync,
    garnir,
    copie: (owner: string) =>
      local
        .accountSchemasStore(owner)
        .load()
        .schemas.map(t => t.id),
    /** Comme Supabase : la session quitte le stockage, PUIS l'événement. */
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

describe('la copie des schémas à la déconnexion', () => {
  it('suit SIGNED_OUT : le compte qui part ne garde que ce qui attend', async () => {
    const t = await demarrerEnModeDistant(ALICE);
    t.garnir(ALICE);

    // Le compte reste le même : rien ne bouge.
    t.onAuthEvent('TOKEN_REFRESHED');
    t.onAuthEvent('SIGNED_IN');
    expect(t.copie(ALICE)).toEqual([A, B]);

    t.deconnecter();

    expect(t.copie(ALICE)).toEqual([B]);
    expect(t.sync.schemasSyncStore.load().ops).toEqual([
      { owner: ALICE, id: B, kind: 'save', at: T1 },
    ]);
  });

  it('sans rien en attente, la clé du compte disparaît', async () => {
    const t = await demarrerEnModeDistant(ALICE);
    t.local.accountSchemasStore(ALICE).save({
      schemas: [schema(A, 'confirmé')],
    });
    t.sync.schemasRecusStore.save({
      recus: [{ owner: ALICE, id: A, updatedAt: T1 }],
    });

    t.deconnecter();

    expect(t.local.accountsWithSchemas()).toEqual([]);
    expect(t.sync.schemasRecusStore.load().recus).toEqual([]);
  });

  it('la case d’un autre compte de l’appareil ne bouge pas', async () => {
    const t = await demarrerEnModeDistant(ALICE);
    t.garnir(ALICE);
    t.garnir(BOB);

    t.deconnecter();

    expect(t.copie(ALICE)).toEqual([B]);
    expect(t.copie(BOB)).toEqual([A, B]);
  });

  it('la copie des séances du compte qui part suit la même règle', async () => {
    const t = await demarrerEnModeDistant(ALICE);
    const seances = await import('./supabase-seances.ts');
    const seance = (id: string, name: string) => ({
      id,
      name,
      items: [],
      updatedAt: T1,
    });
    t.local.accountSeancesStore(ALICE).save({
      seances: [seance(A, 'confirmée'), seance(B, 'en attente')],
    });
    seances.seancesSyncStore.save({
      ops: [{ owner: ALICE, id: B, kind: 'save', at: T1 }],
    });
    seances.seancesRecusStore.save({
      recus: [{ owner: ALICE, id: A, updatedAt: T1 }],
    });

    t.deconnecter();

    expect(
      t.local
        .accountSeancesStore(ALICE)
        .load()
        .seances.map(s => s.id)
    ).toEqual([B]);
  });

  it('un compte qui prend la place d’un autre referme celle du précédent', async () => {
    const t = await demarrerEnModeDistant(ALICE);
    t.garnir(ALICE);

    t.connecter(BOB);

    expect(t.copie(ALICE)).toEqual([B]);
  });

  it('ne fait rien en mode local : il n’y a pas de compte', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.resetModules();
    // La session d'une sœur de la famille, sur l'origine partagée : sans
    // case nommée, elle passerait pour un compte d'ici.
    localStorage.setItem('sb-uneautreapp-auth-token', session(ALICE));
    const backend = await import('./index.ts');
    expect(backend.coverage.kind).not.toBe('supabase');
    const local = await import('./local.ts');
    const sync = await import('./supabase-schemas.ts');
    const { onAuthEvent } = await import('../auth/index.ts');
    local.accountSchemasStore(ALICE).save({ schemas: [schema(A, 'A')] });
    sync.schemasRecusStore.save({
      recus: [{ owner: ALICE, id: A, updatedAt: T1 }],
    });

    onAuthEvent('SIGNED_IN');
    localStorage.removeItem('sb-uneautreapp-auth-token');
    onAuthEvent('SIGNED_OUT');

    expect(local.accountsWithSchemas()).toEqual([ALICE]);
  });
});
