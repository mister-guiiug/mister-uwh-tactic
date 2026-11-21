import { describe, expect, it } from 'vitest';
import { createTactic } from '../board/model.ts';
import { coverage, pickedSchemas, toggleAll } from './selection.ts';

/**
 * Ce que ces tests figent : LA SÉLECTION EST UN ENSEMBLE D'IDENTIFIANTS, et
 * « Tout » vaut pour ce que l'écran montre — ni plus, ni moins.
 */

const vide = new Set<string>();

describe('la sélection de la bibliothèque', () => {
  it('« Tout » coche ce qui est montré, puis le décoche', () => {
    const montre = ['a', 'b', 'c'];
    expect(coverage(vide, montre)).toBe('none');
    const partie = new Set(['b']);
    expect(coverage(partie, montre)).toBe('some');
    const tout = toggleAll(partie, montre);
    expect(coverage(tout, montre)).toBe('all');
    expect(coverage(toggleAll(tout, montre), montre)).toBe('none');
    // Sans toucher à l'ensemble d'origine : React compare les références.
    expect([...partie]).toEqual(['b']);
  });

  it('« Tout » sous une recherche garde ce qui est coché hors de vue', () => {
    const coche = new Set(['hors-de-vue']);
    const tout = toggleAll(coche, ['a', 'b']);
    expect([...tout].sort()).toEqual(['a', 'b', 'hors-de-vue']);
    expect([...toggleAll(tout, ['a', 'b'])]).toEqual(['hors-de-vue']);
  });

  it('rien à montrer, rien de coché', () => {
    expect(coverage(new Set(['a']), [])).toBe('none');
  });

  it('rend les schémas cochés dans l’ordre de la liste, sans les disparus', () => {
    const schemas = ['a', 'b', 'c'].map(id =>
      createTactic({ id, name: id.toUpperCase() })
    );
    expect(
      pickedSchemas(schemas, new Set(['c', 'efface', 'a'])).map(s => s.id)
    ).toEqual(['a', 'c']);
  });
});
