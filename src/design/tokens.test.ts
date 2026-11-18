import { describe, expect, it } from 'vitest';
import brut from '../index.css?raw';
import { CSS_VARS } from './tokens.ts';

/**
 * LA FEUILLE ET LA TABLE DISENT LA MÊME CHOSE.
 *
 * Les couleurs qui suivent le thème vivent en variables CSS (le SVG les lit,
 * le thème sombre les repeint) ; `tokens.ts` en garde la valeur claire pour
 * qui ne lit pas le CSS. Deux endroits, donc un test : sans lui, la première
 * retouche de l'un laisserait l'autre en arrière, et rien ne le dirait.
 */
const feuille = brut.replace(/\/\*[\s\S]*?\*\//g, '');

function racine(): Map<string, string> {
  const table = new Map<string, string>();
  for (const [, sel, corps] of feuille.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (sel!.split(';').pop()!.trim() !== ':root') continue;
    for (const [, nom, valeur] of corps!.matchAll(
      /(--[a-z0-9-]+)\s*:\s*([^;]+);/g
    )) {
      table.set(nom!, valeur!.trim());
    }
  }
  return table;
}

describe('design/tokens', () => {
  const declare = racine();
  it.each(Object.entries(CSS_VARS))('%s vaut %s dans index.css', (nom, val) => {
    expect(declare.get(nom)?.toLowerCase()).toBe(val.toLowerCase());
  });
});
