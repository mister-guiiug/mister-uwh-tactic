import { describe, expect, it } from 'vitest';
import { createTactic, playerId, type Tactic } from '../board/model.ts';
import {
  applyChanges,
  emptyEffectif,
  identitiesFrom,
  keepChanges,
  keptFrom,
  namedCount,
  type Effectif,
} from './model.ts';

const W1 = playerId('blanc', 1);
const W2 = playerId('blanc', 2);
const W7 = playerId('blanc', 7);
const N1 = playerId('noir', 1);

const schema = () =>
  createTactic({ id: 's', name: '', now: '2026-11-21T00:00:00Z' });

/** Un effectif des Blancs : Paul (1, 12 s), Zoé (2, gauchère), Hugo (7). */
function blancs(): Effectif {
  const effectif = emptyEffectif();
  effectif.blanc[0] = { name: 'Paul', leftHanded: false, apnea: 12 };
  effectif.blanc[1] = { name: '  Zoé ', leftHanded: true };
  effectif.blanc[6] = { name: 'Hugo', leftHanded: false, apnea: 20 };
  return effectif;
}

function nommer(tactic: Tactic, id: string, name: string, apnea?: number) {
  const player = tactic.roster.players.find(p => p.id === id)!;
  player.name = name;
  if (apnea !== undefined) player.apnea = apnea;
}

/**
 * Ce que ces tests figent : UN NUMÉRO SANS PRÉNOM N'EST PAS DANS L'EFFECTIF,
 * dans un sens comme dans l'autre. Appliquer ne touche que les numéros
 * nommés ; garder ne prend que les joueurs nommés et n'efface rien.
 */
describe('mon effectif', () => {
  it('naît vide : dix numéros par équipe, aucun nommé', () => {
    const effectif = emptyEffectif();
    expect(effectif.blanc).toHaveLength(10);
    expect(effectif.noir).toHaveLength(10);
    expect(namedCount(effectif)).toBe(0);
    expect(namedCount(blancs(), 'blanc')).toBe(3);
    expect(namedCount(blancs(), 'noir')).toBe(0);
  });

  it('pose les numéros nommés, et eux seuls, sans espaces autour', () => {
    const identities = identitiesFrom(blancs());
    expect(Object.keys(identities).sort()).toEqual([W1, W2, W7].sort());
    expect(identities[W1]).toEqual({
      name: 'Paul',
      leftHanded: false,
      apnea: 12,
    });
    expect(identities[W2]).toEqual({ name: 'Zoé', leftHanded: true });
    // Un remplaçant n'a pas d'apnée au tableau : la frise ne le compte pas.
    expect(identities[W7]).toEqual({ name: 'Hugo', leftHanded: false });
  });

  it('compte ce qu’il changerait, et plus rien une fois posé', () => {
    const tactic = schema();
    expect(applyChanges(tactic, emptyEffectif())).toBe(0);
    expect(applyChanges(tactic, blancs())).toBe(3);
    for (const [id, identity] of Object.entries(identitiesFrom(blancs()))) {
      Object.assign(
        tactic.roster.players.find(p => p.id === id)!,
        identity
      );
    }
    expect(applyChanges(tactic, blancs())).toBe(0);
  });

  it('garde les joueurs nommés du schéma, sans effacer les autres numéros', () => {
    const tactic = schema();
    nommer(tactic, W1, ' Léa ', 15);
    nommer(tactic, N1, 'Max');
    // Un remplaçant nommé garde son prénom, pas une apnée qui ne compte pas.
    nommer(tactic, W7, 'Inès', 30);

    const kept = keptFrom(tactic, blancs());
    expect(kept.blanc[0]).toEqual({
      name: 'Léa',
      leftHanded: false,
      apnea: 15,
    });
    // Zoé n'a pas de prénom dans le schéma : elle reste dans l'effectif.
    expect(kept.blanc[1]).toEqual({ name: '  Zoé ', leftHanded: true });
    expect(kept.blanc[6]).toEqual({ name: 'Inès', leftHanded: false });
    expect(kept.noir[0]).toEqual({ name: 'Max', leftHanded: false });
    expect(namedCount(kept)).toBe(4);
  });

  it('un schéma sans prénom ne change rien à l’effectif', () => {
    const effectif = blancs();
    expect(keepChanges(schema(), effectif)).toBe(0);
    expect(keptFrom(schema(), effectif)).toEqual(effectif);
  });

  it('compte ce que « Garder » changerait', () => {
    const tactic = schema();
    nommer(tactic, W1, 'Paul', 12);
    expect(keepChanges(tactic, blancs())).toBe(0);
    nommer(tactic, W2, 'Zoé');
    // Zoé est gauchère dans l'effectif, droitière dans le schéma.
    expect(keepChanges(tactic, blancs())).toBe(1);
    nommer(tactic, N1, 'Max');
    expect(keepChanges(tactic, blancs())).toBe(2);
  });
});
