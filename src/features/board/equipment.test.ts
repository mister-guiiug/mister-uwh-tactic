import { describe, expect, it } from 'vitest';
import {
  FIN,
  finOutline,
  outlinePath,
  STICK,
  stickOutline,
  TEAM_GEAR,
} from './equipment.ts';

const xs = (o: [number, number][]) => o.map(p => p[0]);
const ys = (o: [number, number][]) => o.map(p => p[1]);

describe('l’équipement', () => {
  it('la crosse mesure ce que mesurent les crosses : 260 à 300 mm', () => {
    const outline = stickOutline();
    const length = Math.max(...xs(outline)) - Math.min(...xs(outline));
    expect(length).toBeGreaterThan(0.26);
    expect(length).toBeLessThan(0.3);
    expect(
      outline.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    ).toBe(true);
  });

  it('le crochet tourne vers l’intérieur (les y négatifs), le manche reste droit', () => {
    const outline = stickOutline();
    expect(Math.min(...ys(outline))).toBeLessThan(-0.04);
    // Le long du manche, la crosse garde sa largeur.
    const handle = outline.filter(([x]) => x > 0.01 && x < STICK.handle - 0.01);
    for (const [, y] of handle)
      expect(Math.abs(y)).toBeCloseTo(STICK.width / 2, 3);
  });

  it('la palme fait 50 cm de voilure sur 24 de large, derrière le chausson', () => {
    const outline = finOutline();
    expect(-Math.min(...xs(outline))).toBeCloseTo(FIN.pocket + FIN.length);
    expect(Math.max(...ys(outline)) - Math.min(...ys(outline))).toBeCloseTo(
      FIN.width
    );
    expect(Math.max(...xs(outline))).toBe(0);
  });

  it('le bonnet de l’équipe noire est bleu, sa crosse noire', () => {
    expect(TEAM_GEAR.noir.cap).toBe('#1d4ed8');
    expect(TEAM_GEAR.noir.stick).toBe('#111827');
    expect(TEAM_GEAR.blanc.cap).toBe('#f8fafc');
  });

  it('écrit un chemin SVG fermé, miroir compris', () => {
    const d = outlinePath(
      [
        [0, 0],
        [1, 1],
        [1, 0],
      ],
      -1
    );
    expect(d).toBe('M 0 0 L 1 -1 L 1 0 Z');
  });
});
