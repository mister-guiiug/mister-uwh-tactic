import { describe, expect, it } from 'vitest';
import { FORMATIONS, formationLines, formationSlots } from './formations.ts';
import { DEFAULT_PITCH, playerId } from './model.ts';

describe('les compositions', () => {
  it('chaque composition place exactement six joueurs', () => {
    for (const formation of FORMATIONS) {
      expect(formationLines(formation).reduce((a, b) => a + b, 0)).toBe(6);
      expect(formationSlots(formation, 'blanc', DEFAULT_PITCH)).toHaveLength(6);
    }
  });

  it('se lit d’avant en arrière : en 3-2-1, trois devant, un derrière', () => {
    const slots = formationSlots('3-2-1', 'blanc', DEFAULT_PITCH);
    const xs = [...new Set(slots.map(s => s.pose.x))];
    expect(xs).toHaveLength(3);
    // Les Blancs attaquent vers les x croissants : l'avant a le plus grand x.
    expect(slots.filter(s => s.pose.x === Math.max(...xs))).toHaveLength(3);
    expect(slots.filter(s => s.pose.x === Math.min(...xs))).toHaveLength(1);
    expect(slots.map(s => s.line)).toEqual([
      'front',
      'front',
      'front',
      'middle',
      'middle',
      'back',
    ]);
  });

  it('reste dans la moitié de l’équipe, devant sa zone de but', () => {
    for (const formation of FORMATIONS) {
      for (const slot of formationSlots(formation, 'blanc', DEFAULT_PITCH)) {
        expect(slot.pose.x).toBeGreaterThan(3);
        expect(slot.pose.x).toBeLessThan(DEFAULT_PITCH.length / 2);
      }
      for (const slot of formationSlots(formation, 'noir', DEFAULT_PITCH)) {
        expect(slot.pose.x).toBeGreaterThan(DEFAULT_PITCH.length / 2);
        expect(slot.pose.x).toBeLessThan(DEFAULT_PITCH.length - 3);
      }
    }
  });

  it('les Noirs sont le miroir des Blancs, tête vers l’autre but', () => {
    const white = formationSlots('2-3-1', 'blanc', DEFAULT_PITCH);
    const black = formationSlots('2-3-1', 'noir', DEFAULT_PITCH);
    white.forEach((w, i) => {
      const b = black[i]!;
      expect(b.pose.x).toBeCloseTo(DEFAULT_PITCH.length - w.pose.x);
      expect(b.pose.y).toBeCloseTo(DEFAULT_PITCH.width - w.pose.y);
      expect(w.pose.angle).toBe(0);
      expect(b.pose.angle).toBe(180);
      // La gauche d'un joueur est la même place, vue de son côté.
      expect(b.side).toBe(w.side);
    });
  });

  it('la gauche d’un Blanc est du côté des y faibles', () => {
    const [left, centre, right] = formationSlots(
      '3-2-1',
      'blanc',
      DEFAULT_PITCH
    );
    expect(left!.side).toBe('left');
    expect(centre!.side).toBe('centre');
    expect(right!.side).toBe('right');
    expect(left!.pose.y).toBeLessThan(right!.pose.y);
  });

  it('numérote d’avant en arrière et garde la profondeur de chacun', () => {
    const slots = formationSlots('1-2-3', 'noir', DEFAULT_PITCH, id =>
      id === playerId('noir', 6) ? false : undefined
    );
    expect(slots.map(s => s.id)).toEqual(
      [1, 2, 3, 4, 5, 6].map(n => playerId('noir', n))
    );
    expect(slots[5]!.pose.surface).toBe(false);
    expect(slots[0]!.pose.surface).toBeUndefined();
  });
});
