import { describe, expect, it } from 'vitest';
import { createTactic, type Tactic } from '../board/model.ts';
import { arrange, copyNameFor, tagsIn } from './arrange.ts';

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

/**
 * LE FILTRE PAR ÉTIQUETTE (ADR 0029) : une étiquette à la fois, en plus de
 * la recherche et du tri ; et la rangée de puces, faite des étiquettes que
 * la bibliothèque porte vraiment.
 */
describe('les étiquettes', () => {
  const tagged = (name: string, steps: number, tags?: string[]): Tactic => ({
    ...schema(name, steps),
    ...(tags ? { tags } : {}),
  });
  const shelf = [
    tagged('Sortie de mur', 3, ['attack', 'wall', 'Cadets']),
    tagged('Défense qui coulisse', 4, ['defense']),
    tagged('Relais sur le mur', 2, ['drill', 'wall', 'cadets']),
    tagged('Pressing haut', 5),
  ];

  it('ne garde que les schémas qui portent l’étiquette', () => {
    expect(names(arrange(shelf, '', 'recent', 'fr', 'wall'))).toEqual([
      'Sortie de mur',
      'Relais sur le mur',
    ]);
    // Une libre, à la casse près.
    expect(names(arrange(shelf, '', 'recent', 'fr', 'CADETS'))).toEqual([
      'Sortie de mur',
      'Relais sur le mur',
    ]);
    expect(names(arrange(shelf, '', 'recent', 'fr', null))).toEqual(
      names(shelf)
    );
  });

  it('se combine à la recherche et au tri', () => {
    expect(names(arrange(shelf, 'relais', 'recent', 'fr', 'wall'))).toEqual([
      'Relais sur le mur',
    ]);
    expect(names(arrange(shelf, '', 'name', 'fr', 'wall'))).toEqual([
      'Relais sur le mur',
      'Sortie de mur',
    ]);
    expect(names(arrange(shelf, 'pressing', 'recent', 'fr', 'wall'))).toEqual(
      []
    );
  });

  it('une puce par étiquette présente : les proposées dans leur ordre, puis les libres', () => {
    expect(tagsIn(shelf, 'fr')).toEqual([
      'attack',
      'defense',
      'wall',
      'drill',
      'Cadets',
    ]);
    expect(tagsIn([tagged('Seul', 1)], 'fr')).toEqual([]);
    expect(
      tagsIn(
        [tagged('a', 1, ['Zèbre', 'élan', 'ATTACK']), tagged('b', 1, ['Abri'])],
        'fr'
      )
    ).toEqual(['attack', 'Abri', 'élan', 'Zèbre']);
  });
});

describe('le nom d’une copie', () => {
  const label = (n?: number) => (n === undefined ? '(copie)' : `(copie ${n})`);

  it('ajoute « (copie) », puis numérote au lieu d’empiler', () => {
    expect(copyNameFor('Contre', [], label)).toBe('Contre (copie)');
    expect(copyNameFor('Contre', ['Contre (copie)'], label)).toBe(
      'Contre (copie 2)'
    );
    expect(
      copyNameFor(
        'Contre (copie)',
        ['Contre (copie)', 'Contre (copie 2)'],
        label
      )
    ).toBe('Contre (copie 3)');
    expect(copyNameFor('Contre (copie 2)', ['Contre (copie)'], label)).toBe(
      'Contre (copie 2)'
    );
  });
});
