import { describe, expect, it } from 'vitest';
import { createTactic, type Tactic } from './model.ts';
import { fromCompact, toCompact } from './share.ts';

/**
 * LES ZONES ET LES MOTS D'UNE VARIANTE VOYAGENT AUSSI (ADR 0026, 0027) : ils
 * sont des ajouts d'étape, et une variante a ses propres étapes. Le lien les
 * écrit par `stepExtrasOf` pour la ligne principale comme pour chaque
 * variante — l'intégration des deux chantiers l'a branché, ce test le tient.
 */
function phase(): Tactic {
  const tactic = createTactic({ id: 't', name: 'Sortie' });
  const first = tactic.steps[0]!;
  const main = structuredClone(first);
  main.zones = [{ shape: 'rect', x: 10, y: 2, w: 4, h: 3, label: 'Couloir' }];
  tactic.steps.push(main);
  const own = structuredClone(first);
  own.words = [{ x: 12, y: 7.5, text: 'Ici' }];
  own.zones = [{ shape: 'ellipse', x: 15, y: 9, w: 3, h: 2 }];
  tactic.variants = [
    { id: 'v1', name: 'Si le 2 monte', from: 0, steps: [own] },
  ];
  return tactic;
}

describe('une variante emporte ses zones et ses mots dans le lien', () => {
  it('aller-retour : principale et variante gardent les leurs', () => {
    const back = fromCompact(toCompact(phase()), {
      id: 'u',
      now: '2026-11-21T00:00:00Z',
    });
    expect(back.steps[1]!.zones).toEqual([
      { shape: 'rect', x: 10, y: 2, w: 4, h: 3, label: 'Couloir' },
    ]);
    const variant = back.variants?.[0];
    expect(variant?.name).toBe('Si le 2 monte');
    expect(variant?.steps[0]!.words).toEqual([{ x: 12, y: 7.5, text: 'Ici' }]);
    expect(variant?.steps[0]!.zones).toEqual([
      { shape: 'ellipse', x: 15, y: 9, w: 3, h: 2 },
    ]);
  });
});
