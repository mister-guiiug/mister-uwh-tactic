import { describe, expect, it } from 'vitest';
import { videoLayout } from './layout.ts';

/** Le terrain par défaut : 25 × 15 m et la marge du tableau (Board2D). */
const RATIO = (15 + 4.8) / (25 + 4.8);

describe('la mise en page d’une image du clip', () => {
  it('donne au terrain toute la hauteur, et la colonne de droite aux consignes', () => {
    const { board, note, titleY } = videoLayout(1280, 720, RATIO, true);
    expect(board.y).toBeGreaterThan(titleY);
    expect(board.y + board.h).toBeLessThanOrEqual(720);
    expect(board.h / board.w).toBeCloseTo(RATIO, 2);
    expect(note).not.toBeNull();
    expect(note!.x).toBeGreaterThan(board.x + board.w);
    expect(note!.x + note!.w).toBeLessThanOrEqual(1280);
    expect(note!.w).toBeGreaterThanOrEqual(260);
  });

  it('sans consigne, centre le terrain', () => {
    const { board, note } = videoLayout(1280, 720, RATIO, false);
    expect(note).toBeNull();
    // Au pixel près : la largeur restante est impaire.
    expect(Math.abs(board.x - (1280 - board.x - board.w))).toBeLessThanOrEqual(
      1
    );
  });

  it('un terrain plus carré cède sa largeur aux consignes', () => {
    const { board, note } = videoLayout(1280, 720, 0.9, true);
    expect(note!.w).toBeGreaterThanOrEqual(260);
    expect(board.h / board.w).toBeCloseTo(0.9, 2);
  });
});
