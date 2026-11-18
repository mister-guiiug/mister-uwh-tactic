import { describe, expect, it } from 'vitest';
import {
  arcPath,
  GOAL_TRAY,
  GOAL_WIDTH,
  pitchMarkings,
  sectorPath,
  type Marking,
} from './pitch.ts';
import { DEFAULT_PITCH } from './model.ts';

const arcs = (markings: Marking[]) =>
  markings.filter(
    (m): m is Extract<Marking, { kind: 'arc' }> => m.kind === 'arc'
  );

describe('le tracé du terrain', () => {
  const markings = pitchMarkings(DEFAULT_PITCH);

  it('trace à chaque bout une zone de but pleine de 3 m et une zone de pénalité pointillée de 6 m', () => {
    for (const cx of [0, DEFAULT_PITCH.length]) {
      const here = arcs(markings).filter(a => a.cx === cx && a.cy === 7.5);
      expect(here.find(a => a.r === 3)?.style).toBe('solid');
      expect(here.find(a => a.r === 6)?.style).toBe('dotted');
    }
  });

  it('place les points de pénalité au milieu de l’arc de 3 m, et le point central', () => {
    const spots = markings.filter(m => m.kind === 'spot');
    expect(spots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 3, y: 7.5 }),
        expect.objectContaining({ x: 22, y: 7.5 }),
        expect.objectContaining({ x: 12.5, y: 7.5 }),
      ])
    );
  });

  it('centre un but de 3 m sur chaque ligne de but', () => {
    const goals = markings.filter(m => m.kind === 'goal');
    expect(goals).toHaveLength(2);
    for (const goal of goals) {
      expect(goal.y2 - goal.y1).toBe(3);
      expect((goal.y1 + goal.y2) / 2).toBe(7.5);
    }
  });

  it('suit les dimensions du bassin', () => {
    const small = pitchMarkings({ length: 21, width: 12, depth: 2 });
    expect(arcs(small).some(a => a.cx === 21 && a.cy === 6)).toBe(true);
  });

  it('écrit un arc SVG dans le sens horaire', () => {
    expect(arcPath(0, 0, 3, -90, 90)).toBe('M 0 -3 A 3 3 0 0 1 0 3');
  });

  it('un secteur part de son sommet et se referme', () => {
    const d = sectorPath(1, 2, 5, 0, 90);
    expect(d.startsWith('M 1 2 L ')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('dessine le but à la cote du règlement (FFESSM, « Les buts »)', () => {
    // 3 000 mm entre les limites des 3 m, deux pentes de côté de 180 mm.
    expect(GOAL_TRAY.width + 2 * GOAL_TRAY.side).toBeCloseTo(GOAL_TRAY.total);
    // De la paroi au pied de la rampe : la cuvette, puis la rampe.
    expect(GOAL_TRAY.trough + GOAL_TRAY.ramp).toBeCloseTo(GOAL_TRAY.depth);
    // La rampe monte de 20 mm : 180 mm à 11 %.
    expect(GOAL_TRAY.ramp * GOAL_TRAY.slope).toBeCloseTo(GOAL_TRAY.lip, 2);
    expect(GOAL_WIDTH).toBe(GOAL_TRAY.width);
  });
});
