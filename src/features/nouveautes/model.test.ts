import { describe, expect, it } from 'vitest';
import { LOT, usedBefore, verdict } from './model.ts';
import { NEWS, newsFor } from './news.ts';

const neuf = { createdAt: '2026-11-23T10:00', updatedAt: '2026-11-23T10:00' };

/**
 * Ce que ces tests figent : LA CARTE EST POUR QUI REVIENT, UNE FOIS PAR LOT.
 * Le nouveau venu n'a rien à retrouver ; l'habitué la voit jusqu'à la
 * fermer, puis plus avant le lot suivant (ADR 0039).
 */
describe('« Quoi de neuf » : qui la voit', () => {
  it('un lot déjà réglé ne revient pas', () => {
    expect(verdict(LOT, LOT, true)).toBe('settled');
    expect(verdict(LOT, LOT, false)).toBe('settled');
  });

  it('revient au lot suivant, traces ou non', () => {
    expect(verdict('2027-02', LOT, false)).toBe('show');
    expect(verdict('2027-02', LOT, true)).toBe('show');
  });

  it('se montre à l’appareil qui a déjà servi, sans lot réglé', () => {
    expect(verdict(LOT, null, true)).toBe('show');
  });

  it('ne se montre pas au nouveau venu', () => {
    expect(verdict(LOT, null, false)).toBe('newcomer');
  });
});

describe('« Quoi de neuf » : les traces d’un usage', () => {
  it.each([
    ['schemas'],
    ['schemas@0b9c1d3e-0000-4000-8000-000000000001'],
    ['schemas-versions'],
    ['seances'],
    ['notes'],
    ['effectif'],
    ['match'],
    ['bassin'],
    [':premiers-pas'],
    [':guide-simple'],
    [':eco'],
  ])('« %s » en est une', key => {
    expect(usedBefore([key], neuf)).toBe(true);
  });

  it.each([
    // Un toucher sur la carte d'accueil — et toute la suite e2e le pose.
    [':mode'],
    // Écrit tout seul par le mode simple à la première ouverture.
    ['tableau'],
    // Le lot réglé lui-même, et ce qui n'est pas un geste.
    ['nouveautes'],
    [':usage-compte'],
  ])('« %s » n’en est pas une', key => {
    expect(usedBefore([key], neuf)).toBe(false);
  });

  it('un brouillon touché depuis sa création en est une', () => {
    expect(usedBefore([], { ...neuf, updatedAt: '2026-11-23T10:05' })).toBe(
      true
    );
  });
});

describe('« Quoi de neuf » : ce que montre la carte', () => {
  it('cinq nouveautés au plus, chacune avec son écran', () => {
    expect(NEWS.length).toBeLessThanOrEqual(5);
    for (const news of NEWS) expect(news.to).toMatch(/^\//);
  });

  it('le mode simple ne voit pas ce qu’il ne sait pas faire', () => {
    expect(newsFor(false).map(n => n.id)).toContain('variants');
    expect(newsFor(true).map(n => n.id)).not.toContain('variants');
    expect(newsFor(true).length).toBeGreaterThanOrEqual(4);
  });
});
