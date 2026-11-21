import { describe, expect, it } from 'vitest';
import { boardFrame, MARGIN } from './boardFrame.ts';
import { DEFAULT_PITCH, type Point } from './model.ts';

const pitch = DEFAULT_PITCH; // 25 × 15 m
const near = (actual: Point | null, expected: Point) => {
  expect(actual).not.toBeNull();
  expect(actual!.x).toBeCloseTo(expected.x, 6);
  expect(actual!.y).toBeCloseTo(expected.y, 6);
};

/**
 * Ce que ces tests figent : LE CADRE QUE `Board2D` DESSINE, couché comme
 * dressé, et ses deux passages du terrain à la boîte de vue — ceux
 * qu'« À toi de jouer » relit pour poser le jeton sous le doigt.
 */
describe('le cadre du tableau', () => {
  it('couché : le terrain en long, la marge autour', () => {
    const frame = boardFrame(pitch, false);
    expect(frame).toMatchObject({
      x: -MARGIN,
      y: -MARGIN,
      w: 25 + 2 * MARGIN,
      h: 15 + 2 * MARGIN,
      transform: undefined,
    });
  });

  it('dressé : un quart de tour, le but des Blancs en haut', () => {
    const frame = boardFrame(pitch, true);
    expect(frame.w).toBeCloseTo(15 + 2 * MARGIN);
    expect(frame.h).toBeCloseTo(25 + 2 * MARGIN);
    expect(frame.transform).toBe('translate(15 0) rotate(90)');
    // Le but des Blancs (x = 0) est en haut, celui des Noirs en bas.
    expect(frame.toView({ x: 0, y: 7.5 })).toEqual({ x: 7.5, y: 0 });
    expect(frame.toView({ x: 25, y: 7.5 })).toEqual({ x: 7.5, y: 25 });
  });

  it('`toView` fait ce que fait `transform`, et `toPitch` le défait', () => {
    // rotate(90) : (x, y) → (−y, x) ; puis translate(15 0).
    const svg = (p: Point) => ({ x: 15 - p.y, y: p.x });
    for (const portrait of [false, true]) {
      const frame = boardFrame(pitch, portrait);
      for (const p of [
        { x: 0, y: 0 },
        { x: 12.5, y: 7.5 },
        { x: -1, y: 16 },
        { x: 25, y: 3.2 },
      ]) {
        if (portrait) expect(frame.toView(p)).toEqual(svg(p));
        near(frame.toPitch(frame.toView(p)), p);
      }
    }
  });
});
