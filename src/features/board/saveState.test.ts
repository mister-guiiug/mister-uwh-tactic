import { describe, expect, it } from 'vitest';
import { createTactic } from './model.ts';
import { saveStateOf, worthKeeping } from './saveState.ts';

const base = createTactic({ id: 'a', name: '', now: '2026-11-18T10:00:00Z' });
const edited = { ...base, updatedAt: '2026-11-18T10:05:00Z' };

describe('saveStateOf', () => {
  it('ne sait rien tant que la bibliothèque n’est pas lue', () => {
    expect(saveStateOf(base, null)).toBe('unknown');
  });

  it('dit « brouillon » d’un schéma absent de la bibliothèque', () => {
    expect(saveStateOf(base, [])).toBe('draft');
  });

  it('compare les dates : même version, ou modifié depuis', () => {
    expect(saveStateOf(base, [base])).toBe('saved');
    expect(saveStateOf(edited, [base])).toBe('dirty');
  });
});

describe('worthKeeping', () => {
  it('ne demande rien pour un tableau vierge', () => {
    expect(worthKeeping('draft', base)).toBe(false);
    expect(worthKeeping('saved', edited)).toBe(false);
  });

  it('demande pour un brouillon touché ou une version modifiée', () => {
    expect(worthKeeping('draft', edited)).toBe(true);
    expect(worthKeeping('dirty', edited)).toBe(true);
  });
});
