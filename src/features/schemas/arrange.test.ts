import { describe, expect, it } from 'vitest';
import { createTactic, type Tactic } from '../board/model.ts';
import { arrange } from './arrange.ts';

const schema = (name: string, steps = 1): Tactic => {
  const tactic = createTactic({ id: name || 'sans-nom', name });
  tactic.steps = Array.from({ length: steps }, () => tactic.steps[0]!);
  return tactic;
};

const library = [
  schema('Sortie de but', 3),
  schema('Écran défensif', 1),
  schema('', 2),
  schema('attaque côté gauche', 5),
];
const names = (list: Tactic[]) => list.map(s => s.name);

describe('arrange', () => {
  it('garde l’ordre reçu (les plus récents) sans recherche', () => {
    expect(names(arrange(library, '', 'recent', 'fr'))).toEqual(names(library));
  });

  it('cherche sans tenir compte des accents ni de la casse', () => {
    expect(names(arrange(library, 'ECRAN', 'recent', 'fr'))).toEqual([
      'Écran défensif',
    ]);
    expect(names(arrange(library, 'cote', 'recent', 'fr'))).toEqual([
      'attaque côté gauche',
    ]);
  });

  it('trie par nom selon la langue, les sans-nom à la fin', () => {
    expect(names(arrange(library, '', 'name', 'fr'))).toEqual([
      'attaque côté gauche',
      'Écran défensif',
      'Sortie de but',
      '',
    ]);
  });

  it('trie par nombre d’étapes, du plus long au plus court', () => {
    expect(
      arrange(library, '', 'steps', 'fr').map(s => s.steps.length)
    ).toEqual([5, 3, 2, 1]);
  });
});
