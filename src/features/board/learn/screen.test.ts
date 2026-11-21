import { describe, expect, it } from 'vitest';
import { boardFrame, MARGIN } from '../boardFrame.ts';
import { DEFAULT_PITCH, type Point } from '../model.ts';
import { clientToPitch, pitchToPercent } from './screen.ts';

const pitch = DEFAULT_PITCH; // 25 × 15 m
const near = (actual: Point | null, expected: Point) => {
  expect(actual).not.toBeNull();
  expect(actual!.x).toBeCloseTo(expected.x, 6);
  expect(actual!.y).toBeCloseTo(expected.y, 6);
};

/**
 * Ce que ces tests figent : UN POINT DE L'ÉCRAN TOMBE AU BON ENDROIT DU
 * TERRAIN, couché comme dressé, et un point du terrain au bon endroit du
 * calque. Sans eux, le jeton d'« À toi de jouer » sauterait sous le doigt.
 */
describe('de l’écran au terrain', () => {
  // Dix pixels par mètre, la boîte décalée dans la page.
  const landscape = { left: 10, top: 20, width: 298, height: 198 };
  const portrait = { left: 10, top: 20, width: 198, height: 298 };

  it('couché : le coin du terrain, son centre, la plage', () => {
    const frame = boardFrame(pitch, false);
    near(clientToPitch({ x: 34, y: 44 }, landscape, frame), { x: 0, y: 0 });
    near(clientToPitch({ x: 159, y: 119 }, landscape, frame), {
      x: 12.5,
      y: 7.5,
    });
    // Le coin haut-gauche de l'image : la plage, hors du bassin.
    near(clientToPitch({ x: 10, y: 20 }, landscape, frame), {
      x: -MARGIN,
      y: -MARGIN,
    });
  });

  it('dressé : la droite de l’écran traverse le terrain', () => {
    const frame = boardFrame(pitch, true);
    // Le coin (0, 0) du terrain est en haut à DROITE.
    near(clientToPitch({ x: 184, y: 44 }, portrait, frame), { x: 0, y: 0 });
    // Le centre reste le centre.
    near(clientToPitch({ x: 109, y: 169 }, portrait, frame), {
      x: 12.5,
      y: 7.5,
    });
    // Descendre l'écran, c'est avancer vers le but des Noirs.
    near(clientToPitch({ x: 184, y: 294 }, portrait, frame), { x: 25, y: 0 });
  });

  it('une boîte plus large que le terrain le centre, à l’échelle', () => {
    const frame = boardFrame(pitch, false);
    const wide = { left: 0, top: 0, width: 400, height: 198 };
    // 10 px/m, et 51 px de bande de chaque côté.
    near(clientToPitch({ x: 51 + 24, y: 24 }, wide, frame), { x: 0, y: 0 });
  });

  it('rien tant que la boîte n’a pas de taille', () => {
    const frame = boardFrame(pitch, false);
    const empty = { left: 0, top: 0, width: 0, height: 0 };
    expect(clientToPitch({ x: 5, y: 5 }, empty, frame)).toBeNull();
  });

  it('un point du terrain en pourcentage de la boîte', () => {
    const center = { x: 12.5, y: 7.5 };
    for (const portraitMode of [false, true]) {
      const at = pitchToPercent(center, boardFrame(pitch, portraitMode));
      expect(at.left).toBeCloseTo(50);
      expect(at.top).toBeCloseTo(50);
    }
    // Dressé, le but des Blancs est en haut de la boîte.
    const goal = pitchToPercent({ x: 0, y: 7.5 }, boardFrame(pitch, true));
    expect(goal.left).toBeCloseTo(50);
    expect(goal.top).toBeCloseTo((MARGIN / (25 + 2 * MARGIN)) * 100);
  });
});
