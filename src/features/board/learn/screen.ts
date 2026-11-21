import type { BoardFrame } from '../boardFrame.ts';
import type { Point } from '../model.ts';

/**
 * DE L'ÉCRAN AU TERRAIN, ET RETOUR, pour le calque d'« À toi de jouer »
 * (ADR 0022). Le cadre vient de `boardFrame.ts`, celui que `Board2D`
 * dessine : rien de la géométrie n'est recopié ici, seulement le passage
 * des pixels aux mètres.
 */

/**
 * Où tombe un point du terrain dans une boîte qui a les proportions du
 * cadre, en pourcentage de sa largeur et de sa hauteur : de quoi y poser un
 * élément HTML sans mesurer l'écran.
 */
export function pitchToPercent(
  point: Point,
  frame: BoardFrame
): { left: number; top: number } {
  const view = frame.toView(point);
  return {
    left: ((view.x - frame.x) / frame.w) * 100,
    top: ((view.y - frame.y) / frame.h) * 100,
  };
}

/** Le rectangle d'un élément à l'écran (`getBoundingClientRect`). */
export interface ScreenBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Pixels d'écran par mètre, pour un SVG qui montre `frame` dans `box` : le
 * cadrage par défaut du SVG (`xMidYMid meet`) garde l'échelle et centre.
 */
function pixelsPerMetre(box: ScreenBox, frame: BoardFrame): number {
  if (box.width <= 0 || box.height <= 0) return 0;
  return Math.min(box.width / frame.w, box.height / frame.h);
}

/**
 * UN POINT DE L'ÉCRAN, EN MÈTRES DU TERRAIN. `Board2D` lit `getScreenCTM`,
 * que jsdom ne connaît pas : ce calcul se vérifie sans navigateur, et rend la
 * même chose pour un SVG cadré par défaut. `null` tant que l'élément n'a pas
 * de taille.
 */
export function clientToPitch(
  client: Point,
  box: ScreenBox,
  frame: BoardFrame
): Point | null {
  const scale = pixelsPerMetre(box, frame);
  if (scale <= 0) return null;
  const dx = (box.width - frame.w * scale) / 2;
  const dy = (box.height - frame.h * scale) / 2;
  return frame.toPitch({
    x: frame.x + (client.x - box.left - dx) / scale,
    y: frame.y + (client.y - box.top - dy) / scale,
  });
}
