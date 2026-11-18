import { describe, expect, it } from 'vitest';

/**
 * AUCUNE COULEUR EN DUR DANS LE TABLEAU.
 *
 * L'audit UX du 18/11/2026 en avait compté 76 dans les composants du
 * tableau, dont trois nuances du même rouge d'arbitre. Elles vivent
 * désormais dans `design/tokens.ts`, avec un nom ; une valeur hexadécimale
 * ou un `0x…` qui reparaîtrait ici est une teinte de plus que personne ne
 * retrouvera.
 */
const sources = import.meta.glob<string>('../features/board/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const COULEUR =
  /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b(?![-\w])|0x[0-9a-f]{6}\b|rgba?\(/gi;

const fichiers = Object.entries(sources).filter(
  ([chemin]) => !/\.test\.tsx?$|fixtures\.ts$/.test(chemin)
);

describe('features/board : couleurs', () => {
  it('trouve les sources à relire', () => {
    expect(fichiers.length).toBeGreaterThan(10);
  });

  it.each(fichiers)('%s ne contient aucune couleur en dur', (_chemin, code) => {
    const sansCommentaires = code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(sansCommentaires.match(COULEUR) ?? []).toEqual([]);
  });
});
