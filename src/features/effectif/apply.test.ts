import { describe, expect, it } from 'vitest';
import { createBoardStore } from '../board/store.ts';
import { createTactic, playerId } from '../board/model.ts';
import { emptyEffectif, identitiesFrom } from './model.ts';

const W1 = playerId('blanc', 1);
const W2 = playerId('blanc', 2);
const W3 = playerId('blanc', 3);

function board() {
  const tactic = createTactic({
    id: 'exemple',
    name: 'Engagement',
    now: '2026-11-21T00:00:00Z',
  });
  // Un exemple nomme ses joueurs par leur poste.
  tactic.roster.players.find(p => p.id === W1)!.name = 'AG';
  tactic.roster.players.find(p => p.id === W3)!.name = 'AD';
  tactic.roster.players.find(p => p.id === W3)!.apnea = 8;
  return createBoardStore(tactic);
}

function effectif() {
  const e = emptyEffectif();
  e.blanc[0] = { name: 'Paul', leftHanded: false, apnea: 12 };
  e.blanc[1] = { name: 'Zoé', leftHanded: true };
  return e;
}

const player = (s: ReturnType<typeof board>, id: string) =>
  s.getState().tactic.roster.players.find(p => p.id === id)!;

/**
 * Ce que ces tests figent : « APPLIQUER MON EFFECTIF » EST UN GESTE, UN SEUL
 * À DÉFAIRE — prénoms, mains et apnées posés ensemble, rendus ensemble.
 */
describe('appliquer mon effectif au tableau', () => {
  it('pose prénoms, mains et apnées d’un geste, et « Annuler » le rend', () => {
    const s = board();
    const before = s.getState().tactic;
    s.getState().applyIdentities(identitiesFrom(effectif()));

    expect(player(s, W1)).toMatchObject({ name: 'Paul', apnea: 12 });
    expect(player(s, W2)).toMatchObject({ name: 'Zoé', leftHanded: true });
    expect(player(s, W2).apnea).toBeUndefined();
    // Le 3 n'est pas dans l'effectif : il garde son poste et son apnée.
    expect(player(s, W3)).toMatchObject({ name: 'AD', apnea: 8 });
    expect(s.getState().past).toHaveLength(1);

    s.getState().undo();
    expect(s.getState().tactic).toBe(before);
    s.getState().redo();
    expect(player(s, W1).name).toBe('Paul');
  });

  it('un joueur sans apnée dans l’effectif reprend le seuil du schéma', () => {
    const s = board();
    s.getState().setApnea(W2, 30);
    s.getState().applyIdentities(identitiesFrom(effectif()));
    expect(player(s, W2).apnea).toBeUndefined();
  });

  it('rien à changer, rien à défaire', () => {
    const s = board();
    s.getState().applyIdentities(identitiesFrom(effectif()));
    const applied = s.getState().tactic;
    s.getState().applyIdentities(identitiesFrom(effectif()));
    s.getState().applyIdentities(identitiesFrom(emptyEffectif()));
    expect(s.getState().tactic).toBe(applied);
    expect(s.getState().past).toHaveLength(1);
  });
});
