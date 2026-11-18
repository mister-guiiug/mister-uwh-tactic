import { describe, expect, it } from 'vitest';
import { TERM_GROUPS, TERMS } from './terms.ts';

describe('le lexique', () => {
  it('a des identifiants uniques et chaque famille remplie', () => {
    expect(new Set(TERMS.map(t => t.id)).size).toBe(TERMS.length);
    for (const group of TERM_GROUPS) {
      expect(TERMS.some(t => t.group === group)).toBe(true);
    }
  });

  it.each(TERMS)(
    '$id : un terme et une définition dans chaque langue',
    term => {
      for (const lang of ['fr', 'en'] as const) {
        expect(term[lang].term.trim()).not.toBe('');
        expect(term[lang].definition.trim().length).toBeGreaterThan(20);
        // Une phrase complète, et courte : on lit une ligne, pas une page.
        expect(term[lang].definition).toMatch(/[.!?]$/);
        expect(term[lang].definition.length).toBeLessThan(220);
      }
    }
  );
});
