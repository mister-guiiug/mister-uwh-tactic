import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountLeaving } from '../../backend/index.ts';
import { draftFate, leaveDraft } from './leaveDraft.ts';
import { createTactic, type Tactic } from './model.ts';
import { boardStore, createBoardStore, draftStore } from './store.ts';

/**
 * Ce que ces tests figent : À LA DÉCONNEXION, LE BROUILLON QUITTE L'ÉCRAN
 * SANS RIEN PERDRE (ADR 0015, suivi du 20/11/2026). Ce qu'aucune copie ne
 * tient part dans celle du compte ; le reste est simplement remplacé ; et le
 * tableau neuf ne rend rien du précédent, pas même par « Annuler ».
 */

const T0 = '2026-11-20T08:00:00.000Z';
const T1 = '2026-11-20T09:00:00.000Z';

const schema = (id: string, at = T0): Tactic =>
  createTactic({ id, name: id, now: at });

function depart(
  held: Tactic[] = [],
  erased = false
): AccountLeaving & { kept: Tactic[] } {
  const kept: Tactic[] = [];
  return {
    owner: 'alice',
    erased,
    held,
    keep: tactic => kept.push(tactic),
    kept,
  };
}

/** Un brouillon touché à `at` : son nom change, sa date suit. */
const retouche = (tactic: Tactic, at = T1): Tactic => ({
  ...tactic,
  name: `${tactic.name} revu`,
  updatedAt: at,
});

beforeEach(() => localStorage.clear());

describe('ce que devient le brouillon', () => {
  it('vierge, il est remplacé', () => {
    expect(draftFate(schema('vierge'), depart())).toBe('drop');
  });

  it('identique à un schéma que l’appareil tient pour ce compte, il est remplacé', () => {
    const sur = schema('sur-le-serveur');
    expect(draftFate(retouche(sur), depart([retouche(sur)]))).toBe('drop');
  });

  it('modifié depuis son enregistrement, il est gardé', () => {
    const enregistre = schema('enregistre');
    expect(draftFate(retouche(enregistre), depart([enregistre]))).toBe('keep');
  });

  it('neuf et touché, il est gardé', () => {
    expect(draftFate(retouche(schema('neuf')), depart())).toBe('keep');
  });

  it('un compte effacé ne garde rien', () => {
    expect(draftFate(retouche(schema('neuf')), depart([], true))).toBe('drop');
  });
});

describe('le brouillon quitte l’écran avec son compte', () => {
  it('gardé, il part dans la copie du compte ; le tableau repart à neuf', () => {
    const store = createBoardStore(schema('travail'));
    store.getState().setName('Sortie de mur, version mardi');
    const travail = store.getState().tactic;
    const leaving = depart();

    leaveDraft(leaving, store);

    expect(leaving.kept).toEqual([travail]);
    const neuf = store.getState().tactic;
    expect(neuf.id).not.toBe(travail.id);
    expect(neuf.name).toBe('');
    expect(neuf.updatedAt).toBe(neuf.createdAt);
  });

  it('remplacé, il ne range rien', () => {
    const store = createBoardStore(schema('vierge'));
    const leaving = depart();
    leaveDraft(leaving, store);
    expect(leaving.kept).toEqual([]);
    expect(store.getState().tactic.id).not.toBe('vierge');
  });

  it('« Annuler » ne rend pas le travail du compte parti', () => {
    const store = createBoardStore(schema('travail'));
    store.getState().setName('À ne pas revoir');
    leaveDraft(depart(), store);
    const neuf = store.getState().tactic;

    expect(store.getState().past).toEqual([]);
    store.getState().undo();
    expect(store.getState().tactic).toEqual(neuf);
  });

  it('le tableau neuf est écrit tout de suite sur l’appareil', () => {
    vi.useFakeTimers();
    try {
      boardStore.getState().load(schema('travail'));
      boardStore.getState().setName('En cours');
      leaveDraft(depart());
      // Sans attendre l'écriture différée du tableau : un onglet fermé dans
      // la foulée ne rouvre pas l'ancien brouillon.
      expect(draftStore.load().id).toBe(boardStore.getState().tactic.id);
      expect(draftStore.load().name).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });
});
