import { describe, expect, it } from 'vitest';
import { LOCALES } from '../../i18n/index.ts';
import { TERM_GROUPS, TERMS } from './terms.ts';

describe('le lexique', () => {
  it('a des identifiants uniques et chaque famille remplie', () => {
    expect(new Set(TERMS.map(t => t.id)).size).toBe(TERMS.length);
    for (const group of TERM_GROUPS) {
      expect(TERMS.some(t => t.group === group)).toBe(true);
    }
  });

  // CHAQUE LANGUE DE L'APPLICATION, pas une liste écrite ici : la liste
  // « fr et en » figeait l'état de 2026, pas le contrat (ADR 0024).
  it.each(TERMS)(
    '$id : un terme et une définition dans chaque langue',
    term => {
      for (const lang of LOCALES) {
        expect(term[lang].term.trim()).not.toBe('');
        expect(term[lang].definition.trim().length).toBeGreaterThan(20);
        // Une phrase complète, et courte : on lit une ligne, pas une page.
        expect(term[lang].definition).toMatch(/[.!?]$/);
        expect(term[lang].definition.length).toBeLessThan(220);
      }
    }
  );
});
